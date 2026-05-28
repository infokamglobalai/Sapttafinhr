"""Notification scheduled tasks.

books_closing_reminder: on the 5th of every month, nudge finance team to close
the previous month's books. Only fires if `books_closed_until` < end of last month.
"""
import calendar
from datetime import date as _date

from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context

from apps.core.tenants import iter_tenant_schemas
from apps.masters.models import Company

from .models import Notification


@shared_task
def books_closing_reminder():
    """Notify staff if last month's books aren't closed yet."""
    today = _date.today()
    # Previous month's last day
    if today.month == 1:
        prev_year, prev_month = today.year - 1, 12
    else:
        prev_year, prev_month = today.year, today.month - 1
    _, prev_month_last = calendar.monthrange(prev_year, prev_month)
    prev_month_end = _date(prev_year, prev_month, prev_month_last)

    created = 0
    for tenant in iter_tenant_schemas():
        with schema_context(tenant.schema_name):
            from apps.identity.models import User
            staff = list(User.objects.filter(is_staff=True, is_active=True))
            if not staff:
                continue

            for company in Company.objects.all():
                if company.books_closed_until and company.books_closed_until >= prev_month_end:
                    continue
                # Dedupe: don't post the same reminder twice in 24h
                already = Notification.objects.filter(
                    title__startswith="Close books for",
                    body__contains=company.name,
                    created_at__gte=timezone.now() - timezone.timedelta(hours=24),
                ).exists()
                if already:
                    continue

                month_label = prev_month_end.strftime("%B %Y")
                for user in staff:
                    Notification.objects.create(
                        user=user,
                        title=f"Close books for {month_label}",
                        body=(
                            f"It's the 5th of the month — time to close {company.name}'s "
                            f"books for {month_label}. Go to Settings → Books Closing to lock "
                            f"the period through {prev_month_end.isoformat()}."
                        ),
                        level=Notification.Level.INFO,
                        link="#/settings",
                    )
                    created += 1
    return {"reminders_created": created}
