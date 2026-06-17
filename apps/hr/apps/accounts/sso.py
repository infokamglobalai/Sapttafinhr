"""HR single-sign-on handoff from the FIN platform.

The unified front door authenticates the user once (FIN JWT). To avoid a second
login for the embedded HR app, FIN mints a short-lived token signed with a
secret SHARED by both backends (SSO_SHARED_SECRET). HR verifies it here and
starts a normal Django session for the matching tenant user.

Security model:
  - Token = TimestampSigner(secret).sign(payload) — tamper-proof + self-expiring.
  - Payload carries the user's email + the workspace (tenant subdomain).
  - Short TTL (default 120s): the token is exchanged immediately for a session.
  - The HR user must already exist for that tenant (provisioned at signup);
    SSO never creates users — it only authenticates existing ones.

If SSO_SHARED_SECRET is unset, the endpoint 503s and the user falls back to the
normal HR login form (no regression).
"""
from __future__ import annotations

import logging
from django.conf import settings
from django.contrib.auth import get_user_model, login
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .platform import platform_login_url, remember_platform_origin

logger = logging.getLogger(__name__)
User = get_user_model()

SSO_SALT = "saptta.hr-sso"


def _signer() -> TimestampSigner | None:
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        return None
    return TimestampSigner(key=secret, salt=SSO_SALT)


@csrf_exempt
@require_http_methods(["GET"])
def sso_login(request):
    """GET /auth/sso/?token=...  → verify the handoff token and start a session.

    On success redirects into the HR dashboard (or ?next=). On any failure,
    falls through to the normal login page so the user is never hard-blocked.
    """
    signer = _signer()
    if signer is None:
        logger.warning("SSO_SHARED_SECRET not configured — SSO disabled")
        return HttpResponse(
            "SSO is not configured on this server.", status=503, content_type="text/plain"
        )

    token = request.GET.get("token", "")
    remember_platform_origin(request)
    if not token:
        return _fallback(request, "Missing SSO token.")

    max_age = getattr(settings, "SSO_TOKEN_MAX_AGE_SECONDS", 120)
    try:
        raw = signer.unsign(token, max_age=max_age)
    except SignatureExpired:
        return _fallback(request, "This sign-in link has expired. Please try again.")
    except BadSignature:
        return _fallback(request, "Invalid sign-in link.")

    # payload = "email|workspace"
    try:
        email, workspace = raw.split("|", 1)
    except ValueError:
        return _fallback(request, "Malformed SSO token.")

    # The tenant is resolved by HR's middleware (request.tenant). On the dev
    # `localhost` host it falls back to the user's own tenant, so match by
    # email scoped to the resolved tenant when present, else by workspace.
    tenant = getattr(request, "tenant", None)
    user = None
    if tenant is not None:
        user = User.objects.filter(email__iexact=email, tenant=tenant).first()
    if user is None:
        user = (
            User.objects.filter(email__iexact=email, tenant__subdomain=workspace).first()
        )
    if user is None or not user.is_active:
        return _fallback(request, "No matching HR account for this workspace.")

    login(request, user, backend="apps.accounts.backends.TenantAuthBackend")
    remember_platform_origin(request)
    logger.info("SSO login: %s", email)
    next_url = request.GET.get("next") or "/"
    return HttpResponseRedirect(next_url)


def _fallback(request, message: str):
    """SSO couldn't establish a session — send the user back to the single
    platform login (HR has no login of its own) rather than hard-failing."""
    logger.info("SSO fallback to platform login: %s", message)
    return HttpResponseRedirect(platform_login_url("hr", request))
