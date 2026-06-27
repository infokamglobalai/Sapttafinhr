"""Fernet encryption for sensitive platform fields (TOTP secrets)."""
from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet_key_bytes() -> bytes:
    key = (getattr(settings, "FIELD_ENCRYPTION_KEY", "") or "").strip()
    if not key:
        # Dev-only fallback so local runs without FIELD_ENCRYPTION_KEY don't crash.
        # Production must set FIELD_ENCRYPTION_KEY explicitly.
        digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(digest).decode()
    if isinstance(key, str):
        key = key.encode()
    return key


def _get_fernet() -> Fernet:
    return Fernet(_fernet_key_bytes())

def encrypt(value: str) -> str:
    if not value:
        return ""
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return _get_fernet().decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        return ""
