"""Account-safety auth flows: email verification + password reset.

All endpoints are public (AllowAny), live in the public schema, and are
rate-limited via ScopedRateThrottle. Responses never reveal whether an email
exists (enumeration-safe): request endpoints always return 200.

Tokens:
  - Email verification → signing.dumps({uid}) with a salt + max_age (signed,
    tamper-proof, self-expiring; no DB row needed).
  - Email OTP → 6-digit code hashed on the user row (15-minute TTL by default).
  - Password reset → Django's default_token_generator (invalidated when the
    password or last_login changes) + urlsafe-base64 uid, mirroring Django's
    own PasswordReset views but JSON/SPA-friendly.
"""
from __future__ import annotations

import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.mail import send_mail
from django.utils import timezone
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


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def issue_email_verification_otp(user: User) -> str:
    otp = _generate_otp()
    user.email_verify_otp_hash = make_password(otp)
    user.email_verify_otp_sent_at = timezone.now()
    user.save(update_fields=["email_verify_otp_hash", "email_verify_otp_sent_at"])
    return otp


def verify_email_otp(user: User, code: str) -> bool:
    if not user.email_verify_otp_hash or not user.email_verify_otp_sent_at:
        return False
    max_minutes = getattr(settings, "EMAIL_OTP_TIMEOUT_MINUTES", 15)
    if timezone.now() - user.email_verify_otp_sent_at > timedelta(minutes=max_minutes):
        return False
    normalized = (code or "").strip().replace(" ", "")
    return check_password(normalized, user.email_verify_otp_hash)


def mark_user_verified(user: User) -> None:
    user.is_verified = True
    user.email_verify_otp_hash = ""
    user.email_verify_otp_sent_at = None
    user.save(update_fields=["is_verified", "email_verify_otp_hash", "email_verify_otp_sent_at"])


def send_verification_email(user: User) -> None:
    token = signing.dumps({"uid": user.pk}, salt=VERIFY_SALT)
    link = _frontend(f"/verify-email?token={token}")
    otp = issue_email_verification_otp(user)
    otp_minutes = getattr(settings, "EMAIL_OTP_TIMEOUT_MINUTES", 15)
    link_hours = settings.EMAIL_VERIFICATION_TIMEOUT_HOURS
    send_mail(
        subject="Verify your Saptta account",
        message=(
            f"Hi {user.full_name or user.email},\n\n"
            f"Your verification code is: {otp}\n"
            f"(expires in {otp_minutes} minutes)\n\n"
            f"Enter this code on the signup page, or confirm using this link:\n{link}\n"
            f"(link expires in {link_hours} hours)\n\n"
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
            {"detail": "If that account exists and is unverified, a verification code has been sent."}
        )


class VerifyEmailConfirmView(APIView):
    """POST {token} OR {email, code} → mark the account verified."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "email_verify"

    class InputSerializer(serializers.Serializer):
        token = serializers.CharField(required=False, allow_blank=True)
        email = serializers.EmailField(required=False, allow_blank=True)
        code = serializers.CharField(required=False, allow_blank=True)

    def post(self, request):
        ser = self.InputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        token = (ser.validated_data.get("token") or "").strip()
        email = (ser.validated_data.get("email") or "").strip()
        code = (ser.validated_data.get("code") or "").strip()

        if token:
            max_age = settings.EMAIL_VERIFICATION_TIMEOUT_HOURS * 3600
            try:
                data = signing.loads(token, salt=VERIFY_SALT, max_age=max_age)
            except signing.SignatureExpired:
                return Response(
                    {"detail": "This verification link has expired."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except signing.BadSignature:
                return Response(
                    {"detail": "Invalid verification link."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.filter(pk=data.get("uid")).first()
            if not user:
                return Response(
                    {"detail": "Invalid verification link."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif email and code:
            user = User.objects.filter(email__iexact=email).first()
            if user is None or not verify_email_otp(user, code):
                return Response(
                    {"detail": "Invalid or expired verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"detail": "Provide either token or email and code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_verified:
            mark_user_verified(user)
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

        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            validate_password(d["new_password"], user=user)
        except DjangoValidationError as e:
            return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(d["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password has been reset. You can now sign in."})
