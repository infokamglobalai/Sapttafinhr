"""Email delivery helpers for HR notifications."""
from __future__ import annotations

from django.conf import settings


def smtp_configured() -> bool:
    """True when outbound email is configured (not console/dummy backend)."""
    backend = getattr(settings, "EMAIL_BACKEND", "") or ""
    if any(b in backend for b in ("console", "dummy", "locmem")):
        return False
    if "smtp" not in backend.lower() and "anymail" not in backend.lower():
        return False
    host = getattr(settings, "EMAIL_HOST", "") or ""
    return bool(host.strip()) or "anymail" in backend.lower()


def smtp_status_message() -> str:
    if smtp_configured():
        return "Invite emails will be sent automatically."
    return (
        "SMTP is not configured — invite links are shown on screen only. "
        "Configure email in Settings or share links manually (WhatsApp, etc.)."
    )
