"""API Keys + Webhook subscriptions + delivery log."""
import secrets

from django.db import models

from apps.core.models import TimeStampedModel
from apps.masters.models import Company


def _new_key() -> str:
    return f"fsk_{secrets.token_urlsafe(32)}"


class APIKey(TimeStampedModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="api_keys")
    name = models.CharField(max_length=80)
    key = models.CharField(max_length=64, unique=True, default=_new_key, db_index=True)
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    scopes = models.CharField(
        max_length=255, default="read",
        help_text="comma-separated: read, write",
    )

    def __str__(self):
        return f"{self.name} ({self.key[:12]}…)"


class WebhookSubscription(TimeStampedModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="webhooks")
    name = models.CharField(max_length=80)
    url = models.URLField()
    secret = models.CharField(max_length=64, default=_new_key,
                               help_text="Used to HMAC the payload")
    events = models.CharField(
        max_length=500, default="invoice.created,invoice.posted,receipt.posted",
        help_text="Comma-separated event names",
    )
    is_active = models.BooleanField(default=True)


class WebhookDelivery(TimeStampedModel):
    subscription = models.ForeignKey(WebhookSubscription, on_delete=models.CASCADE,
                                      related_name="deliveries")
    event = models.CharField(max_length=80)
    payload = models.JSONField()
    response_status = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    success = models.BooleanField(default=False)
    attempted_at = models.DateTimeField(auto_now_add=True)
    error = models.CharField(max_length=255, blank=True)
