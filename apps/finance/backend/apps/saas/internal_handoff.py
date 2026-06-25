"""Server-to-server product handoff for HR → Finance.

HR calls with SSO_SHARED_SECRET to mint a FIN JWT pair for the workspace owner
and return a Finance SPA URL with ?handoff= — the same mechanism the marketing
shell uses. Gated on an active FIN entitlement.
"""
from __future__ import annotations

import hmac
from urllib.parse import quote

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from rest_framework_simplejwt.tokens import RefreshToken

from apps.identity.models import User
from apps.saas.models import ProductCode, Subscription, SubscriptionEntitlement

from .internal_billing import _lookup


def _authorized(request) -> bool:
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        return False
    header = request.headers.get("Authorization", "")
    presented = header[7:] if header.startswith("Bearer ") else ""
    return bool(presented) and hmac.compare_digest(presented, secret)


def _active_products(sub: Subscription) -> list[str]:
    return [
        e.product
        for e in sub.entitlements.all()
        if e.status in SubscriptionEntitlement.ACTIVE_STATUSES
    ]


def _finance_app_url(workspace: str) -> str:
    template = (
        getattr(settings, "FINANCE_APP_BASE_URL", "")
        or "http://{workspace}.localhost:8080"
    )
    if "{workspace}" in template:
        return template.replace("{workspace}", workspace).rstrip("/")
    return template.rstrip("/")


def _mint_handoff_url(*, user: User, workspace: str, platform_url: str) -> str:
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    access["email"] = user.email
    access["full_name"] = getattr(user, "full_name", "")
    access["workspace"] = workspace

    access_s = quote(str(access), safe="")
    refresh_s = quote(str(refresh), safe="")
    platform_q = quote(platform_url.rstrip("/"), safe="")
    base = _finance_app_url(workspace)
    return f"{base}/?handoff={access_s}~{refresh_s}&platform={platform_q}"


@require_http_methods(["GET"])
def finance_handoff(request):
    """GET /api/v1/saas/internal/finance-handoff/?workspace=&email=&platform_url="""
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    workspace = (request.GET.get("workspace") or "").strip().lower()
    email = (request.GET.get("email") or "").strip().lower()
    platform_url = (request.GET.get("platform_url") or "http://localhost:8080").strip()

    if not workspace or not email:
        return JsonResponse({"detail": "workspace and email are required."}, status=400)

    tenant, sub = _lookup(workspace)
    if not tenant:
        return JsonResponse({"detail": "Unknown workspace."}, status=404)
    if not sub:
        return JsonResponse({"detail": "No subscription found for this workspace."}, status=404)

    products = _active_products(sub)
    has_fin = ProductCode.FIN in products
    has_hr = ProductCode.HR in products

    if not has_fin:
        return JsonResponse(
            {
                "has_finance": False,
                "has_hr": has_hr,
                "products": products,
                "detail": "Finance is not on your plan.",
            },
            status=403,
        )

    owner_email = (tenant.billing_email or "").strip().lower()
    if owner_email and email != owner_email:
        return JsonResponse(
            {"detail": "Only the workspace owner can open Finance from HR."},
            status=403,
        )

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if not user:
        return JsonResponse({"detail": "No platform account found for this user."}, status=404)

    return JsonResponse(
        {
            "has_finance": True,
            "has_hr": has_hr,
            "products": products,
            "finance_url": _mint_handoff_url(
                user=user, workspace=workspace, platform_url=platform_url
            ),
        }
    )
