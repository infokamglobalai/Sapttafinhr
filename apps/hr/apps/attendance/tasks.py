"""
Celery tasks for attendance processing.

Scheduled tasks (configured via django-celery-beat admin):
  - process_yesterday_attendance: runs daily at 00:30 IST
  - compute_monthly_summaries: runs on the 1st of each month at 01:00 IST
"""
import datetime
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_employee_attendance(self, tenant_id, employee_id, date_str):
    """Process attendance for a single employee on a specific date."""
    from apps.tenants.models import Tenant
    from apps.employees.models import Employee
    from .services import process_daily_attendance

    try:
        tenant = Tenant.objects.get(id=tenant_id)
        employee = Employee.objects.get(id=employee_id, tenant=tenant)
        date = datetime.date.fromisoformat(date_str)
        record = process_daily_attendance(employee, date)
        return f"Processed: {employee} {date} → {record.status}"
    except Exception as exc:
        logger.error("Attendance processing failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)


@shared_task
def process_yesterday_attendance():
    """
    Run daily at 00:30 IST via celery-beat.
    Processes attendance for ALL active employees across ALL active tenants.
    """
    from apps.tenants.models import Tenant
    from apps.employees.models import Employee
    from .services import process_daily_attendance

    yesterday = timezone.localdate() - datetime.timedelta(days=1)
    tenants = Tenant.objects.filter(status__in=["active", "trial"])
    processed = 0
    errors = 0

    for tenant in tenants:
        employees = Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")
        for emp in employees:
            try:
                process_daily_attendance(emp, yesterday)
                processed += 1
            except Exception as exc:
                logger.error("Failed attendance for %s on %s: %s", emp, yesterday, exc)
                errors += 1

    logger.info("Attendance processing: %d processed, %d errors for %s", processed, errors, yesterday)
    return {"processed": processed, "errors": errors, "date": str(yesterday)}


@shared_task
def compute_monthly_summaries():
    """
    Run on 1st of month at 01:00 IST via celery-beat.
    Computes summaries for the previous month.
    """
    from apps.tenants.models import Tenant
    from apps.employees.models import Employee
    from .services import compute_monthly_summary

    today = timezone.localdate()
    # Previous month
    first_this_month = today.replace(day=1)
    last_month = first_this_month - datetime.timedelta(days=1)
    year, month = last_month.year, last_month.month

    tenants = Tenant.objects.filter(status__in=["active", "trial"])
    for tenant in tenants:
        employees = Employee.objects.filter(tenant=tenant, is_active=True)
        for emp in employees:
            try:
                compute_monthly_summary(tenant, emp, year, month)
            except Exception as exc:
                logger.error("Monthly summary failed for %s: %s", emp, exc)

    return {"year": year, "month": month}


@shared_task
def recompute_monthly_summary_for_employee(tenant_id, employee_id, year, month):
    """Triggered manually when attendance is corrected mid-month."""
    from apps.tenants.models import Tenant
    from apps.employees.models import Employee
    from .services import compute_monthly_summary

    tenant = Tenant.objects.get(id=tenant_id)
    employee = Employee.objects.get(id=employee_id)
    compute_monthly_summary(tenant, employee, year, month)
