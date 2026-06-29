"""Signed bearer tokens for the Saptta HR mobile app."""
from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

MOBILE_TOKEN_SALT = "saptta.mobile-api"
MOBILE_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30  # 30 days

User = get_user_model()


def mint_mobile_token(user) -> str:
    if not user.tenant_id:
        raise ValueError("Mobile tokens require a tenant-scoped user.")
    payload = f"{user.pk}|{user.tenant.subdomain}"
    signer = TimestampSigner(key=settings.SECRET_KEY, salt=MOBILE_TOKEN_SALT)
    return signer.sign(payload)


def parse_mobile_token(token: str):
    """Return (user, tenant) or None if invalid/expired."""
    from apps.tenants.models import Tenant

    signer = TimestampSigner(key=settings.SECRET_KEY, salt=MOBILE_TOKEN_SALT)
    try:
        payload = signer.unsign(token, max_age=MOBILE_TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None

    try:
        user_id, subdomain = payload.split("|", 1)
    except ValueError:
        return None

    user = (
        User.objects.filter(pk=user_id, is_active=True, tenant__subdomain=subdomain)
        .select_related("tenant")
        .first()
    )
    if user is None:
        return None
    return user, user.tenant
