"""Public self-serve signup → provisions a new workspace (tenant).

Creates, for a new customer choosing a plan on the website:
  - a Tenant (django-tenants auto-creates + migrates its Postgres schema)
  - a Domain  ({workspace}.localhost)  for subdomain routing
  - the owner User (lives in the public/shared schema)
  - a Subscription + per-product SubscriptionEntitlement(s) (FIN / HR)
  - a Company (+ Indian COA + current fiscal year) inside the tenant schema

Returns JWT tokens + the workspace slug + the active product slugs, so the SPA
can sign the user straight in and route them into the app.

This mirrors the `bootstrap_dev` management command. It is intentionally NOT
wrapped in a single atomic block: django-tenants creates the schema as a side
effect of saving the Tenant, which does not compose with an outer transaction.
"""
from __future__ import annotations

import re
from datetime import date, timedelta

from django.conf import settings
from django.db import IntegrityError
from django_tenants.utils import schema_context
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import Domain, Tenant
from apps.identity.models import User
from .models import Plan, ProductCode, Subscription, SubscriptionEntitlement

# Reserved schema names that must never be used for a customer workspace.
RESERVED = {"public", "www", "admin", "api", "app", "static", "media", "hr"}

# Plan id (from the website) → products granted.
PLAN_PRODUCTS = {
    "hrms-starter": [ProductCode.HR],
    "hrms-pro": [ProductCode.HR],
    "finance-starter": [ProductCode.FIN],
    "finance-pro": [ProductCode.FIN],
    "saptta-complete": [ProductCode.FIN, ProductCode.HR],
}
SLUG_TO_PRODUCT = {"finance": ProductCode.FIN, "hrms": ProductCode.HR}
PRODUCT_TO_SLUG = {ProductCode.FIN: "finance", ProductCode.HR: "hrms"}


def _slugify_company(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    base = re.sub(r"-+", "-", base) or "workspace"
    return base[:40]


def _unique_schema_name(preferred: str) -> str:
    candidate = preferred
    n = 1
    while candidate in RESERVED or Tenant.objects.filter(schema_name=candidate).exists():
        n += 1
        candidate = f"{preferred}-{n}"
    return candidate


def _resolve_products(plan_id: str, explicit: list[str] | None) -> list[str]:
    if explicit:
        out = [SLUG_TO_PRODUCT[p] for p in explicit if p in SLUG_TO_PRODUCT]
        if out:
            return list(dict.fromkeys(out))
    return PLAN_PRODUCTS.get(plan_id, [ProductCode.FIN])


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    company_name = serializers.CharField(max_length=200)
    plan_id = serializers.CharField(max_length=40, required=False, default="saptta-complete")
    # Optional explicit product slugs (["finance","hrms"]) — overrides plan_id.
    products = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True
    )


class SignupView(APIView):
    """POST /api/v1/saas/signup/ — provision a workspace and return tokens."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        ser = SignupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        if User.objects.filter(email__iexact=data["email"]).exists():
            return Response(
                {"detail": "An account with this email already exists. Please sign in."},
                status=status.HTTP_409_CONFLICT,
            )

        products = _resolve_products(data.get("plan_id", ""), data.get("products"))
        schema_name = _unique_schema_name(_slugify_company(data["company_name"]))

        # 1) Tenant (+ schema auto-created & migrated) and its domain.
        tenant = Tenant.objects.create(
            schema_name=schema_name,
            name=data["company_name"],
            billing_email=data["email"],
        )
        Domain.objects.get_or_create(
            domain=f"{schema_name}.localhost", tenant=tenant, defaults={"is_primary": True}
        )

        # 2) Owner user (public/shared schema).
        try:
            user = User.objects.create_user(
                email=data["email"],
                password=data["password"],
                full_name=data.get("full_name", ""),
            )
        except IntegrityError:
            tenant.delete(force_drop=True)
            return Response(
                {"detail": "An account with this email already exists. Please sign in."},
                status=status.HTTP_409_CONFLICT,
            )

        # 3) Subscription + per-product entitlements.
        #    In DEBUG (dev/test) mode: immediately ACTIVE — no payment required.
        #    In production: PENDING until the billing webhook activates it.
        from django.conf import settings as _settings
        from datetime import date, timedelta
        _dev = getattr(_settings, "DEBUG", False)
        _sub_status = Subscription.Status.ACTIVE if _dev else Subscription.Status.PENDING
        _ent_status = SubscriptionEntitlement.Status.ACTIVE if _dev else SubscriptionEntitlement.Status.PENDING

        plan, _ = Plan.objects.get_or_create(
            code=data.get("plan_id") or "saptta-complete",
            defaults={"name": data.get("plan_id") or "Saptta Complete"},
        )
        sub, _ = Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={
                "plan": plan,
                "status": _sub_status,
                "current_period_start": date.today() if _dev else None,
                "current_period_end": date.today() + timedelta(days=365) if _dev else None,
            },
        )
        # Always grant both FIN and HR in dev so the product switcher shows both.
        _all_products = list(dict.fromkeys(products + ([ProductCode.FIN, ProductCode.HR] if _dev else [])))
        for product in _all_products:
            SubscriptionEntitlement.objects.update_or_create(
                subscription=sub,
                product=product,
                defaults={"status": _ent_status},
            )

        # 4) Company + COA + fiscal year inside the new tenant schema.
        if ProductCode.FIN in products:
            self._seed_finance(schema_name, data["company_name"])

        # 4b) Provision the HR workspace (separate backend service).
        #     In dev mode always provision HR so both products work out of the box.
        if ProductCode.HR in _all_products:
            self._provision_hr(
                name=data["company_name"], subdomain=schema_name, email=data["email"]
            )

        # 5) Send the email-verification link (best-effort; never block signup
        #    if the mail backend is down).
        try:
            from apps.identity.auth_views import send_verification_email

            send_verification_email(user)
        except Exception:  # noqa: BLE001
            pass

        # 6) Tokens for immediate sign-in.
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "workspace": schema_name,
                "products": [PRODUCT_TO_SLUG[p] for p in _all_products if p in PRODUCT_TO_SLUG],
                "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
            },
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _provision_hr(*, name: str, subdomain: str, email: str) -> None:
        """Call the HR backend's internal provisioning endpoint (best-effort)."""
        import logging

        secret = getattr(settings, "SSO_SHARED_SECRET", "")
        base = getattr(settings, "HR_INTERNAL_BASE_URL", "")
        if not (secret and base):
            logging.getLogger(__name__).info(
                "HR provisioning skipped (SSO_SHARED_SECRET / HR_INTERNAL_BASE_URL unset)"
            )
            return
        try:
            import requests

            requests.post(
                f"{base.rstrip('/')}/internal/provision/",
                headers={
                    "Authorization": f"Bearer {secret}",
                    "Host": "localhost",  # HR's ALLOWED_HOSTS only accepts localhost
                },
                json={"name": name, "subdomain": subdomain, "email": email},
                timeout=15,
            )
        except Exception:  # noqa: BLE001 — HR outage must not fail FIN signup
            logging.getLogger(__name__).exception("HR provisioning call failed for %s", subdomain)

    @staticmethod
    def _seed_finance(schema_name: str, company_name: str) -> None:
        from datetime import date
        from apps.masters.coa_template import seed_coa
        from apps.masters.models import Company, FiscalYear

        with schema_context(schema_name):
            company, created = Company.objects.get_or_create(
                name=company_name,
                defaults={"legal_name": company_name, "base_currency": "INR"},
            )
            if created:
                seed_coa(company)
            today = date.today()
            if today.month >= 4:
                start, end = date(today.year, 4, 1), date(today.year + 1, 3, 31)
            else:
                start, end = date(today.year - 1, 4, 1), date(today.year, 3, 31)
            fy_name = f"FY{str(start.year)[-2:]}-{str(end.year)[-2:]}"
            FiscalYear.objects.get_or_create(
                company=company,
                name=fy_name,
                defaults={"start_date": start, "end_date": end, "is_active": True},
            )
