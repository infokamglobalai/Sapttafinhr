"""Signed, self-expiring employee invite links.

When an admin provisions a self-service login, the employee's account is created
*locked* (inactive, with no usable password). The ONLY way in is an invite link
the admin hands them: a short string signed with the project SECRET_KEY that
carries the user id and its own timestamp. Accepting the link sets a password and
unlocks the account. Without a valid link, the normal login refuses the account.

Tamper-proof (signature) + self-expiring (TimestampSigner max_age), so links can't
be forged and old links stop working on their own.
"""
from __future__ import annotations

from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

INVITE_SALT = "saptta.hr-employee-invite"
DEFAULT_MAX_AGE_SECONDS = 7 * 24 * 3600  # links are valid for 7 days


def _signer() -> TimestampSigner:
    return TimestampSigner(salt=INVITE_SALT)


def make_invite_token(user) -> str:
    """Return a signed invite token for this user."""
    return _signer().sign(str(user.pk))


def read_invite_token(token: str, max_age: int | None = None) -> str | None:
    """Return the user id (UUID string) carried by a valid, unexpired token, else
    ``None``. The caller looks the user up by primary key."""
    if max_age is None:
        max_age = getattr(settings, "EMPLOYEE_INVITE_MAX_AGE_SECONDS", DEFAULT_MAX_AGE_SECONDS)
    try:
        return _signer().unsign(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None
