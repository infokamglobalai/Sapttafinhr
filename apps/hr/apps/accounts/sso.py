"""HR SSO login — verifies a short-lived token minted by the FIN backend."""
import hmac
import hashlib
import time
import logging

from django.conf import settings
from django.contrib.auth import login
from django.http import HttpResponseBadRequest
from django.shortcuts import redirect

from .models import User

logger = logging.getLogger(__name__)

_TOKEN_TTL_SECONDS = 120


def _verify_token(token: str) -> str | None:
    """Return the email encoded in the token, or None if invalid/expired."""
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        logger.warning("SSO_SHARED_SECRET not configured — SSO disabled")
        return None
    try:
        # Format: <timestamp>:<email>:<hmac>
        parts = token.split(":", 2)
        if len(parts) != 3:
            return None
        ts_str, email, sig = parts
        ts = int(ts_str)
        if abs(time.time() - ts) > _TOKEN_TTL_SECONDS:
            return None
        expected = hmac.new(
            secret.encode(), f"{ts_str}:{email}".encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return None
        return email
    except Exception:
        return None


def sso_login(request):
    """GET /auth/sso/?token=<token>&next=<path>

    Validates the FIN-issued SSO token, creates a Django session for the
    matching HR user, and redirects to `next` (default: /).
    """
    token = request.GET.get("token", "")
    next_url = request.GET.get("next", "/")

    email = _verify_token(token)
    if not email:
        return HttpResponseBadRequest("Invalid or expired SSO token.")

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return HttpResponseBadRequest(f"No HR account found for {email}.")

    # Log the user in using the default authentication backend
    user.backend = "django.contrib.auth.backends.ModelBackend"
    login(request, user)
    logger.info("SSO login: %s", email)
    return redirect(next_url)
