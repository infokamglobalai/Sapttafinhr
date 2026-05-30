"""Celery tasks for fixed-asset automation.

run_monthly_depreciation_all: runs depreciation across every tenant + every
active company on the last day of each month. The beat schedule fires on days
28-31, but we only execute when 'tomorrow is a new month' so it runs exactly once.
"""
import calendar
from datetime import date as _date

from celery import shared_task
from django_tenants.utils import schema_context

from apps.core.tenants import iter_tenant_schemas
from apps.masters.models import Company, FiscalYear

from .models import FixedAsset
from .services import run_depreciation_for_asset


def _is_last_day_of_month(d: _date) -> bool:
    _, last = calendar.monthrange(d.year, d.month)
    return d.day == last


@shared_task
def run_monthly_depreciation_all():
    """Run depreciation for every asset on every company in every tenant.
    Only executes if today is the last day of the month (idempotent guard).
    """
    today = _date.today()
    if not _is_last_day_of_month(today):
        return {"skipped": "not month-end", "date": today.isoformat()}

    summary = {}
    for tenant in iter_tenant_schemas():
        with schema_context(tenant.schema_name):
            for company in Company.objects.all():
                fy = FiscalYear.objects.filter(
                    company=company, is_active=True,
                    start_date__lte=today, end_date__gte=today,
                ).first()
                if not fy:
                    continue

                count = 0
                for asset in FixedAsset.objects.filter(company=company, is_disposed=False):
                    try:
                        run_depreciation_for_asset(
                            asset, period_end=today, fiscal_year=fy, user=None,
                        )
                        count += 1
                    except (ValueError, Exception):
                        continue
                summary[f"{tenant.schema_name}/{company.name}"] = count
    return summary
