"""Mint an HR single-sign-on handoff token for the authenticated FIN user.

The SPA holds a FIN JWT. To open the embedded HR app without a second login, it
calls this endpoint; we return a short-lived token signed with the secret shared
with the HR backend (SSO_SHARED_SECRET). The SPA points the HR iframe at
  {HR_BASE_URL}/auth/sso/?token=...&next=/
and HR exchanges it for a Django session (see apps/hr/apps/accounts/sso.py).

Returns 503 when SSO isn't configured so the SPA falls back to HR's own login.
"""
from __future__ import annotations

from django.conf import settings
from django.core.signing import TimestampSigner
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

SSO_SALT = "saptta.hr-sso"  # must match HR's sso.py


class HrSsoTokenView(APIView):
    """POST /api/v1/auth/hr-sso-token/  { workspace } → { token }."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        secret = getattr(settings, "SSO_SHARED_SECRET", "")
        if not secret:
            return Response(
                {"detail": "HR single sign-on is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        workspace = (request.data.get("workspace") or "").strip()
        # Payload binds the FIN user's email to the requested workspace.
        payload = f"{request.user.email}|{workspace}"
        token = TimestampSigner(key=secret, salt=SSO_SALT).sign(payload)
        return Response({"token": token})
