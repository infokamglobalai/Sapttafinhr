"""Sync workspace security settings to the finance platform."""
from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _finance_headers() -> dict:
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    return {
        "Authorization": f"Bearer {secret}",
        "Host": "localhost",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _finance_base() -> str:
    return getattr(settings, "FIN_INTERNAL_BASE_URL", "").rstrip("/")


def sync_login_otp_to_finance(tenant, *, enabled: bool) -> bool:
    """Mirror HR tenant login_email_otp_enabled to finance Tenant row."""
    base = _finance_base()
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not base or not secret or not tenant:
        return False

    try:
        import requests

        resp = requests.post(
            f"{base}/api/v1/saas/internal/tenant-security/",
            json={
                "workspace": tenant.subdomain,
                "login_email_otp_enabled": bool(enabled),
            },
            headers=_finance_headers(),
            timeout=12,
        )
        if resp.status_code == 404:
            return False
        resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Platform security sync failed for %s", tenant.subdomain)
        return False
