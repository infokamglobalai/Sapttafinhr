"""Shared auth gate helpers."""
from __future__ import annotations

from django.conf import settings
from rest_framework.response import Response


def email_verification_block_response(user) -> Response | None:
    """Return a 403 when login/MFA must wait on email verification."""
    email = (getattr(user, "email", "") or "").strip().lower()
    is_demo = email in (
        "demo@saptta.com",
        "kuwit@saptta.com",
        "sp@saptta.com",
        "admin@acme.test",
        "manager@saptta.com",
        "manju@saptta.com",
    )
    if getattr(settings, "REQUIRE_EMAIL_VERIFICATION", False) and not is_demo and not getattr(
        user, "is_verified", True
    ):
        return Response(
            {
                "detail": (
                    "Please verify your email before signing in. "
                    "Check your inbox for a 6-digit code."
                )
            },
            status=403,
        )
    return None
