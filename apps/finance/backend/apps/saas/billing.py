"""SaaS billing — payment-gateway order creation + webhook handling.

Gateway-agnostic core with Razorpay as the first provider. The security-critical
piece — verifying a webhook genuinely came from the gateway — uses stdlib
HMAC-SHA256 (Razorpay's documented scheme), so it needs no SDK and is fully
unit-testable without live credentials.

Flow:
  1. Frontend "Subscribe" -> POST /saas/billing/order/ -> create a gateway order
     for the plan price, return {order_id, key_id, amount} for checkout.
  2. Customer pays in the gateway's checkout widget.
  3. Gateway POSTs /saas/billing/webhook/ -> verify signature -> mark the
     Subscription ACTIVE with a fresh period (and entitlements active).

Config (env): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
When unset, order creation returns 503 (rest of the app still runs) but
signature verification + the webhook state machine remain testable.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import date, timedelta

from django.utils import timezone

from django.conf import settings
from rest_framework import status
from .models import ProductCode
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


def verify_webhook_signature(body: bytes, signature: str, secret: str) -> bool:
    """Constant-time check that `signature` == HMAC-SHA256(body, secret).

    This is exactly Razorpay's webhook verification scheme. Pure stdlib.
    """
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def _fy_label(d: date) -> str:
    """Indian fiscal year label for a date, e.g. 2026-27."""
    start = d.year if d.month >= 4 else d.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


# Home state for the SaaS vendor (place of supply comparison). Maharashtra (27)
# by default; override via settings.SAAS_VENDOR_STATE_CODE.
def _vendor_state() -> str:
    from django.conf import settings
    return getattr(settings, "SAAS_VENDOR_STATE_CODE", "27")


def generate_gst_invoice(subscription, *, period_start: date, period_end: date,
                         gross_amount, customer_gstin: str = "", place_of_supply: str = ""):
    """Create a GST-compliant SaaS invoice (idempotent per subscription+period).

    SaaS is a service under SAC 9983 at 18% GST. `gross_amount` is treated as
    GST-inclusive; we back out the taxable value and split the tax into CGST+SGST
    (intra-state) or IGST (inter-state) based on place of supply vs vendor state.
    """
    from decimal import Decimal, ROUND_HALF_UP
    from .models import SaasInvoice

    existing = SaasInvoice.objects.filter(
        subscription=subscription, period_start=period_start, period_end=period_end
    ).first()
    if existing:
        return existing

    rate = Decimal("18")
    gross = Decimal(str(gross_amount))
    from .pricing import split_gst_inclusive

    taxable, tax, cgst, sgst, igst = split_gst_inclusive(
        gross, place_of_supply=place_of_supply, vendor_state=_vendor_state(),
    )

    # Sequential number within the fiscal year.
    fy = _fy_label(period_end)
    seq = SaasInvoice.objects.filter(number__contains=f"/{fy}/").count() + 1
    number = f"SAAS/{fy}/{seq:06d}"

    return SaasInvoice.objects.create(
        subscription=subscription,
        number=number,
        period_start=period_start,
        period_end=period_end,
        amount=gross,
        taxable_amount=taxable,
        cgst=cgst, sgst=sgst, igst=igst, tax_rate=rate,
        sac_code="9983",
        place_of_supply=place_of_supply,
        customer_gstin=customer_gstin,
        due_date=period_start,
        status=SaasInvoice.Status.PAID,  # generated on successful payment
        paid_at=None,
    )


def activate_subscription_for_tenant(
    schema_name: str,
    *,
    period_days: int = 30,
    notes: dict | None = None,
) -> bool:
    """Mark a tenant's subscription ACTIVE with a fresh paid period + entitlements.

    Idempotent. Returns True if a subscription was found and updated.
    """
    from .models import Subscription, SubscriptionEntitlement
    from .hr_sync import sync_hr_subscription

    sub = (
        Subscription.objects.select_related("tenant", "plan")
        .filter(tenant__schema_name=schema_name)
        .first()
    )
    if not sub:
        logger.warning("activate_subscription: no subscription for schema %s", schema_name)
        return False

    today = date.today()
    sub.status = Subscription.Status.ACTIVE
    sub.current_period_start = today
    sub.current_period_end = today + timedelta(days=period_days)
    sub.trial_ends_at = None
    sub.save(update_fields=[
        "status", "current_period_start", "current_period_end",
        "trial_ends_at", "updated_at",
    ])
    sub.entitlements.update(status=SubscriptionEntitlement.Status.ACTIVE)

    # Issue a GST-compliant SaaS invoice for the paid period (idempotent).
    invoice = None
    try:
        from decimal import Decimal
        from .pricing import with_gst

        gross = None
        if notes:
            raw_gross = notes.get("gross_inr")
            if raw_gross not in (None, ""):
                gross = Decimal(str(raw_gross))
        if gross is None or gross <= 0:
            ex = sub.plan.monthly_price if period_days <= 31 else sub.plan.annual_price
            if ex and float(ex) > 0:
                gross = with_gst(Decimal(str(ex)))
        if gross and gross > 0:
            # Place of supply / GSTIN come from the tenant's FIN company if set.
            pos, gstin = _tenant_gst_info(schema_name)
            invoice = generate_gst_invoice(
                sub, period_start=sub.current_period_start, period_end=sub.current_period_end,
                gross_amount=gross, customer_gstin=gstin, place_of_supply=pos,
            )
            pay_id = (notes or {}).get("razorpay_payment_id") or (notes or {}).get("payment_id")
            if invoice and pay_id:
                invoice.razorpay_payment_id = str(pay_id)
                invoice.paid_at = timezone.now()
                invoice.save(update_fields=["razorpay_payment_id", "paid_at"])
    except Exception:  # noqa: BLE001 — invoicing must not fail activation
        logger.exception("SaaS invoice generation failed for %s", schema_name)

    if invoice:
        try:
            from .invoice_email import send_subscription_invoice_email
            send_subscription_invoice_email(invoice)
        except Exception:  # noqa: BLE001 — email must not fail activation
            logger.exception("SaaS invoice email failed for %s", schema_name)

    plan_code = notes.get("plan") or sub.plan.code
    max_emp = notes.get("max_employees") or notes.get("employees")
    try:
        max_emp_int = int(max_emp) if max_emp is not None else None
    except (TypeError, ValueError):
        max_emp_int = None
    sync_hr_subscription(
        schema_name,
        plan_code=plan_code,
        max_employees=max_emp_int,
        subscription_id=str(sub.id),
        status="active",
    )

    logger.info("activate_subscription: %s ACTIVE until %s", schema_name, sub.current_period_end)
    return True


def _tenant_gst_info(schema_name: str) -> tuple[str, str]:
    """Best-effort place-of-supply (state code) + GSTIN from the tenant company."""
    try:
        from django_tenants.utils import schema_context
        from apps.masters.models import Company

        with schema_context(schema_name):
            c = Company.objects.first()
            if c:
                return (c.state_code or "", c.gstin or "")
    except Exception:  # noqa: BLE001
        pass
    return ("", "")


class CreateOrderView(APIView):
    """POST /api/v1/saas/billing/order/ -> create a gateway order for a plan.

    Returns the order so the SPA can open the gateway checkout. Requires a
    configured gateway; otherwise 503 (feature unavailable) — never 500.
    """

    permission_classes = [IsAuthenticated]
    throttle_scope = "billing"

    def post(self, request):
        plan_code = request.data.get("plan_id")
        billing_cycle = request.data.get("cycle", "monthly")
        coupon_code = (request.data.get("coupon_code") or "").strip()
        employees_raw = request.data.get("employees")
        try:
            employees = int(employees_raw) if employees_raw is not None else None
        except (TypeError, ValueError):
            employees = None

        from .models import Plan
        from .pricing import (
            INCLUDED_EMPLOYEES,
            annual_from_monthly,
            gst_on_excluding,
            plan_monthly_inr,
            with_gst,
        )

        plan = Plan.objects.filter(code=plan_code, is_active=True).first()
        if not plan:
            return Response({"detail": "Unknown plan."}, status=status.HTTP_400_BAD_REQUEST)

        headcount = employees or INCLUDED_EMPLOYEES
        monthly = plan_monthly_inr(plan.code, headcount)
        amount = annual_from_monthly(monthly) if billing_cycle == "annual" else monthly
        from apps.core.models import Tenant

        tenant = (
            Tenant.objects.exclude(schema_name="public")
            .filter(billing_email__iexact=request.user.email)
            .order_by("created_on")
            .first()
        )
        if not tenant:
            return Response(
                {"detail": "No workspace found for this account. Complete signup first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        original_amount = amount
        discount_amount = 0
        coupon_obj = None
        if coupon_code:
            from .coupons import CouponError, apply_coupon

            try:
                result = apply_coupon(
                    coupon_code,
                    plan_code=plan.code,
                    billing_cycle=billing_cycle,
                    amount_inr=amount,
                    tenant=tenant,
                )
            except CouponError as exc:
                return Response({"detail": exc.message}, status=status.HTTP_400_BAD_REQUEST)
            amount = result.final_amount
            original_amount = result.original_amount
            discount_amount = result.discount_amount
            coupon_obj = result.coupon

        taxable_ex = amount
        gst_amount = gst_on_excluding(taxable_ex)
        gross_inr = with_gst(taxable_ex)
        amount_paise = int(round(float(gross_inr) * 100))

        if amount_paise <= 0:
            from .coupons import record_redemption
            from .models import Subscription

            period_days = 365 if billing_cycle == "annual" else 30
            _attach_plan_to_subscription(tenant.schema_name, plan.code)
            notes = {
                "plan": plan.code,
                "cycle": billing_cycle,
                "schema": tenant.schema_name,
                "coupon": coupon_obj.code if coupon_obj else "",
            }
            activated = activate_subscription_for_tenant(
                tenant.schema_name, period_days=period_days, notes=notes,
            )
            if not activated:
                return Response({"detail": "No subscription found for workspace."}, status=status.HTTP_404_NOT_FOUND)
            sub = Subscription.objects.filter(tenant=tenant).first()
            if coupon_obj:
                record_redemption(
                    coupon_obj,
                    tenant=tenant,
                    subscription=sub,
                    plan_code=plan.code,
                    billing_cycle=billing_cycle,
                    original_amount=original_amount,
                    discount_amount=discount_amount,
                    final_amount=taxable_ex,
                    redeemed_by_email=request.user.email,
                )
            return Response(
                {
                    "free_activation": True,
                    "status": "activated",
                    "workspace": tenant.schema_name,
                    "original_amount": str(original_amount),
                    "discount_amount": str(discount_amount),
                    "taxable_amount": str(taxable_ex),
                    "gst_amount": str(gst_amount),
                    "final_amount": "0",
                    "total_amount": "0",
                    "coupon": coupon_obj.code if coupon_obj else "",
                },
                status=status.HTTP_201_CREATED,
            )

        key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
        if not (key_id and key_secret):
            return Response(
                {"detail": "Billing is not configured on this server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            import requests

            notes = {
                "plan": plan.code,
                "cycle": billing_cycle,
                "schema": tenant.schema_name,
                "workspace": tenant.schema_name,
                "max_employees": str(headcount),
                "employees": str(headcount),
            }
            if coupon_obj:
                notes["coupon"] = coupon_obj.code
                notes["discount_inr"] = str(discount_amount)
            notes["taxable_inr"] = str(taxable_ex)
            notes["gst_inr"] = str(gst_amount)
            notes["gross_inr"] = str(gross_inr)

            resp = requests.post(
                "https://api.razorpay.com/v1/orders",
                auth=(key_id, key_secret),
                json={
                    "amount": amount_paise,
                    "currency": "INR",
                    "notes": notes,
                },
                timeout=15,
            )
            resp.raise_for_status()
            order = resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Razorpay order creation failed")
            detail = "Could not start checkout. Please try again."
            try:
                import requests

                if isinstance(exc, requests.HTTPError) and exc.response is not None:
                    if exc.response.status_code == 401:
                        detail = (
                            "Razorpay API keys are invalid. Regenerate test keys in the "
                            "Razorpay dashboard, update .env, and restart fin-backend."
                        )
            except Exception:  # noqa: BLE001
                pass
            return Response(
                {"detail": detail},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
                if "invalid" in detail.lower()
                else status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "order_id": order["id"],
                "amount": amount_paise,
                "currency": "INR",
                "key_id": key_id,
                "plan": plan.code,
                "workspace": tenant.schema_name,
                "original_amount": str(original_amount),
                "discount_amount": str(discount_amount),
                "taxable_amount": str(taxable_ex),
                "gst_amount": str(gst_amount),
                "final_amount": str(gross_inr),
                "total_amount": str(gross_inr),
                "coupon": coupon_obj.code if coupon_obj else "",
            },
            status=status.HTTP_201_CREATED,
        )


class ValidateCouponView(APIView):
    """POST /api/v1/saas/billing/validate-coupon/ — preview discount without creating order."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from decimal import Decimal

        from .coupons import CouponError, apply_coupon
        from .models import Plan
        from .pricing import (
            INCLUDED_EMPLOYEES,
            annual_from_monthly,
            gst_on_excluding,
            plan_monthly_inr,
            with_gst,
        )
        from apps.core.models import Tenant

        coupon_code = (request.data.get("coupon_code") or "").strip()
        plan_code = request.data.get("plan_id")
        billing_cycle = request.data.get("cycle", "monthly")
        if not coupon_code:
            return Response({"detail": "coupon_code is required."}, status=status.HTTP_400_BAD_REQUEST)

        plan = Plan.objects.filter(code=plan_code, is_active=True).first()
        if not plan:
            return Response({"detail": "Unknown plan."}, status=status.HTTP_400_BAD_REQUEST)

        employees_raw = request.data.get("employees")
        try:
            employees = int(employees_raw) if employees_raw is not None else None
        except (TypeError, ValueError):
            employees = None
        headcount = employees or INCLUDED_EMPLOYEES
        monthly = plan_monthly_inr(plan.code, headcount)
        amount = annual_from_monthly(monthly) if billing_cycle == "annual" else monthly

        tenant = (
            Tenant.objects.exclude(schema_name="public")
            .filter(billing_email__iexact=request.user.email)
            .order_by("created_on")
            .first()
        )
        try:
            result = apply_coupon(
                coupon_code,
                plan_code=plan.code,
                billing_cycle=billing_cycle,
                amount_inr=Decimal(str(amount)),
                tenant=tenant,
            )
        except CouponError as exc:
            return Response({"valid": False, "detail": exc.message}, status=status.HTTP_400_BAD_REQUEST)

        taxable_ex = result.final_amount
        gst_amount = gst_on_excluding(taxable_ex)
        total = with_gst(taxable_ex)

        return Response({
            "valid": True,
            "code": result.coupon.code,
            "discount_type": result.coupon.discount_type,
            "discount_value": str(result.coupon.discount_value),
            "original_amount": str(result.original_amount),
            "discount_amount": str(result.discount_amount),
            "taxable_amount": str(taxable_ex),
            "gst_amount": str(gst_amount),
            "final_amount": str(taxable_ex),
            "total_amount": str(total),
            "free_checkout": taxable_ex <= 0,
        })


class ConfirmPaymentView(APIView):
    """POST /api/v1/saas/billing/confirm/ — verify Razorpay payment and activate subscription.

    Called by the SPA immediately after checkout success so the customer does not
    have to wait for the webhook. Idempotent — safe if the webhook also fires.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_id = (request.data.get("payment_id") or "").strip()
        order_id = (request.data.get("order_id") or "").strip()
        if not payment_id:
            return Response({"detail": "payment_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
        if not (key_id and key_secret):
            return Response(
                {"detail": "Billing is not configured on this server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            import requests

            pay_resp = requests.get(
                f"https://api.razorpay.com/v1/payments/{payment_id}",
                auth=(key_id, key_secret),
                timeout=15,
            )
            pay_resp.raise_for_status()
            payment = pay_resp.json()
        except Exception:  # noqa: BLE001
            logger.exception("Razorpay payment fetch failed for %s", payment_id)
            return Response({"detail": "Could not verify payment."}, status=status.HTTP_400_BAD_REQUEST)

        if payment.get("status") != "captured":
            return Response({"detail": "Payment is not captured yet."}, status=status.HTTP_400_BAD_REQUEST)

        razorpay_order_id = payment.get("order_id") or order_id
        if order_id and razorpay_order_id != order_id:
            return Response({"detail": "Order mismatch."}, status=status.HTTP_400_BAD_REQUEST)

        notes = {}
        if razorpay_order_id:
            try:
                import requests

                order_resp = requests.get(
                    f"https://api.razorpay.com/v1/orders/{razorpay_order_id}",
                    auth=(key_id, key_secret),
                    timeout=15,
                )
                if order_resp.ok:
                    notes = order_resp.json().get("notes") or {}
            except Exception:  # noqa: BLE001
                pass

        schema_name = notes.get("schema") or notes.get("workspace")
        if not schema_name:
            from apps.core.models import Tenant

            tenant = (
                Tenant.objects.exclude(schema_name="public")
                .filter(billing_email__iexact=request.user.email)
                .order_by("created_on")
                .first()
            )
            schema_name = tenant.schema_name if tenant else None

        if not schema_name:
            return Response({"detail": "Could not resolve workspace for this payment."}, status=status.HTTP_400_BAD_REQUEST)

        billing_cycle = notes.get("cycle", "monthly")
        period_days = 365 if billing_cycle == "annual" else 30
        plan_code = notes.get("plan")
        if plan_code:
            _attach_plan_to_subscription(schema_name, plan_code)

        activated = activate_subscription_for_tenant(
            schema_name, period_days=period_days, notes={**notes, "razorpay_payment_id": payment_id},
        )
        if not activated:
            return Response({"detail": "No subscription found for workspace."}, status=status.HTTP_404_NOT_FOUND)

        coupon_code = (notes.get("coupon") or "").strip()
        if coupon_code:
            from decimal import Decimal

            from apps.core.models import Tenant
            from .coupons import apply_coupon, record_redemption
            from .models import CouponCode, CouponRedemption, Subscription

            tenant = Tenant.objects.filter(schema_name=schema_name).first()
            sub = Subscription.objects.filter(tenant=tenant).first() if tenant else None
            if tenant and sub and not CouponRedemption.objects.filter(
                razorpay_order_id=razorpay_order_id, coupon__code__iexact=coupon_code,
            ).exists():
                try:
                    gross = Decimal(str(payment.get("amount", 0))) / Decimal("100")
                    discount_inr = Decimal(str(notes.get("discount_inr") or "0"))
                    original = gross + discount_inr
                    coupon = CouponCode.objects.filter(code__iexact=coupon_code, is_active=True).first()
                    if coupon:
                        record_redemption(
                            coupon,
                            tenant=tenant,
                            subscription=sub,
                            plan_code=plan_code or "",
                            billing_cycle=billing_cycle,
                            original_amount=original,
                            discount_amount=discount_inr,
                            final_amount=gross,
                            razorpay_order_id=razorpay_order_id,
                            razorpay_payment_id=payment_id,
                            redeemed_by_email=request.user.email,
                        )
                except Exception:  # noqa: BLE001
                    logger.exception("Coupon redemption record failed for %s", coupon_code)

        from apps.core.models import Tenant
        from .models import SaasInvoice, Subscription

        tenant = Tenant.objects.filter(schema_name=schema_name).first()
        latest_invoice = None
        if tenant:
            sub_obj = Subscription.objects.filter(tenant=tenant).first()
            if sub_obj:
                latest_invoice = (
                    SaasInvoice.objects.filter(subscription=sub_obj)
                    .order_by("-created_at")
                    .first()
                )

        return Response({
            "status": "activated",
            "workspace": schema_name,
            "invoice_id": latest_invoice.id if latest_invoice else None,
            "invoice_number": latest_invoice.number if latest_invoice else None,
        })


def _attach_plan_to_subscription(schema_name: str, plan_code: str) -> None:
    from apps.core.models import Tenant
    from .models import Plan, Subscription

    plan = Plan.objects.filter(code=plan_code, is_active=True).first()
    if not plan:
        return
    sub = Subscription.objects.filter(tenant__schema_name=schema_name).first()
    if sub and sub.plan_id != plan.id:
        sub.plan = plan
        sub.save(update_fields=["plan", "updated_at"])


class DevActivateView(APIView):
    """POST /api/v1/saas/dev/activate/ — instantly activate the current user's subscription.

    Only enabled when DEBUG=True. Calls the same activate_subscription_for_tenant
    helper the real webhook uses, so the subscription + entitlements flip to ACTIVE
    exactly as they would after a successful Razorpay payment.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.DEBUG:
            return Response({"detail": "Not available."}, status=status.HTTP_404_NOT_FOUND)

        from apps.core.models import Tenant

        tenant = (
            Tenant.objects.exclude(schema_name="public")
            .filter(billing_email__iexact=request.user.email)
            .order_by("created_on")
            .first()
        )
        if not tenant:
            return Response(
                {"detail": "No workspace found for this account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .models import Subscription, SubscriptionEntitlement

        sub = Subscription.objects.filter(tenant=tenant).select_related("plan").first()
        activated = activate_subscription_for_tenant(
            tenant.schema_name,
            period_days=30,
            notes={
                "plan": sub.plan.code if sub else "saptta-complete",
                "max_employees": "30",
                "employees": "30",
            },
        )
        if not activated:
            return Response(
                {"detail": "No subscription found for this workspace."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # In dev mode, always ensure both FIN and HR entitlements are active so
        # the product switcher shows both products without requiring plan upgrade.
        if sub:
            for product in (ProductCode.FIN, ProductCode.HR):
                SubscriptionEntitlement.objects.update_or_create(
                    subscription=sub,
                    product=product,
                    defaults={"status": SubscriptionEntitlement.Status.ACTIVE},
                )

        return Response({"status": "activated", "workspace": tenant.schema_name})


class WebhookView(APIView):
    """POST /api/v1/saas/billing/webhook/ — gateway payment callbacks.

    Verifies the HMAC signature, then activates the subscription on a successful
    payment. Public (no auth) but authenticated by the signature.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
        signature = request.headers.get("X-Razorpay-Signature", "")
        body = request.body

        if not verify_webhook_signature(body, signature, secret):
            logger.warning("Rejected webhook with bad signature")
            return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(body.decode())
        except (ValueError, UnicodeDecodeError):
            return Response({"detail": "Invalid payload."}, status=status.HTTP_400_BAD_REQUEST)

        # Replay guard: the gateway may re-deliver the same signed event. Dedupe on
        # the gateway's event id (fall back to a hash of the body) so a captured
        # payment can't be replayed to re-drive the subscription state machine.
        from .models import ProcessedWebhookEvent
        event_id = request.headers.get("X-Razorpay-Event-Id") or hashlib.sha256(body).hexdigest()
        _, created = ProcessedWebhookEvent.objects.get_or_create(event_id=event_id)
        if not created:
            return Response({"status": "ok", "duplicate": True})

        event = payload.get("event", "")
        notes = (
            payload.get("payload", {}).get("payment", {}).get("entity", {}).get("notes", {})
        ) or (
            payload.get("payload", {}).get("order", {}).get("entity", {}).get("notes", {})
        )
        schema_name = notes.get("schema") or notes.get("workspace")

        if event in ("payment.captured", "order.paid", "subscription.charged"):
            if schema_name:
                billing_cycle = notes.get("cycle", "monthly")
                period_days = 365 if billing_cycle == "annual" else 30
                activate_subscription_for_tenant(
                    schema_name, period_days=period_days, notes=notes,
                )
            else:
                logger.warning("Paid webhook without a workspace note; cannot activate")

        return Response({"status": "ok"})
