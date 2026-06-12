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


class SMTPSettings(TimeStampedModel):
    """SMTP server configuration for sending outbound emails for this tenant."""
    host = models.CharField(max_length=255)
    port = models.PositiveIntegerField(default=587)
    username = models.CharField(max_length=255)
    password = models.CharField(max_length=255)
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    from_email = models.EmailField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.host}:{self.port} ({self.from_email})"


# ── Workflow Automation ──────────────────────────────────────────────────────

class AutomationRule(TimeStampedModel):
    """One automation: trigger + optional filter + action (tenant-scoped)."""

    class Trigger(models.TextChoices):
        INVOICE_OVERDUE    = "invoice_overdue",    "Invoice Overdue"
        INVOICE_PAID       = "invoice_paid",       "Invoice Paid"
        NEW_INVOICE        = "new_invoice",        "New Invoice Posted"
        VENDOR_BILL_DUE    = "vendor_bill_due",    "Vendor Bill Due Soon"
        LOW_STOCK          = "low_stock",          "Item Below Reorder Level"
        MONTHLY_REPORT     = "monthly_report",     "Monthly Report (1st of month)"

    class Action(models.TextChoices):
        SEND_EMAIL         = "send_email",         "Send Email"
        SEND_NOTIFICATION  = "send_notification",  "In-App Notification"
        WEBHOOK            = "webhook",            "HTTP Webhook"
        WHATSAPP           = "whatsapp",           "WhatsApp Message"

    company_id  = models.IntegerField(db_index=True)
    name        = models.CharField(max_length=200)
    is_active   = models.BooleanField(default=True)
    trigger     = models.CharField(max_length=40, choices=Trigger.choices)
    trigger_filter = models.JSONField(default=dict, blank=True)
    action      = models.CharField(max_length=40, choices=Action.choices)
    action_config = models.JSONField(default=dict)
    last_run_at = models.DateTimeField(null=True, blank=True)
    run_count   = models.IntegerField(default=0)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.name} ({self.trigger} → {self.action})"


class AutomationLog(TimeStampedModel):
    rule         = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name="logs")
    triggered_by = models.CharField(max_length=200, blank=True)
    status       = models.CharField(max_length=20, default="success")
    detail       = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
