"""Core platform Celery tasks (DB backup)."""
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
