"""MFA verification and enrollment endpoints (platform login)."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import mfa as mfa_service
from .auth_helpers import email_verification_block_response
from .tokens import issue_auth_tokens

User = get_user_model()


def _user_from_challenge(token: str, allowed_purposes: set[str]):
    parsed = mfa_service.unsign_login_challenge(token)
    if not parsed:
        return None, Response({"detail": "Challenge expired or invalid."}, status=400)
    user_id, purpose = parsed
    if purpose not in allowed_purposes:
        return None, Response({"detail": "Invalid challenge."}, status=400)
    user = User.objects.filter(pk=user_id, is_active=True).first()
    if user is None:
        return None, Response({"detail": "User not found."}, status=404)
    return user, None


class MfaVerifyLoginView(APIView):
    """POST /auth/mfa/verify/  { challenge_token, code } → JWT."""

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        token = (request.data.get("challenge_token") or "").strip()
        code = (request.data.get("code") or "").strip()
        if not token or not code:
            return Response({"detail": "challenge_token and code are required."}, status=400)

        user, err = _user_from_challenge(token, {"verify"})
        if err:
            return err
        blocked = email_verification_block_response(user)
        if blocked:
            return blocked
        if not mfa_service.user_needs_mfa_verify(user):
            return Response({"detail": "MFA is not enabled for this account."}, status=400)
        if not mfa_service.verify_totp(user, code):
            return Response({"detail": "Invalid verification code."}, status=401)

        return Response(issue_auth_tokens(user))


class MfaSetupStartView(APIView):
    """POST /auth/mfa/setup/start/  { challenge_token } → QR + provisioning URI."""

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        token = (request.data.get("challenge_token") or "").strip()
        if not token:
            return Response({"detail": "challenge_token is required."}, status=400)

        user, err = _user_from_challenge(token, {"setup"})
        if err:
            return err
        if not mfa_service.user_needs_mfa_setup(user):
            return Response({"detail": "MFA is already enabled."}, status=400)

        secret = mfa_service.generate_totp_secret()
        mfa_service.store_totp_secret(user, secret, enabled=False)
        uri = mfa_service.provisioning_uri(user.email, secret)
        return Response(
            {
                "provisioning_uri": uri,
                "qr_svg": mfa_service.qr_svg(uri),
                "manual_secret": secret,
                "email": user.email,
            }
        )


class MfaSetupConfirmView(APIView):
    """POST /auth/mfa/setup/confirm/  { challenge_token, code } → enable MFA + JWT."""

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        token = (request.data.get("challenge_token") or "").strip()
        code = (request.data.get("code") or "").strip()
        if not token or not code:
            return Response({"detail": "challenge_token and code are required."}, status=400)

        user, err = _user_from_challenge(token, {"setup"})
        if err:
            return err

        secret = mfa_service.read_totp_secret(user)
        if not secret:
            return Response({"detail": "Start MFA setup first."}, status=400)

        ok, backup_codes = mfa_service.enable_mfa(user, secret, code)
        if not ok:
            return Response({"detail": "Invalid verification code."}, status=401)

        blocked = email_verification_block_response(user)
        if blocked:
            return blocked

        payload = issue_auth_tokens(user)
        payload["backup_codes"] = backup_codes
        return Response(payload)
