"""Celery tasks for HR automation."""
from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, ignore_result=True)
def deliver_payslips_task(self, payroll_run_id: int):
    from apps.payroll.models import PayrollRun
    from apps.hr_ops.payslip_delivery import deliver_payslips_for_run

    try:
        run = PayrollRun.objects.select_related("tenant").get(pk=payroll_run_id)
    except PayrollRun.DoesNotExist:
        logger.warning("PayrollRun %s not found for payslip delivery", payroll_run_id)
        return

    result = deliver_payslips_for_run(run)
    logger.info("Payslip delivery for run %s: %s", payroll_run_id, result)


@shared_task(bind=True, ignore_result=True)
def monthly_leave_accrual_task(self, tenant_id: str | None = None):
    from apps.tenants.models import Tenant
    from apps.leaves.services import credit_monthly_accrual

    tenants = Tenant.objects.filter(status__in=["active", "trial"])
    if tenant_id:
        tenants = tenants.filter(pk=tenant_id)

    for tenant in tenants:
        try:
            credit_monthly_accrual(tenant)
        except Exception:
            logger.exception("Leave accrual failed for tenant %s", tenant.pk)


@shared_task(bind=True, ignore_result=True)
def payroll_reminders_task(self):
    from apps.tenants.models import Tenant
    from apps.hr_ops.automation import send_payroll_reminders

    for tenant in Tenant.objects.filter(status__in=["active", "trial"]):
        try:
            send_payroll_reminders(tenant)
        except Exception:
            logger.exception("Payroll reminder failed for tenant %s", tenant.pk)


@shared_task(bind=True, ignore_result=True)
def weekly_hr_digest_task(self):
    from apps.tenants.models import Tenant
    from apps.hr_ops.automation import send_weekly_hr_digest

    for tenant in Tenant.objects.filter(status__in=["active", "trial"]):
        try:
            send_weekly_hr_digest(tenant)
        except Exception:
            logger.exception("Weekly digest failed for tenant %s", tenant.pk)


@shared_task(bind=True, ignore_result=True)
def process_due_exits_task(self, tenant_id: str | None = None):
    """Auto-finalize exits whose last working day has passed."""
    from apps.tenants.models import Tenant
    from apps.hr_ops.exit_services import process_due_exits

    tenants = Tenant.objects.filter(status__in=["active", "trial"])
    if tenant_id:
        tenants = tenants.filter(pk=tenant_id)

    for tenant in tenants:
        try:
            results = process_due_exits(tenant)
            if results:
                logger.info(
                    "Auto-finalized %s exit(s) for tenant %s",
                    len(results),
                    tenant.pk,
                )
        except Exception:
            logger.exception("Due exit processing failed for tenant %s", tenant.pk)


@shared_task(bind=True, ignore_result=True)
def monthly_payroll_kickoff_task(self):
    """1st of month: remind HR to start pre-payroll review."""
    from apps.tenants.models import Tenant
    from apps.hr_ops.monthly_kickoff import send_monthly_payroll_kickoff

    for tenant in Tenant.objects.filter(status__in=["active", "trial"]):
        try:
            send_monthly_payroll_kickoff(tenant)
        except Exception:
            logger.exception("Monthly kickoff failed for tenant %s", tenant.pk)


@shared_task(bind=True, ignore_result=True)
def monthly_hr_report_pack_task(self):
    """1st of month: email previous month's HR report PDF pack."""
    import datetime

    from apps.tenants.models import Tenant
    from apps.hr_ops.monthly_report_email import send_monthly_report_pack

    today = datetime.date.today()
    if today.month == 1:
        year, month = today.year - 1, 12
    else:
        year, month = today.year, today.month - 1

    for tenant in Tenant.objects.filter(status__in=["active", "trial"]):
        try:
            send_monthly_report_pack(tenant, year, month)
        except Exception:
            logger.exception("Monthly report pack failed for tenant %s", tenant.pk)
