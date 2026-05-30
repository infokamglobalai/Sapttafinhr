"""In-app notifications + outbound channel log."""
from django.db import models

from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    class Level(models.TextChoices):
        INFO = "INFO", "Info"
        WARNING = "WARNING", "Warning"
        ERROR = "ERROR", "Error"

    user = models.ForeignKey("identity.User", on_delete=models.CASCADE,
                              related_name="notifications")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.INFO)
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["user", "is_read"])]


class OutboundMessage(TimeStampedModel):
    """Log of every outbound email / WhatsApp / SMS."""

    class Channel(models.TextChoices):
        EMAIL = "EMAIL", "Email"
        WHATSAPP = "WHATSAPP", "WhatsApp"
        SMS = "SMS", "SMS"

    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        SENT = "SENT", "Sent"
        DELIVERED = "DELIVERED", "Delivered"
        FAILED = "FAILED", "Failed"

    channel = models.CharField(max_length=10, choices=Channel.choices)
    to = models.CharField(max_length=255)
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.QUEUED)
    provider_id = models.CharField(max_length=80, blank=True)
    error = models.CharField(max_length=255, blank=True)
