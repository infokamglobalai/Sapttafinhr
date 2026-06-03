"""Core platform Celery tasks (DB backup + automation engine)."""
from __future__ import annotations

import logging

from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task
def run_db_backup() -> str:
    """Nightly database backup. Wraps the backup_db management command."""
    try:
        call_command("backup_db")
        return "ok"
    except Exception as exc:  # noqa: BLE001 — surface but don't crash the worker
        logger.exception("Scheduled DB backup failed")
        return f"failed: {exc}"


@shared_task
def run_automation_rules() -> dict:
    """Evaluate all active automation rules across all tenant schemas. Runs hourly."""
    from django_tenants.utils import schema_context
    from apps.core.models import Tenant

    totals = {"fired": 0, "errors": 0}
    for tenant in Tenant.objects.exclude(schema_name="public"):
        with schema_context(tenant.schema_name):
            try:
                from apps.masters.models import Company
                from apps.core.automation_engine import run_automation_for_company
                for company in Company.objects.filter(is_active=True):
                    result = run_automation_for_company(company.id)
                    totals["fired"] += result.get("fired", 0)
                    totals["errors"] += result.get("errors", 0)
            except Exception:
                logger.exception("Automation failed for %s", tenant.schema_name)
    return totals
