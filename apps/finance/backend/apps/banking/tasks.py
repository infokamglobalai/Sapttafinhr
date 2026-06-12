"""Celery tasks for banking automation.

check_pdc_presentation: daily — alert cashiers about PDCs due for presentation
(cheque_date <= today + 1 day) that are still PENDING.
"""
from datetime import date as _date, timedelta

from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context

from apps.core.tenants import iter_tenant_schemas
from apps.notifications.models import Notification

from .models import PostDatedCheque


DAYS_AHEAD = 1
DEDUPE_HOURS = 48


@shared_task
def check_pdc_presentation():
    """Daily — notify staff about cheques due for bank presentation."""
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

            pdcs = (
                PostDatedCheque.objects
                .filter(
                    status=PostDatedCheque.Status.PENDING,
                    cheque_date__lte=horizon,
                )
                .select_related("party")
            )
            for pdc in pdcs:
                if pdc.last_reminder_at and (now - pdc.last_reminder_at) < timedelta(hours=DEDUPE_HOURS):
                    continue

                days = (pdc.cheque_date - today).days
                action = (
                    "Deposit for collection" if pdc.direction == PostDatedCheque.Direction.RECEIVED
                    else "Funds need to be available"
                )
                when = "today" if days == 0 else f"in {days} day(s)" if days > 0 else f"{-days} day(s) ago"

                for user in staff:
                    Notification.objects.create(
                        user=user,
                        title=f"PDC {pdc.cheque_no} • {action} {when}",
                        body=(
                            f"{pdc.party.name} • Amount ₹{pdc.amount} • "
                            f"Cheque date {pdc.cheque_date.isoformat()} • "
                            f"{pdc.bank_name or 'no bank specified'}"
                        ),
                        level=Notification.Level.WARNING,
                        link="#/pdcs",
                    )
                    created += 1

                pdc.last_reminder_at = now
                pdc.save(update_fields=["last_reminder_at", "updated_at"])

    return {"alerts_created": created}
