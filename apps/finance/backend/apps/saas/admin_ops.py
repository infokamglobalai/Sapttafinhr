"""Super-admin operational endpoints — the write/operate surface of /superadmin.

Companion to admin_views.py (which is the read-only directory + stats). Everything
here is is_staff-gated and audited via record_audit(). Grouped by the phased
build-out:

  Phase 1  company drill-down, audit trail
  Phase 2  user management (list / create / reset password / activate)
  Phase 3  impersonation ("open workspace as admin")
  Phase 4  provisioning (create company) + lifecycle (archive / delete)
  Phase 5  billing ops (invoice mark-paid / void / generate, entitlement toggle)
  Phase 6  analytics (signups / status / plan trends)
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db import IntegrityError
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Domain, Tenant
from apps.identity.models import User

from django_tenants.utils import schema_context

from .audit import record_audit
from .models import (
    Plan,
    PlatformAnnouncement,
    ProductCode,
    SaasAuditLog,
    SaasInvoice,
    Subscription,
    SubscriptionEntitlement,
    TenantNote,
)
from .permissions import IsSuperAdmin

_PRODUCT_SLUG = {ProductCode.FIN: "finance", ProductCode.HR: "hrms"}
_SLUG_PRODUCT = {"finance": ProductCode.FIN, "hrms": ProductCode.HR, "FIN": ProductCode.FIN, "HR": ProductCode.HR}


def _tenant_or_none(schema: str) -> Tenant | None:
    return Tenant.objects.exclude(schema_name="public").filter(schema_name=schema).first()


def _user_summary(u: User, *, billing_email: str = "") -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "is_active": u.is_active,
        "is_staff": u.is_staff,
        "is_verified": getattr(u, "is_verified", False),
        "date_joined": u.date_joined,
        "is_owner": bool(billing_email) and u.email.lower() == billing_email.lower(),
    }


def _entitlement_summary(e: SubscriptionEntitlement) -> dict:
    return {
        "id": e.id,
        "product": e.product,
        "product_slug": _PRODUCT_SLUG.get(e.product, e.product),
        "status": e.status,
        "is_active": e.is_active,
    }


def _invoice_summary(inv: SaasInvoice) -> dict:
    return {
        "id": inv.id,
        "number": inv.number,
        "amount": str(inv.amount),
        "taxable_amount": str(inv.taxable_amount),
        "tax_rate": str(inv.tax_rate),
        "period_start": inv.period_start,
        "period_end": inv.period_end,
        "due_date": inv.due_date,
        "status": inv.status,
        "paid_at": inv.paid_at,
    }


def _reset_link_for(user: User) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
    return f"{base}/reset-password?uid={uid}&token={token}"


# ───────────────────────────── Phase 1: drill-down + audit ─────────────────────────────
class AdminCompanyDetailView(APIView):
    """GET /api/v1/saas/admin/companies/<schema>/ — full profile of one tenant."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, schema):
        t = _tenant_or_none(schema)
        if not t:
            return Response({"detail": "Company not found."}, status=404)
        sub = getattr(t, "subscription", None)
        users = User.objects.filter(email__iexact=t.billing_email).order_by("email") if t.billing_email else []
        invoices = (
            SaasInvoice.objects.filter(subscription=sub).order_by("-period_start") if sub else []
        )
        recent_audit = SaasAuditLog.objects.filter(target_schema=schema)[:25]
        return Response(
            {
                "schema_name": t.schema_name,
                "name": t.name,
                "billing_email": t.billing_email,
                "created_on": t.created_on,
                "is_active": t.is_active,
                "domains": list(t.domains.values_list("domain", flat=True)),
                "subscription": None if not sub else {
                    "id": sub.id,
                    "status": sub.status,
                    "is_active": sub.is_commercially_active,
                    "plan_id": sub.plan_id,
                    "plan_code": sub.plan.code,
                    "plan_name": sub.plan.name,
                    "monthly_price": str(sub.plan.monthly_price),
                    "current_period_start": sub.current_period_start,
                    "current_period_end": sub.current_period_end,
                    "cancelled_at": sub.cancelled_at,
                    "entitlements": [_entitlement_summary(e) for e in sub.entitlements.all()],
                },
                "users": [_user_summary(u, billing_email=t.billing_email) for u in users],
                "invoices": [_invoice_summary(i) for i in invoices],
                "audit": [
                    {"actor": a.actor_email, "action": a.action, "detail": a.detail, "at": a.created_at}
                    for a in recent_audit
                ],
            }
        )


class AdminAuditView(APIView):
    """GET /api/v1/saas/admin/audit/ — recent privileged actions (optionally ?schema=)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        qs = SaasAuditLog.objects.all()
        schema = request.query_params.get("schema")
        if schema:
            qs = qs.filter(target_schema=schema)
        rows = qs[:200]
        return Response([
            {
                "id": a.id,
                "actor": a.actor_email,
                "action": a.action,
                "target_schema": a.target_schema,
                "target_label": a.target_label,
                "detail": a.detail,
                "at": a.created_at,
            }
            for a in rows
        ])


# ───────────────────────────── Phase 2: user management ─────────────────────────────
class AdminCompanyUsersView(APIView):
    """GET → users for a tenant; POST → create/invite a platform user for it."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, schema):
        t = _tenant_or_none(schema)
        if not t:
            return Response({"detail": "Company not found."}, status=404)
        users = User.objects.filter(email__iexact=t.billing_email).order_by("email") if t.billing_email else []
        return Response([_user_summary(u, billing_email=t.billing_email) for u in users])

    def post(self, request, schema):
        t = _tenant_or_none(schema)
        if not t:
            return Response({"detail": "Company not found."}, status=404)
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Email is required."}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "A user with this email already exists."}, status=409)
        full_name = (request.data.get("full_name") or "").strip()
        password = request.data.get("password") or None
        make_owner = bool(request.data.get("make_owner"))
        # Admin-created users are pre-verified (an admin vouches for them); they
        # set their password via the reset link below. Without this they'd be
        # blocked from login when REQUIRE_EMAIL_VERIFICATION is on (prod).
        user = User.objects.create_user(email=email, password=password, full_name=full_name, is_verified=True)
        reset_link = None
        if not password:
            reset_link = _reset_link_for(user)
        if make_owner:
            t.billing_email = email
            t.save(update_fields=["billing_email"])
        record_audit(request, "user.create", target_schema=schema, target_label=t.name,
                     detail={"email": email, "make_owner": make_owner})
        return Response(
            {**_user_summary(user, billing_email=t.billing_email), "reset_link": reset_link},
            status=201,
        )


class AdminUserResetPasswordView(APIView):
    """POST /api/v1/saas/admin/users/<id>/reset-password/ — issue a reset link."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, user_id):
        user = User.objects.filter(pk=user_id).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)
        link = _reset_link_for(user)
        # Best-effort email; the link is also returned for the operator.
        try:
            from apps.identity.auth_views import send_password_reset_email
            send_password_reset_email(user)
            emailed = True
        except Exception:  # noqa: BLE001
            emailed = False
        record_audit(request, "user.reset_password", target_label=user.email, detail={"emailed": emailed})
        return Response({"detail": "Reset link generated.", "reset_link": link, "emailed": emailed})


class AdminUserSetActiveView(APIView):
    """POST /api/v1/saas/admin/users/<id>/set-active/ {is_active} — enable/disable a user."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, user_id):
        user = User.objects.filter(pk=user_id).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)
        if user.is_staff:
            return Response({"detail": "Cannot deactivate a platform admin."}, status=400)
        is_active = bool(request.data.get("is_active", True))
        user.is_active = is_active
        user.save(update_fields=["is_active"])
        record_audit(request, "user.set_active", target_label=user.email, detail={"is_active": is_active})
        return Response(_user_summary(user))


# ───────────────────────────── Phase 3: impersonation ─────────────────────────────
class AdminImpersonateView(APIView):
    """POST /api/v1/saas/admin/companies/<schema>/impersonate/ → scoped tenant token.

    Mints a short-lived JWT for the tenant's owner (or a named user), carrying the
    `workspace` claim so it is bound to that tenant's schema, plus an
    `impersonator` claim recording the operator. Every call is audited.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, schema):
        from rest_framework_simplejwt.tokens import RefreshToken

        t = _tenant_or_none(schema)
        if not t:
            return Response({"detail": "Company not found."}, status=404)

        user_id = request.data.get("user_id")
        if user_id:
            target = User.objects.filter(pk=user_id).first()
        else:
            target = User.objects.filter(email__iexact=t.billing_email).first()
        if not target:
            return Response(
                {"detail": "No user to impersonate for this company. Create one first."},
                status=400,
            )
        if target.is_staff:
            return Response({"detail": "Refusing to impersonate another platform admin."}, status=400)

        refresh = RefreshToken.for_user(target)
        refresh["email"] = target.email
        refresh["full_name"] = target.full_name
        refresh["workspace"] = schema
        refresh["impersonator"] = request.user.email
        # Short-lived impersonation access token (30 min).
        access = refresh.access_token
        access.set_exp(lifetime=timedelta(minutes=30))

        record_audit(request, "impersonate", target_schema=schema, target_label=t.name,
                     detail={"as_user": target.email})
        return Response(
            {
                "access": str(access),
                "refresh": str(refresh),
                "workspace": schema,
                "company": t.name,
                "as_user": {"id": target.id, "email": target.email, "full_name": target.full_name},
            }
        )


# ───────────────────────────── Phase 4: provisioning + lifecycle ─────────────────────────────
def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    base = re.sub(r"-+", "-", base) or "workspace"
    return base[:40]


def _unique_schema(preferred: str) -> str:
    from apps.saas.signup_views import RESERVED
    candidate, n = preferred, 1
    while candidate in RESERVED or Tenant.objects.filter(schema_name=candidate).exists():
        n += 1
        candidate = f"{preferred}-{n}"
    return candidate


class AdminProvisionCompanyView(APIView):
    """POST /api/v1/saas/admin/companies/ — operator-provisioned tenant (sales-led)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        # Operator/sales-led provisioning stays synchronous (not latency-bound
        # like public signup). Reuse the shared seed/HR helpers from tasks.
        from apps.saas.tasks import _provision_hr, _seed_finance

        name = (request.data.get("company_name") or "").strip()
        email = (request.data.get("email") or "").strip().lower()
        if not name or not email:
            return Response({"detail": "company_name and email are required."}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "A user with this email already exists."}, status=409)

        slugs = request.data.get("products") or ["finance", "hrms"]
        products = [_SLUG_PRODUCT[s] for s in slugs if s in _SLUG_PRODUCT] or [ProductCode.FIN]
        plan_code = (request.data.get("plan_id") or "saptta-complete").strip()
        country = (request.data.get("country") or "IN").strip()
        password = request.data.get("password") or None

        schema_name = _unique_schema(_slugify(name))
        tenant = Tenant.objects.create(schema_name=schema_name, name=name, billing_email=email)

        host = request.get_host().split(":")[0].lower()
        base_domain = "localhost" if host in ("localhost", "127.0.0.1") or host.startswith("192.168.") else host
        Domain.objects.get_or_create(
            domain=f"{schema_name}.{base_domain}", tenant=tenant, defaults={"is_primary": True}
        )

        try:
            # Pre-verified: admin-provisioned owner sets their password via the
            # reset link and must not be blocked by REQUIRE_EMAIL_VERIFICATION.
            user = User.objects.create_user(email=email, password=password, full_name=request.data.get("full_name", ""), is_verified=True)
        except IntegrityError:
            tenant.delete(force_drop=True)
            return Response({"detail": "A user with this email already exists."}, status=409)
        reset_link = _reset_link_for(user) if not password else None

        plan, _ = Plan.objects.get_or_create(code=plan_code, defaults={"name": plan_code})
        today = date.today()
        sub = Subscription.objects.create(
            tenant=tenant, plan=plan, status=Subscription.Status.ACTIVE,
            current_period_start=today, current_period_end=today + timedelta(days=30),
        )
        for product in dict.fromkeys(products):
            SubscriptionEntitlement.objects.update_or_create(
                subscription=sub, product=product,
                defaults={"status": SubscriptionEntitlement.Status.ACTIVE},
            )

        if ProductCode.FIN in products:
            try:
                _seed_finance(schema_name, name, country)
            except Exception:  # noqa: BLE001 — seeding must not abort provisioning
                pass
        if ProductCode.HR in products:
            try:
                _provision_hr(name=name, subdomain=schema_name, email=email, country=country)
            except Exception:  # noqa: BLE001
                pass

        record_audit(request, "company.provision", target_schema=schema_name, target_label=name,
                     detail={"email": email, "plan": plan_code, "products": slugs})
        return Response(
            {"schema_name": schema_name, "name": name, "billing_email": email, "reset_link": reset_link},
            status=201,
        )


class AdminCompanyLifecycleView(APIView):
    """POST .../archive/ {active} — suspend/restore; DELETE — hard drop the tenant."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, schema):
        t = _tenant_or_none(schema)
        if not t:
            return Response({"detail": "Company not found."}, status=404)
        active = bool(request.data.get("active", False))
        t.is_active = active
        t.save(update_fields=["is_active"])
        sub = getattr(t, "subscription", None)
        if sub and not active:
            sub.status = Subscription.Status.CANCELLED
            sub.cancelled_at = timezone.now()
            sub.save(update_fields=["status", "cancelled_at"])
            sub.entitlements.update(status=SubscriptionEntitlement.Status.SUSPENDED)
        record_audit(request, "company.archive" if not active else "company.restore",
                     target_schema=schema, target_label=t.name, detail={"active": active})
        return Response({"schema_name": schema, "is_active": active})

    def delete(self, request, schema):
        t = _tenant_or_none(schema)
        if not t:
            return Response({"detail": "Company not found."}, status=404)
        confirm = request.query_params.get("confirm") or request.data.get("confirm")
        if confirm != schema:
            return Response(
                {"detail": "Confirmation required: pass ?confirm=<schema_name> to delete."},
                status=400,
            )
        name = t.name
        record_audit(request, "company.delete", target_schema=schema, target_label=name, detail={})
        t.delete(force_drop=True)  # drops the Postgres schema
        return Response({"deleted": schema, "name": name})


# ───────────────────────────── Phase 5: billing ops ─────────────────────────────
class AdminInvoiceActionView(APIView):
    """POST /api/v1/saas/admin/invoices/<id>/<action>/ — mark-paid | void."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, invoice_id, action):
        inv = SaasInvoice.objects.select_related("subscription__tenant").filter(pk=invoice_id).first()
        if not inv:
            return Response({"detail": "Invoice not found."}, status=404)
        schema = inv.subscription.tenant.schema_name
        if action == "mark-paid":
            inv.status = SaasInvoice.Status.PAID
            inv.paid_at = timezone.now()
            inv.save(update_fields=["status", "paid_at"])
        elif action == "void":
            inv.status = SaasInvoice.Status.VOID
            inv.save(update_fields=["status"])
        else:
            return Response({"detail": "Unknown action."}, status=400)
        record_audit(request, f"invoice.{action}", target_schema=schema,
                     detail={"invoice": inv.number, "amount": str(inv.amount)})
        return Response(_invoice_summary(inv))


class AdminGenerateInvoiceView(APIView):
    """POST /api/v1/saas/admin/companies/<schema>/invoices/ — raise an OPEN invoice."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, schema):
        t = _tenant_or_none(schema)
        if not t:
            return Response({"detail": "Company not found."}, status=404)
        sub = getattr(t, "subscription", None)
        if not sub:
            return Response({"detail": "Company has no subscription to invoice."}, status=400)

        today = date.today()
        period_start = sub.current_period_start or today
        period_end = sub.current_period_end or (today + timedelta(days=30))
        if SaasInvoice.objects.filter(subscription=sub, period_start=period_start, period_end=period_end).exists():
            return Response({"detail": "An invoice already exists for this period."}, status=409)

        rate = Decimal("18")
        gross = Decimal(str(request.data.get("amount") or sub.plan.monthly_price or 0))
        taxable = (gross / (Decimal("1") + rate / Decimal("100"))).quantize(Decimal("0.01"), ROUND_HALF_UP) if gross else Decimal("0")
        tax = (gross - taxable).quantize(Decimal("0.01"), ROUND_HALF_UP)
        fy_start = period_end.year if period_end.month >= 4 else period_end.year - 1
        fy = f"{fy_start}-{str(fy_start + 1)[-2:]}"
        seq = SaasInvoice.objects.filter(number__contains=f"/{fy}/").count() + 1
        inv = SaasInvoice.objects.create(
            subscription=sub, number=f"SAAS/{fy}/{seq:06d}",
            period_start=period_start, period_end=period_end,
            amount=gross, taxable_amount=taxable, cgst=(tax / 2).quantize(Decimal("0.01")),
            sgst=tax - (tax / 2).quantize(Decimal("0.01")), tax_rate=rate,
            due_date=period_end, status=SaasInvoice.Status.OPEN,
        )
        record_audit(request, "invoice.generate", target_schema=schema,
                     detail={"invoice": inv.number, "amount": str(gross)})
        return Response(_invoice_summary(inv), status=201)


class AdminEntitlementToggleView(APIView):
    """POST /api/v1/saas/admin/subscriptions/<id>/entitlement/ {product, enable}."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, sub_id):
        sub = Subscription.objects.select_related("tenant").filter(pk=sub_id).first()
        if not sub:
            return Response({"detail": "Subscription not found."}, status=404)
        product = _SLUG_PRODUCT.get(request.data.get("product"))
        if not product:
            return Response({"detail": "Unknown product."}, status=400)
        enable = bool(request.data.get("enable", True))
        new_status = (
            SubscriptionEntitlement.Status.ACTIVE if enable
            else SubscriptionEntitlement.Status.SUSPENDED
        )
        ent, _ = SubscriptionEntitlement.objects.update_or_create(
            subscription=sub, product=product, defaults={"status": new_status}
        )
        record_audit(request, "entitlement.toggle", target_schema=sub.tenant.schema_name,
                     detail={"product": product, "enable": enable})
        return Response(_entitlement_summary(ent))


# ───────────────────────────── Phase 6: analytics ─────────────────────────────
class AdminAnalyticsView(APIView):
    """GET /api/v1/saas/admin/analytics/ — signups, status mix, plan mix, MRR."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        tenants = list(Tenant.objects.exclude(schema_name="public").values_list("created_on", flat=True))

        # Signups per month for the last 12 months (+ running cumulative total).
        months: list[dict] = []
        today = date.today().replace(day=1)
        buckets: dict[str, int] = {}
        for created in tenants:
            if not created:
                continue
            d = created.date() if isinstance(created, datetime) else created
            buckets[f"{d.year}-{d.month:02d}"] = buckets.get(f"{d.year}-{d.month:02d}", 0) + 1
        cumulative = 0
        # cumulative = everything before the 12-month window
        window_start = (today - timedelta(days=365)).replace(day=1)
        for created in tenants:
            d = (created.date() if isinstance(created, datetime) else created) if created else None
            if d and d < window_start:
                cumulative += 1
        cursor = window_start
        for _ in range(13):
            key = f"{cursor.year}-{cursor.month:02d}"
            count = buckets.get(key, 0)
            cumulative += count
            months.append({"month": key, "signups": count, "total": cumulative})
            cursor = (cursor.replace(day=28) + timedelta(days=7)).replace(day=1)

        status_mix = {
            s.value: Subscription.objects.filter(status=s.value).count()
            for s in Subscription.Status
        }

        plan_mix = []
        for plan in Plan.objects.all():
            n = Subscription.objects.filter(plan=plan).count()
            if n:
                plan_mix.append({"plan": plan.name, "code": plan.code, "count": n})
        plan_mix.sort(key=lambda x: -x["count"])

        active_subs = Subscription.objects.filter(
            status__in=[Subscription.Status.ACTIVE, Subscription.Status.TRIAL]
        ).select_related("plan")
        mrr = sum((s.plan.monthly_price for s in active_subs), Decimal("0"))

        return Response({
            "signups_by_month": months,
            "status_mix": status_mix,
            "plan_mix": plan_mix,
            "mrr": str(mrr),
            "total_companies": len(tenants),
        })


# ───────────────────────────── Phase 7: usage metrics + notes ─────────────────────────────
def _hr_headcount_one(schema: str) -> int | None:
    """Live HR headcount for one workspace via the FIN→HR internal proxy."""
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    base = getattr(settings, "HR_INTERNAL_BASE_URL", "")
    if not (secret and base):
        return None
    try:
        import requests
        r = requests.get(
            base.rstrip("/") + "/internal/stats/",
            params={"workspace": schema},
            headers={"Authorization": f"Bearer {secret}", "Host": "localhost"},
            timeout=3,
        )
        if r.status_code == 200:
            return int(r.json().get("total_employees", 0) or 0)
    except Exception:  # noqa: BLE001
        pass
    return None


class AdminCompanyUsageView(APIView):
    """GET /api/v1/saas/admin/companies/<schema>/usage/ — FIN + HR usage + onboarding."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, schema):
        t = _tenant_or_none(schema)
        if not t:
            return Response({"detail": "Company not found."}, status=404)

        fin = {"invoices": 0, "parties": 0, "items": 0, "journal_entries": 0, "available": False}
        try:
            with schema_context(schema):
                from apps.billing.models import Invoice
                from apps.ledger.models import JournalEntry
                from apps.masters.models import Item, Party
                fin = {
                    "invoices": Invoice.objects.count(),
                    "parties": Party.objects.count(),
                    "items": Item.objects.count(),
                    "journal_entries": JournalEntry.objects.count(),
                    "available": True,
                }
        except Exception:  # noqa: BLE001 — HR-only tenant or un-seeded schema
            pass

        hr_headcount = _hr_headcount_one(schema)

        sub = getattr(t, "subscription", None)
        onboarding = {
            "has_subscription": sub is not None,
            "subscription_active": bool(sub and sub.is_commercially_active),
            "fin_seeded": fin["available"],
            "has_first_invoice": fin["invoices"] > 0,
            "hr_provisioned": hr_headcount is not None,
        }
        return Response({
            "fin": fin,
            "hr": {"headcount": hr_headcount},
            "onboarding": onboarding,
        })


class AdminCompanyNotesView(APIView):
    """GET / POST /api/v1/saas/admin/companies/<schema>/notes/ — internal operator notes."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, schema):
        notes = TenantNote.objects.filter(tenant_schema=schema)[:100]
        return Response([
            {"id": n.id, "author": n.author_email, "body": n.body, "at": n.created_at}
            for n in notes
        ])

    def post(self, request, schema):
        if not _tenant_or_none(schema):
            return Response({"detail": "Company not found."}, status=404)
        body = (request.data.get("body") or "").strip()
        if not body:
            return Response({"detail": "Note body is required."}, status=400)
        n = TenantNote.objects.create(
            tenant_schema=schema, author_email=getattr(request.user, "email", ""), body=body
        )
        record_audit(request, "note.add", target_schema=schema, detail={"note_id": n.id})
        return Response({"id": n.id, "author": n.author_email, "body": n.body, "at": n.created_at}, status=201)


# ───────────────────────────── Phase 10: access & governance ─────────────────────────────
def _workspace_for_email(email: str) -> str:
    t = Tenant.objects.exclude(schema_name="public").filter(billing_email__iexact=email).first()
    return t.schema_name if t else ""


class AdminUserSearchView(APIView):
    """GET /api/v1/saas/admin/users/?q= — global user search across the platform."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        qs = User.objects.all().order_by("email")
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(email__icontains=q) | Q(full_name__icontains=q))
        rows = qs[:100]
        # Map billing_email → schema in one query (avoid N+1).
        owners = dict(
            Tenant.objects.exclude(schema_name="public")
            .exclude(billing_email="")
            .values_list("billing_email", "schema_name")
        )
        owners_lc = {k.lower(): v for k, v in owners.items()}
        return Response([{
            "id": u.id, "email": u.email, "full_name": u.full_name,
            "is_active": u.is_active, "is_staff": u.is_staff,
            "is_verified": getattr(u, "is_verified", False),
            "workspace": owners_lc.get(u.email.lower(), ""),
        } for u in rows])


class AdminUserSetStaffView(APIView):
    """POST /api/v1/saas/admin/users/<id>/set-staff/ {is_staff} — grant/revoke admin."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, user_id):
        user = User.objects.filter(pk=user_id).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)
        make_staff = bool(request.data.get("is_staff", False))
        if not make_staff:
            if user.id == request.user.id:
                return Response({"detail": "You cannot revoke your own admin access."}, status=400)
            if User.objects.filter(is_staff=True, is_active=True).count() <= 1:
                return Response({"detail": "Cannot remove the last platform admin."}, status=400)
        user.is_staff = make_staff
        user.is_superuser = make_staff
        user.save(update_fields=["is_staff", "is_superuser"])
        record_audit(request, "user.set_staff", target_label=user.email, detail={"is_staff": make_staff})
        return Response({"id": user.id, "email": user.email, "is_staff": user.is_staff})


# ───────────────────────────── Phase 11: announcements ─────────────────────────────
def _announcement_dict(a: PlatformAnnouncement) -> dict:
    return {
        "id": a.id, "title": a.title, "body": a.body, "level": a.level,
        "is_active": a.is_active, "is_live": a.is_live,
        "starts_at": a.starts_at, "ends_at": a.ends_at,
        "created_by": a.created_by, "created_at": a.created_at,
    }


class AdminAnnouncementsView(APIView):
    """GET (list) / POST (create) platform announcements."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        return Response([_announcement_dict(a) for a in PlatformAnnouncement.objects.all()[:100]])

    def post(self, request):
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"detail": "Title is required."}, status=400)
        a = PlatformAnnouncement.objects.create(
            title=title,
            body=(request.data.get("body") or "").strip(),
            level=request.data.get("level") or PlatformAnnouncement.Level.INFO,
            starts_at=request.data.get("starts_at") or None,
            ends_at=request.data.get("ends_at") or None,
            created_by=getattr(request.user, "email", ""),
        )
        record_audit(request, "announcement.create", target_label=title, detail={"level": a.level})
        return Response(_announcement_dict(a), status=201)


class AdminAnnouncementDetailView(APIView):
    """PATCH (toggle) / DELETE a platform announcement."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def patch(self, request, pk):
        a = PlatformAnnouncement.objects.filter(pk=pk).first()
        if not a:
            return Response({"detail": "Not found."}, status=404)
        if "is_active" in request.data:
            a.is_active = bool(request.data["is_active"])
        for f in ("title", "body", "level"):
            if f in request.data:
                setattr(a, f, request.data[f])
        a.save()
        record_audit(request, "announcement.update", target_label=a.title, detail={"is_active": a.is_active})
        return Response(_announcement_dict(a))

    def delete(self, request, pk):
        a = PlatformAnnouncement.objects.filter(pk=pk).first()
        if not a:
            return Response({"detail": "Not found."}, status=404)
        title = a.title
        a.delete()
        record_audit(request, "announcement.delete", target_label=title, detail={})
        return Response(status=204)


class ActiveAnnouncementView(APIView):
    """GET /api/v1/saas/announcements/active/ — live announcements for any signed-in user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        live = [_announcement_dict(a) for a in PlatformAnnouncement.objects.filter(is_active=True)[:20] if a.is_live]
        return Response(live)
