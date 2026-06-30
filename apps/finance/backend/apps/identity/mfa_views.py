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
        if not mfa_service.mfa_required_for_user(user):
            return Response({"detail": "Two-factor sign-in is not enabled for this workspace."}, status=400)
        if not mfa_service.verify_totp(user, code):
            return Response({"detail": "Invalid verification code."}, status=401)

        return Response(issue_auth_tokens(user))


class MfaResendView(APIView):
    """POST /auth/mfa/resend/  { challenge_token } → send a fresh email OTP."""

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        token = (request.data.get("challenge_token") or "").strip()
        if not token:
            return Response({"detail": "challenge_token is required."}, status=400)

        user, err = _user_from_challenge(token, {"verify"})
        if err:
            return err
        if not mfa_service.mfa_required_for_user(user):
            return Response({"detail": "Two-factor sign-in is not enabled for this workspace."}, status=400)

        from .login_otp import issue_and_send_login_otp

        workspace_name = ""
        try:
            from apps.core.models import Tenant

            t = (
                Tenant.objects.exclude(schema_name="public")
                .filter(billing_email__iexact=user.email)
                .first()
            )
            if t:
                workspace_name = t.name
        except Exception:  # noqa: BLE001
            pass

        try:
            issue_and_send_login_otp(user, workspace_name=workspace_name)
        except Exception:
            return Response(
                {"detail": "Could not send verification email. Check SMTP settings."},
                status=503,
            )
        return Response({"detail": "A new verification code was sent to your email."})


class MfaSetupStartView(APIView):
    """Legacy — login uses workspace email OTP; no authenticator enrollment."""

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        return Response(
            {"detail": "Authenticator setup is not required. Check your email for the sign-in code."},
            status=400,
        )


class MfaSetupConfirmView(APIView):
    """Legacy — login uses workspace email OTP; no authenticator enrollment."""

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        return Response(
            {"detail": "Authenticator setup is not required. Check your email for the sign-in code."},
            status=400,
        )
