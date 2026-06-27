"""Shared auth gate helpers."""
from __future__ import annotations

from django.conf import settings
from rest_framework.response import Response


def email_verification_block_response(user) -> Response | None:
    """Return a 403 when login/MFA must wait on email verification."""
    if getattr(settings, "REQUIRE_EMAIL_VERIFICATION", False) and not getattr(
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
