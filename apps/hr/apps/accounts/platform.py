"""Hand sign-in back to the Saptta platform.

HR has no login of its own anymore: the unified platform (apps/web) is the single
sign-on surface. When an unauthenticated user reaches HR we bounce them to the
platform login with ?redirect=hr; after authenticating there the platform mints
an SSO token and lands the user back here already signed in (see sso.sso_login).
"""
from __future__ import annotations

from urllib.parse import urlencode

from django.conf import settings


def _platform_base() -> str:
    return getattr(settings, "PLATFORM_BASE_URL", "http://localhost:8080").rstrip("/")


def platform_login_url(redirect_to: str = "hr") -> str:
    """Absolute URL of the platform login, asking it to return to `redirect_to`."""
    return f"{_platform_base()}/login?{urlencode({'redirect': redirect_to})}"


def platform_switcher_url() -> str:
    """Absolute URL of the platform product switcher (landing after login)."""
    return f"{_platform_base()}/app"


def platform_logout_url() -> str:
    """Absolute URL of the platform's single full-logout endpoint.

    HR logout clears its own (HR-origin) session, then sends the user here so the
    platform session — which HR can't clear cross-origin — is ended too.
    """
    return f"{_platform_base()}/logout"
