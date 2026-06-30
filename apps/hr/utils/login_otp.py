"""Email one-time passcode for login (workspace-controlled 2FA)."""
from __future__ import annotations

import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.utils import timezone


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def issue_login_otp(user) -> str:
    otp = _generate_otp()
    user.login_otp_hash = make_password(otp)
    user.login_otp_sent_at = timezone.now()
    user.save(update_fields=["login_otp_hash", "login_otp_sent_at"])
    return otp


def verify_login_otp(user, code: str) -> bool:
    if not user.login_otp_hash or not user.login_otp_sent_at:
        return False
    max_minutes = getattr(settings, "LOGIN_OTP_TIMEOUT_MINUTES", 10)
    if timezone.now() - user.login_otp_sent_at > timedelta(minutes=max_minutes):
        return False
    normalized = (code or "").strip().replace(" ", "")
    if not normalized.isdigit() or len(normalized) != 6:
        return False
    ok = check_password(normalized, user.login_otp_hash)
    if ok:
        user.login_otp_hash = ""
        user.login_otp_sent_at = None
        user.save(update_fields=["login_otp_hash", "login_otp_sent_at"])
    return ok


def send_login_otp_email(user, otp: str) -> None:
    tenant_name = ""
    if getattr(user, "tenant", None):
        tenant_name = getattr(user.tenant, "name", "") or user.tenant.subdomain
    label = tenant_name or "Saptta"
    minutes = getattr(settings, "LOGIN_OTP_TIMEOUT_MINUTES", 10)
    send_mail(
        subject=f"Your {label} sign-in code",
        message=(
            f"Hi,\n\n"
            f"Your sign-in verification code is: {otp}\n"
            f"It expires in {minutes} minutes.\n\n"
            f"If you did not try to sign in, you can ignore this email.\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def issue_and_send_login_otp(user) -> None:
    otp = issue_login_otp(user)
    send_login_otp_email(user, otp)
