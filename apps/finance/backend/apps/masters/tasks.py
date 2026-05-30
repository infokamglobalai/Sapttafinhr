"""Celery tasks for masters automation.

auto_create_next_fy: on Apr 1 each year, create the new Indian fiscal year for
every active company and mark it active. Older FYs stay (read-only after closing).
"""
from datetime import date as _date

from celery import shared_task
from django_tenants.utils import schema_context

from apps.core.tenants import iter_tenant_schemas

from .models import Company, FiscalYear


def _fy_dates_for(today: _date) -> tuple[_date, _date, str]:
    """Indian FY = Apr 1 → Mar 31."""
    if today.month >= 4:
        start = _date(today.year, 4, 1)
        end = _date(today.year + 1, 3, 31)
    else:
        start = _date(today.year - 1, 4, 1)
        end = _date(today.year, 3, 31)
    name = f"FY{str(start.year)[-2:]}-{str(end.year)[-2:]}"
    return start, end, name


@shared_task
def auto_create_next_fy():
    """On Apr 1: ensure every company has the new FY created and active.
    Idempotent — uses get_or_create on (company, name).
    """
    today = _date.today()
    # Only run on Apr 1 (beat schedule guards but second-line safety here)
    if today.month != 4 or today.day != 1:
        return {"skipped": "not Apr 1", "date": today.isoformat()}

    start, end, name = _fy_dates_for(today)
    summary = {}

    for tenant in iter_tenant_schemas():
        with schema_context(tenant.schema_name):
            count = 0
            for company in Company.objects.all():
                fy, created = FiscalYear.objects.get_or_create(
                    company=company,
                    name=name,
                    defaults={
                        "start_date": start,
                        "end_date": end,
                        "is_active": True,
                    },
                )
                # Mark older active FYs as inactive (they're still readable; just not "current")
                FiscalYear.objects.filter(
                    company=company, is_active=True,
                ).exclude(pk=fy.pk).update(is_active=False)
                if created:
                    count += 1
            summary[tenant.schema_name] = count
    return summary
