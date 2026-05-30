"""
Fernet symmetric encryption for PII fields (Aadhaar, bank account numbers).
Key is loaded from FIELD_ENCRYPTION_KEY environment variable.
"""
import base64
from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


def _get_fernet():
    key = settings.FIELD_ENCRYPTION_KEY
    if isinstance(key, str):
        key = key.encode()
    # Fernet requires a 32-byte URL-safe base64-encoded key
    return Fernet(key)


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
