"""Payroll run dispatch — Celery async with synchronous fallback for demo/small deploys."""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def dispatch_payroll_run(tenant, payroll_run) -> str:
    """
    Queue payroll processing. Falls back to synchronous execution when Celery
    is unavailable or CELERY_TASK_ALWAYS_EAGER is enabled.
    Returns 'async' or 'sync'.
    """
    from django.conf import settings

    from .tasks import run_payroll_for_tenant

    tenant_id = str(tenant.id)
    run_id = payroll_run.id

    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        run_payroll_for_tenant(tenant_id, run_id)
        return "sync"

    try:
        run_payroll_for_tenant.delay(tenant_id, run_id)
        return "async"
    except Exception as exc:
        logger.warning("Celery unavailable for payroll run %s — running sync: %s", run_id, exc)
        run_payroll_for_tenant(tenant_id, run_id)
        return "sync"


def dispatch_payslip_generation(payroll_run) -> str:
    """
    Generate payslips for an approved run. Falls back to synchronous execution
    when Celery is unavailable or CELERY_TASK_ALWAYS_EAGER is enabled.
    Returns 'async' or 'sync'.
    """
    from django.conf import settings

    from .tasks import generate_payslips_for_run

    run_id = payroll_run.id

    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        generate_payslips_for_run(run_id)
        return "sync"

    try:
        generate_payslips_for_run.delay(run_id)
        return "async"
    except Exception as exc:
        logger.warning("Celery unavailable for payslip gen %s — running sync: %s", run_id, exc)
        generate_payslips_for_run(run_id)
        return "sync"
