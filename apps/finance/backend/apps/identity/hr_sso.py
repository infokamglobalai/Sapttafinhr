"""Mint an HR single-sign-on handoff token for the authenticated FIN user.

Also proxies HR staff login so employees/managers can sign in at the unified
platform login page (localhost:8080/login) without a separate Finance account.
"""
from __future__ import annotations

from django.conf import settings
from django.core.signing import TimestampSigner
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
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

        # Resolve the workspace from the authenticated user's identity rather than
        # blindly trusting the client. A stale or default ('acme') localStorage
        # workspace would otherwise mint a token for a tenant where this user has
        # no HR account → HR's SSO can't match → the "Couldn't open Saptta HR"
        # bounce-back loop. We honour a client-supplied workspace only when the
        # user actually owns it; otherwise we use the one resolved from identity.
        from apps.core.models import Tenant

        from .jwt import resolve_workspace_for

        requested = (request.data.get("workspace") or "").strip().lower()
        resolved = (resolve_workspace_for(request.user) or "").strip().lower()
        owned = set(
            Tenant.objects.exclude(schema_name="public")
            .filter(billing_email__iexact=request.user.email)
            .values_list("schema_name", flat=True)
        )
        workspace = requested if requested in owned else (resolved or requested)

        # Payload binds the FIN user's email to the resolved workspace.
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


class HrStaffLoginView(APIView):
    """POST /api/v1/auth/hr-staff-login/  → verify HR credentials, return SSO redirect.

    Used by the platform SPA when FIN login fails — employees and team leads sign
    in with the same page as company owners, then redirect into HR via SSO.
    """

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        secret = getattr(settings, "SSO_SHARED_SECRET", "")
        base = getattr(settings, "HR_INTERNAL_BASE_URL", "")
        if not (secret and base):
            return Response(
                {"detail": "HR staff login is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        workspace = (request.data.get("workspace") or "").strip().lower()
        platform_url = (request.data.get("platform_url") or request.build_absolute_uri("/")).rstrip("/")
        next_path = (request.data.get("next") or "/").strip() or "/"

        if not email or not password:
            return Response({"detail": "email and password are required."}, status=400)

        try:
            import requests

            resp = requests.post(
                f"{base.rstrip('/')}/internal/staff-login/",
                json={
                    "email": email,
                    "password": password,
                    "workspace": workspace,
                    "platform_url": platform_url,
                    "next": next_path,
                },
                headers={
                    "Authorization": f"Bearer {secret}",
                    "Content-Type": "application/json",
                    "Host": "localhost",
                },
                timeout=15,
            )
        except Exception:
            return Response({"detail": "HR is unavailable."}, status=status.HTTP_502_BAD_GATEWAY)

        if resp.status_code != 200:
            try:
                detail = resp.json().get("detail", "Invalid credentials.")
            except Exception:
                detail = "Invalid credentials."
            code = status.HTTP_401_UNAUTHORIZED if resp.status_code in (401, 403) else resp.status_code
            return Response({"detail": detail}, status=code)

        data = resp.json()
        if data.get("mfa_required"):
            return Response(data)
        return Response(
            {
                "redirect_url": data.get("redirect_url"),
                "workspace": data.get("workspace"),
                "auth_type": "hr_staff",
            }
        )


def _proxy_hr_internal(path: str, payload: dict, *, timeout: int = 15):
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    base = getattr(settings, "HR_INTERNAL_BASE_URL", "")
    if not (secret and base):
        return None, Response(
            {"detail": "HR staff login is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    try:
        import requests

        resp = requests.post(
            f"{base.rstrip('/')}{path}",
            json=payload,
            headers={
                "Authorization": f"Bearer {secret}",
                "Content-Type": "application/json",
                "Host": "localhost",
            },
            timeout=timeout,
        )
    except Exception:
        return None, Response({"detail": "HR is unavailable."}, status=status.HTTP_502_BAD_GATEWAY)
    return resp, None


class HrStaffLoginMfaView(APIView):
    """POST /api/v1/auth/hr-staff-login/mfa/ — complete HR staff login after TOTP."""

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        platform_url = (request.data.get("platform_url") or request.build_absolute_uri("/")).rstrip("/")
        payload = {
            "challenge_token": (request.data.get("challenge_token") or "").strip(),
            "code": (request.data.get("code") or "").strip(),
            "platform_url": platform_url,
            "next": (request.data.get("next") or "/").strip() or "/",
        }
        action = (request.data.get("action") or "verify").strip().lower()
        if action == "setup_start":
            path = "/internal/staff-login/mfa/setup/start/"
            payload = {"challenge_token": payload["challenge_token"]}
        elif action == "setup_confirm":
            path = "/internal/staff-login/mfa/setup/confirm/"
        else:
            path = "/internal/staff-login/mfa/"

        resp, err = _proxy_hr_internal(path, payload)
        if err:
            return err
        if resp.status_code != 200:
            try:
                detail = resp.json().get("detail", "Invalid verification code.")
            except Exception:
                detail = "Invalid verification code."
            code = status.HTTP_401_UNAUTHORIZED if resp.status_code in (401, 403) else resp.status_code
            return Response({"detail": detail}, status=code)
        return Response(resp.json())
