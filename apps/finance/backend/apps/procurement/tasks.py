"""Celery tasks for procurement automation.

send_vendor_bill_due_alerts: daily — notify the finance team about bills due
in the next 3 days (and overdue) with a balance still owed.
"""
from datetime import date as _date, timedelta

from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context

from apps.core.tenants import iter_tenant_schemas
from apps.notifications.models import Notification

from .models import VendorBill


DAYS_AHEAD = 3
DEDUPE_HOURS = 48


@shared_task
def send_vendor_bill_due_alerts():
    """Daily — in-app notify staff about bills due soon or overdue."""
    today = _date.today()
    now = timezone.now()
    horizon = today + timedelta(days=DAYS_AHEAD)
    created = 0

    for tenant in iter_tenant_schemas():
        with schema_context(tenant.schema_name):
            from apps.identity.models import User
            staff = list(User.objects.filter(is_staff=True, is_active=True))
            if not staff:
                continue

            bills = (
                VendorBill.objects
                .filter(
                    status=VendorBill.Status.POSTED,
                    due_date__lte=horizon,
                )
                .select_related("vendor", "company")
            )
            for bill in bills:
                if bill.balance_due <= 0:
                    continue
                # 48h dedupe
                if bill.last_reminder_at and (now - bill.last_reminder_at) < timedelta(hours=DEDUPE_HOURS):
                    continue

                days = (bill.due_date - today).days
                if days < 0:
                    when = f"{-days} days overdue"
                    level = Notification.Level.WARNING
                elif days == 0:
                    when = "due today"
                    level = Notification.Level.WARNING
                else:
                    when = f"due in {days} day(s)"
                    level = Notification.Level.INFO

                for user in staff:
                    Notification.objects.create(
                        user=user,
                        title=f"Vendor bill {bill.bill_no} {when}",
                        body=(
                            f"{bill.vendor.name} • Balance ₹{bill.balance_due} • "
                            f"Due {bill.due_date.isoformat()}"
                        ),
                        level=level,
                        link="#/vendor-bills",
                    )
                    created += 1

                bill.last_reminder_at = now
                bill.reminder_count = (bill.reminder_count or 0) + 1
                bill.save(update_fields=["last_reminder_at", "reminder_count", "updated_at"])

    return {"alerts_created": created}
