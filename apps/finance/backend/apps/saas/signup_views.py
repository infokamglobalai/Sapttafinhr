"""Public self-serve signup → provisions a new workspace (tenant).

For a new customer choosing a plan on the website this creates, *synchronously*
and fast:
  - the owner User (lives in the public/shared schema)
  - a Tenant ROW (status PENDING) + its Domain ({workspace}.host) for routing

…then hands the slow part — building the tenant's Postgres schema (migrations),
seeding the finance company/COA/fiscal-year, the Subscription/entitlements, and
the HR backend call — to a Celery task (apps.saas.tasks.provision_workspace).

This keeps the signup request well under any proxy/load-balancer timeout: it
returns JWT tokens + the workspace slug immediately (HTTP 202) while the worker
provisions in the background. The SPA polls ``/saas/provisioning-status/`` until
the schema is READY, then routes the user into the app.

If the broker can't be reached at enqueue time, provisioning falls back to
running inline (HTTP 201) so signup still works on a misconfigured box.
"""
from __future__ import annotations

import logging
import re

from django.db import IntegrityError
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Domain, Tenant
from apps.identity.models import User
from .models import ProductCode, Subscription
from .tasks import provision_workspace, run_provision

log = logging.getLogger(__name__)

# Reserved schema names that must never be used for a customer workspace.
RESERVED = {"public", "www", "admin", "api", "app", "static", "media", "hr"}

# Plan id (from the website) → products granted.
PLAN_PRODUCTS = {
    # Current per-seat pricing model (Jun 2026)
    "hrms": [ProductCode.HR],
    "finance": [ProductCode.FIN],
    "saptta-complete": [ProductCode.FIN, ProductCode.HR],
    # Legacy tier ids — kept so older signup links still provision correctly.
    "hrms-starter": [ProductCode.HR],
    "hrms-pro": [ProductCode.HR],
    "finance-starter": [ProductCode.FIN],
    "finance-pro": [ProductCode.FIN],
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


def _base_domain_for(request) -> str:
    """Derive the tenant's domain suffix from the request host."""
    request_host = request.get_host().split(":")[0].lower()
    if request_host in ("localhost", "127.0.0.1") or request_host.startswith("192.168."):
        return "localhost"
    parts = request_host.split(".")
    if len(parts) >= 3 and parts[0] in ("app", "www", "platform"):
        return ".".join(parts[1:])
    return request_host


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
    country = serializers.CharField(max_length=2, required=False, default="IN")
    terms_accepted = serializers.BooleanField()


class SignupView(APIView):
    """POST /api/v1/saas/signup/ — create the account and kick off provisioning."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        ser = SignupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        if not data.get("terms_accepted"):
            return Response(
                {"detail": "You must accept the Terms of Service and Privacy Policy."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=data["email"]).exists():
            return Response(
                {"detail": "An account with this email already exists. Please sign in."},
                status=status.HTTP_409_CONFLICT,
            )

        products = _resolve_products(data.get("plan_id", ""), data.get("products"))
        country = data.get("country") or "IN"
        plan_id = data.get("plan_id") or "saptta-complete"
        schema_name = _unique_schema_name(_slugify_company(data["company_name"]))

        # 1) Owner user (public/shared schema), created first so an email race
        #    is rejected before we provision anything. Email must be verified
        #    before login when REQUIRE_EMAIL_VERIFICATION is enabled (default in prod).
        from django.conf import settings
        try:
            user = User.objects.create_user(
                email=data["email"],
                password=data["password"],
                full_name=data.get("full_name", ""),
                is_verified=not getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True),
            )
        except IntegrityError:
            return Response(
                {"detail": "An account with this email already exists. Please sign in."},
                status=status.HTTP_409_CONFLICT,
            )

        from apps.identity.auth_views import send_verification_email

        try:
            send_verification_email(user)
        except Exception:  # noqa: BLE001 — signup succeeds; user can resend OTP
            log.exception("Could not send verification email to %s", user.email)

        # 2) Tenant ROW only — defer the slow schema build to the worker. Setting
        #    auto_create_schema=False makes save() a plain, fast INSERT.
        tenant = Tenant(
            schema_name=schema_name,
            name=data["company_name"],
            billing_email=data["email"],
            provision_status=Tenant.ProvisionStatus.PENDING,
        )
        tenant.auto_create_schema = False
        try:
            tenant.save()
        except Exception:  # noqa: BLE001 — don't leave an orphan user behind
            user.delete()
            raise

        Domain.objects.get_or_create(
            domain=f"{schema_name}.{_base_domain_for(request)}",
            tenant=tenant,
            defaults={"is_primary": True},
        )

        # 3) Provision in the background. Fall back to inline if the broker is
        #    unreachable (e.g. a box without a running worker), so signup still
        #    completes — just synchronously, the old way.
        product_codes = [str(p) for p in products]
        provisioning = True
        try:
            provision_workspace.delay(tenant.pk, plan_id, product_codes, country)
        except Exception:  # noqa: BLE001 — broker down: provision inline
            log.exception("Could not enqueue provisioning for %s; running inline", schema_name)
            run_provision(tenant.pk, plan_id, product_codes, country)
            provisioning = False

        tenant.refresh_from_db(fields=["provision_status"])

        # 4) Tokens for immediate sign-in. Products are filled in by the SPA once
        #    provisioning is READY (poll → refresh), so they're empty here.
        #    Use the workspace-aware serializer so the token carries the tenant
        #    claim — the Finance app resolves the tenant from this claim, and
        #    without it every tenant API call falls back to the public schema.
        from apps.identity.jwt import SapttaTokenObtainPairSerializer

        refresh = SapttaTokenObtainPairSerializer.get_token(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "workspace": schema_name,
                "provisioning": provisioning,
                "status": tenant.provision_status,
                "products": [],
                "requires_email_verification": True,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "is_verified": user.is_verified,
                },
            },
            status=status.HTTP_202_ACCEPTED if provisioning else status.HTTP_201_CREATED,
        )


class ProvisioningStatusView(APIView):
    """GET /api/v1/saas/provisioning-status/ — has this user's workspace finished
    building? Polled by the SPA right after signup."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.identity.jwt import resolve_workspace_for

        schema = resolve_workspace_for(request.user)
        tenant = Tenant.objects.filter(schema_name=schema).first() if schema else None
        if not tenant:
            # No tenant to wait on (e.g. an admin user): treat as ready.
            return Response({"workspace": schema, "status": "READY", "ready": True,
                             "failed": False, "products": []})

        ready = tenant.provision_status == Tenant.ProvisionStatus.READY
        failed = tenant.provision_status == Tenant.ProvisionStatus.FAILED

        products: list[str] = []
        if ready:
            sub = (
                Subscription.objects.filter(tenant=tenant)
                .prefetch_related("entitlements")
                .first()
            )
            if sub:
                products = [
                    PRODUCT_TO_SLUG[e.product]
                    for e in sub.entitlements.all()
                    if e.is_active and e.product in PRODUCT_TO_SLUG
                ]

        return Response({
            "workspace": tenant.schema_name,
            "status": tenant.provision_status,
            "ready": ready,
            "failed": failed,
            "products": products,
        })
