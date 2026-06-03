"""Automation model shim — actual models live in apps.notifications (TENANT_APPS).
DO NOT ADD DJANGO MODELS HERE (apps.core is SHARED_APPS).
"""
# Lazy import to avoid circular imports at module load time.
def _get_models():
    from apps.notifications.models import AutomationRule, AutomationLog
    return AutomationRule, AutomationLog

# Keep file parseable — legacy placeholder below.
"""OLD DOCSTRING:

Simple trigger → condition → action system that runs on Celery.

Trigger types:
  - invoice_overdue        Invoice past due date with balance > 0
  - invoice_paid           Invoice fully paid
  - new_invoice            Invoice posted
  - vendor_bill_due        Vendor bill due within N days
  - low_stock              Inventory item below reorder level

Action types:
  - send_email             Send email to specified address
  - send_notification      Create in-app notification
  - create_task            Log a task/note (future: task manager)
  - webhook                POST to an external URL

Each Rule is tenant-scoped (stored per tenant schema).
"""
from __future__ import annotations

import json
import logging
from datetime import date, timedelta

from django.db import models

from apps.core.models import TimeStampedModel
from apps.masters.models import Company

logger = logging.getLogger(__name__)


class AutomationRule(TimeStampedModel):
    """One automation: trigger + optional filter + action."""

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

    company     = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="automation_rules")
    name        = models.CharField(max_length=200)
    is_active   = models.BooleanField(default=True)
    trigger     = models.CharField(max_length=40, choices=Trigger.choices)
    # JSON filter: e.g. {"days_overdue_min": 7} or {"due_in_days": 3}
    trigger_filter = models.JSONField(default=dict, blank=True)
    action      = models.CharField(max_length=40, choices=Action.choices)
    # JSON config: e.g. {"to": "email@", "subject": "...", "body": "..."}
    action_config = models.JSONField(default=dict)
    last_run_at = models.DateTimeField(null=True, blank=True)
    run_count   = models.IntegerField(default=0)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.name} ({self.trigger} → {self.action})"


class AutomationLog(TimeStampedModel):
    """Record of each automation execution."""
    rule        = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name="logs")
    triggered_by = models.CharField(max_length=200, blank=True)  # e.g. "Invoice #INV-001"
    status      = models.CharField(max_length=20, default="success")  # success | error
    detail      = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
