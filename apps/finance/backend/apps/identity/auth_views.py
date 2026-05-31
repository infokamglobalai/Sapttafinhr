"""Account-safety auth flows: email verification + password reset.

All endpoints are public (AllowAny), live in the public schema, and are
rate-limited via ScopedRateThrottle. Responses never reveal whether an email
exists (enumeration-safe): request endpoints always return 200.

Tokens:
  - Email verification → signing.dumps({uid}) with a salt + max_age (signed,
    tamper-proof, self-expiring; no DB row needed).
  - Password reset → Django's default_token_generator (invalidated when the
    password or last_login changes) + urlsafe-base64 uid, mirroring Django's
    own PasswordReset views but JSON/SPA-friendly.
"""
from __future__ import annotations

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User

VERIFY_SALT = "identity.email-verify"


# ──────────────────────────── helpers ────────────────────────────
def _frontend(path: str) -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}{path}"


def send_verification_email(user: User) -> None:
    token = signing.dumps({"uid": user.pk}, salt=VERIFY_SALT)
    link = _frontend(f"/verify-email?token={token}")
    send_mail(
        subject="Verify your Saptta account",
        message=(
            f"Hi {user.full_name or user.email},\n\n"
            f"Confirm your email to finish setting up your Saptta account:\n{link}\n\n"
            f"This link expires in {settings.EMAIL_VERIFICATION_TIMEOUT_HOURS} hours.\n"
            "If you didn't sign up, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user: User) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = _frontend(f"/reset-password?uid={uid}&token={token}")
    send_mail(
        subject="Reset your Saptta password",
        message=(
            f"Hi {user.full_name or user.email},\n\n"
            f"Reset your Saptta password using the link below:\n{link}\n\n"
            "If you didn't request this, you can safely ignore this email — "
            "your password won't change."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


# ──────────────────────── email verification ─────────────────────
class EmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyEmailRequestView(APIView):
    """POST {email} → (re)send a verification link. Enumeration-safe."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "email_verify"

    def post(self, request):
        ser = EmailSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=ser.validated_data["email"]).first()
        if user and not user.is_verified:
            send_verification_email(user)
        return Response(
            {"detail": "If that account exists and is unverified, a link has been sent."}
        )


class VerifyEmailConfirmView(APIView):
    """POST {token} → mark the account verified."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "email_verify"

    class InputSerializer(serializers.Serializer):
        token = serializers.CharField()

    def post(self, request):
        ser = self.InputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        max_age = settings.EMAIL_VERIFICATION_TIMEOUT_HOURS * 3600
        try:
            data = signing.loads(ser.validated_data["token"], salt=VERIFY_SALT, max_age=max_age)
        except signing.SignatureExpired:
            return Response({"detail": "This verification link has expired."}, status=status.HTTP_400_BAD_REQUEST)
        except signing.BadSignature:
            return Response({"detail": "Invalid verification link."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(pk=data.get("uid")).first()
        if not user:
            return Response({"detail": "Invalid verification link."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=["is_verified"])
        return Response({"detail": "Email verified.", "email": user.email})


# ───────────────────────── password reset ────────────────────────
class PasswordResetRequestView(APIView):
    """POST {email} → send a reset link. Always 200 (enumeration-safe)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "password_reset"

    def post(self, request):
        ser = EmailSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=ser.validated_data["email"], is_active=True
        ).first()
        if user:
            send_password_reset_email(user)
        return Response({"detail": "If that account exists, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    """POST {uid, token, new_password} → set a new password."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "password_reset"

    class InputSerializer(serializers.Serializer):
        uid = serializers.CharField()
        token = serializers.CharField()
        new_password = serializers.CharField(min_length=8)

    def post(self, request):
        ser = self.InputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        try:
            pk = force_str(urlsafe_base64_decode(d["uid"]))
            user = User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, d["token"]):
            return Response(
                {"detail": "This reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate against AUTH_PASSWORD_VALIDATORS.
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            validate_password(d["new_password"], user=user)
        except DjangoValidationError as e:
            return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(d["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password has been reset. You can now sign in."})
