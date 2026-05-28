"""Customer/Vendor portal access — one access token per party."""
import secrets

from django.db import models

from apps.core.models import TimeStampedModel
from apps.masters.models import Party


def _new_token() -> str:
    return secrets.token_urlsafe(32)


class PortalAccess(TimeStampedModel):
    party = models.OneToOneField(Party, on_delete=models.CASCADE, related_name="portal_access")
    token = models.CharField(max_length=64, unique=True, default=_new_token, db_index=True)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
