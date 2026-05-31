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

from django.conf import settings
from rest_framework import status
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


def activate_subscription_for_tenant(schema_name: str, *, period_days: int = 30) -> bool:
    """Mark a tenant's subscription ACTIVE with a fresh paid period + entitlements.

    Idempotent. Returns True if a subscription was found and updated.
    """
    from .models import Subscription, SubscriptionEntitlement

    sub = (
        Subscription.objects.select_related("tenant")
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
    logger.info("activate_subscription: %s ACTIVE until %s", schema_name, sub.current_period_end)
    return True


class CreateOrderView(APIView):
    """POST /api/v1/saas/billing/order/ -> create a gateway order for a plan.

    Returns the order so the SPA can open the gateway checkout. Requires a
    configured gateway; otherwise 503 (feature unavailable) — never 500.
    """

    permission_classes = [IsAuthenticated]
    throttle_scope = "signup"  # reuse a conservative rate

    def post(self, request):
        key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
        if not (key_id and key_secret):
            return Response(
                {"detail": "Billing is not configured on this server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        plan_code = request.data.get("plan_id")
        billing_cycle = request.data.get("cycle", "monthly")
        from .models import Plan

        plan = Plan.objects.filter(code=plan_code, is_active=True).first()
        if not plan:
            return Response({"detail": "Unknown plan."}, status=status.HTTP_400_BAD_REQUEST)

        amount = plan.annual_price if billing_cycle == "annual" else plan.monthly_price
        amount_paise = int(round(float(amount) * 100))

        try:
            import requests

            resp = requests.post(
                "https://api.razorpay.com/v1/orders",
                auth=(key_id, key_secret),
                json={
                    "amount": amount_paise,
                    "currency": "INR",
                    "notes": {"plan": plan.code, "cycle": billing_cycle},
                },
                timeout=15,
            )
            resp.raise_for_status()
            order = resp.json()
        except Exception:  # noqa: BLE001
            logger.exception("Razorpay order creation failed")
            return Response(
                {"detail": "Could not start checkout. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "order_id": order["id"],
                "amount": amount_paise,
                "currency": "INR",
                "key_id": key_id,
                "plan": plan.code,
            },
            status=status.HTTP_201_CREATED,
        )


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

        event = payload.get("event", "")
        notes = (
            payload.get("payload", {}).get("payment", {}).get("entity", {}).get("notes", {})
        ) or (
            payload.get("payload", {}).get("order", {}).get("entity", {}).get("notes", {})
        )
        schema_name = notes.get("schema") or notes.get("workspace")

        if event in ("payment.captured", "order.paid", "subscription.charged"):
            if schema_name:
                activate_subscription_for_tenant(schema_name)
            else:
                logger.warning("Paid webhook without a workspace note; cannot activate")

        return Response({"status": "ok"})
