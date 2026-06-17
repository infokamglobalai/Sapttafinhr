"""Hand sign-in back to the Saptta platform.

HR has no login of its own anymore: the unified platform (apps/web) is the single
sign-on surface. When an unauthenticated user reaches HR we bounce them to the
platform login with ?redirect=hr; after authenticating there the platform mints
an SSO token and lands the user back here already signed in (see sso.sso_login).

The platform origin is remembered per session (from ?platform= on SSO, Referer,
or dev settings) so native Vite (:5173) and Docker (:8080) both work without
hard-coding ports in every environment file.
"""
from __future__ import annotations

from urllib.parse import urlencode, urlparse

from django.conf import settings
from django.http import HttpRequest

SESSION_KEY = "saptta_platform_origin"
NATIVE_PLATFORM_PORTS = frozenset({"5173", "5175"})


def remember_platform_origin(request: HttpRequest, origin: str | None = None) -> None:
    """Persist the marketing-site origin for later cross-product links."""
    candidate = (origin or request.GET.get("platform") or "").strip()
    if not candidate:
        referer = request.META.get("HTTP_REFERER", "")
        if referer:
            parsed = urlparse(referer)
            if parsed.scheme and parsed.netloc:
                port = parsed.port or (443 if parsed.scheme == "https" else 80)
                if (
                    parsed.hostname in ("localhost", "127.0.0.1")
                    or str(port) in NATIVE_PLATFORM_PORTS
                    or str(port) == "8080"
                ):
                    candidate = f"{parsed.scheme}://{parsed.netloc}"
    if candidate.startswith("http"):
        request.session[SESSION_KEY] = candidate.rstrip("/")


def platform_base_for_request(request: HttpRequest | None = None) -> str:
    if request is not None:
        stored = request.session.get(SESSION_KEY)
        if stored:
            return str(stored).rstrip("/")

    configured = getattr(settings, "PLATFORM_BASE_URL", "http://localhost:8080").rstrip("/")
    if getattr(settings, "DEBUG", False) and configured.rstrip("/") == "http://localhost:8080":
        return "http://127.0.0.1:5173"
    return configured


def platform_login_url(redirect_to: str = "hr", request: HttpRequest | None = None) -> str:
    """Absolute URL of the platform login, asking it to return to `redirect_to`."""
    return f"{platform_base_for_request(request)}/login?{urlencode({'redirect': redirect_to})}"


def platform_switcher_url(request: HttpRequest | None = None) -> str:
    """Absolute URL of the platform product switcher (landing after login)."""
    return f"{platform_base_for_request(request)}/app"


def platform_logout_url(request: HttpRequest | None = None) -> str:
    """Absolute URL of the platform's single full-logout endpoint."""
    return f"{platform_base_for_request(request)}/logout"


def platform_forgot_password_url(request: HttpRequest | None = None) -> str:
    """Absolute URL of the platform's forgot password page."""
    return f"{platform_base_for_request(request)}/forgot-password"
