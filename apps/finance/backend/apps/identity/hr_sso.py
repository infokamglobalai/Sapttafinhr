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


class HrStatsView(APIView):
    """GET /api/v1/auth/hr-stats/?workspace= → proxy HR's KPI JSON.

    The SPA can't hold the shared secret, so FIN forwards (server-to-server, with
    the Bearer secret) to HR's internal stats endpoint and relays the JSON. Lets
    the unified shell show live HR KPIs without exposing HR as a public REST API.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        secret = getattr(settings, "SSO_SHARED_SECRET", "")
        base = getattr(settings, "HR_INTERNAL_BASE_URL", "")
        if not (secret and base):
            return Response({"detail": "HR stats not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        workspace = (request.query_params.get("workspace") or "").strip()
        try:
            import requests

            resp = requests.get(
                f"{base.rstrip('/')}/internal/stats/",
                params={"workspace": workspace},
                headers={
                    "Authorization": f"Bearer {secret}",
                    # HR dev ALLOWED_HOSTS only accepts localhost/*.localhost, so
                    # present a Host it trusts (we target it by service DNS).
                    "Host": "localhost",
                },
                timeout=10,
            )
        except Exception:  # noqa: BLE001 — HR down shouldn't 500 the SPA
            return Response({"detail": "HR is unavailable."}, status=status.HTTP_502_BAD_GATEWAY)

        if resp.status_code != 200:
            return Response({"detail": "HR stats unavailable."}, status=resp.status_code)
        return Response(resp.json())
