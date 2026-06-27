"""
Fernet symmetric encryption for PII fields (Aadhaar, bank account numbers).
Key is loaded from FIELD_ENCRYPTION_KEY environment variable.
"""
import base64
import hashlib

from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


def _fernet_key_bytes() -> bytes:
    key = (getattr(settings, "FIELD_ENCRYPTION_KEY", "") or "").strip()
    if not key:
        digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(digest).decode()
    if isinstance(key, str):
        key = key.encode()
    return key


def _get_fernet():
    return Fernet(_fernet_key_bytes())


def encrypt(value: str) -> str:
    if not value:
        return ""
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        f = _get_fernet()
        return f.decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        return ""


def mask(value: str, visible_chars: int = 4) -> str:
    """Return a masked version for display: xxxxxxxx1234"""
    if not value:
        return ""
    return "x" * max(0, len(value) - visible_chars) + value[-visible_chars:]
