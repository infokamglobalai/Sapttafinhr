"""TOTP multi-factor authentication helpers for platform (Finance) users."""
from __future__ import annotations

import io
import secrets
import string

import pyotp
import qrcode
import qrcode.image.svg
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.utils import timezone

MFA_SIGNER_SALT = "saptta.fin.mfa-challenge"
ISSUER = "Saptta"


def _encrypt(value: str) -> str:
    from apps.core.encryption import encrypt

    return encrypt(value)


def _decrypt(token: str) -> str:
    from apps.core.encryption import decrypt

    return decrypt(token)


def mfa_required_for_user(user) -> bool:
    # Demo accounts do not require MFA
    email = (getattr(user, "email", "") or "").strip().lower()
    if (
        email in (
            "demo@saptta.com",
            "kuwit@saptta.com",
            "sp@saptta.com",
            "admin@acme.test",
            "manager@saptta.com",
            "manju@saptta.com",
        )
        or email.startswith("demo@")
        or email.startswith("kuwit@")
    ):
        return False
    if not getattr(settings, "MFA_REQUIRED", True):
        return False
    return bool(getattr(user, "is_active", True))


def user_needs_mfa_setup(user) -> bool:
    return mfa_required_for_user(user) and not getattr(user, "mfa_enabled", False)


def user_needs_mfa_verify(user) -> bool:
    return mfa_required_for_user(user) and getattr(user, "mfa_enabled", False)


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(email: str, secret: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=ISSUER)


def qr_svg(data: str) -> str:
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(data, image_factory=factory, box_size=4, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode()


def store_totp_secret(user, secret: str, *, enabled: bool = False) -> None:
    user.mfa_totp_secret_enc = _encrypt(secret)
    user.mfa_enabled = enabled
    if enabled and not user.mfa_enrolled_at:
        user.mfa_enrolled_at = timezone.now()
    user.save(update_fields=["mfa_totp_secret_enc", "mfa_enabled", "mfa_enrolled_at"])


def read_totp_secret(user) -> str:
    return _decrypt(getattr(user, "mfa_totp_secret_enc", "") or "")


def verify_totp(user, code: str) -> bool:
    secret = read_totp_secret(user)
    if not secret:
        return False
    normalized = (code or "").strip().replace(" ", "")
    if not normalized.isdigit():
        return False
    totp = pyotp.TOTP(secret)
    if totp.verify(normalized, valid_window=1):
        return True
    return verify_backup_code(user, normalized)


def _challenge_signer() -> TimestampSigner:
    return TimestampSigner(salt=MFA_SIGNER_SALT)


def mint_login_challenge(user_id, purpose: str) -> str:
    return _challenge_signer().sign(f"{user_id}|{purpose}")


def read_login_challenge(token: str) -> tuple[str, str]:
    max_age = getattr(settings, "MFA_CHALLENGE_MAX_AGE_SECONDS", 300)
    raw = _challenge_signer().unsign(token, max_age=max_age)
    user_id, purpose = raw.split("|", 1)
    return user_id, purpose


def unsign_login_challenge(token: str) -> tuple[str, str] | None:
    try:
        return read_login_challenge(token)
    except (BadSignature, SignatureExpired, ValueError):
        return None


def generate_backup_codes(count: int = 8) -> list[str]:
    alphabet = string.ascii_uppercase + string.digits
    return ["".join(secrets.choice(alphabet) for _ in range(8)) for _ in range(count)]


def hash_backup_codes(codes: list[str]) -> list[str]:
    return [make_password(code) for code in codes]


def verify_backup_code(user, code: str) -> bool:
    stored = list(getattr(user, "mfa_backup_codes", None) or [])
    if not stored:
        return False
    normalized = code.strip().upper().replace(" ", "")
    remaining = []
    matched = False
    for hashed in stored:
        if not matched and check_password(normalized, hashed):
            matched = True
            continue
        remaining.append(hashed)
    if matched:
        user.mfa_backup_codes = remaining
        user.save(update_fields=["mfa_backup_codes"])
    return matched


def enable_mfa(user, secret: str, confirm_code: str) -> tuple[bool, list[str] | None]:
    totp = pyotp.TOTP(secret)
    normalized = (confirm_code or "").strip().replace(" ", "")
    if not totp.verify(normalized, valid_window=1):
        return False, None
    codes = generate_backup_codes()
    user.mfa_totp_secret_enc = _encrypt(secret)
    user.mfa_enabled = True
    user.mfa_enrolled_at = timezone.now()
    user.mfa_backup_codes = hash_backup_codes(codes)
    user.save(
        update_fields=[
            "mfa_totp_secret_enc",
            "mfa_enabled",
            "mfa_enrolled_at",
            "mfa_backup_codes",
        ]
    )
    return True, codes
