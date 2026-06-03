"""Ledger Celery tasks."""
from __future__ import annotations

import logging

from celery import shared_task
from django_tenants.utils import schema_context

logger = logging.getLogger(__name__)


@shared_task
def detect_ledger_anomalies_all() -> dict:
    """Scan all active tenant schemas for ledger anomalies (last 24h). Runs nightly."""
    from apps.core.models import Tenant

    results = {}
    for tenant in Tenant.objects.exclude(schema_name="public"):
        with schema_context(tenant.schema_name):
            try:
                from apps.masters.models import Company
                from apps.ledger.anomaly import detect_anomalies, notify_anomalies

                for company in Company.objects.filter(is_active=True):
                    anomalies = detect_anomalies(company.id, since_hours=24)
                    notified = notify_anomalies(company.id, anomalies)
                    if anomalies:
                        results[f"{tenant.schema_name}:{company.name}"] = {
                            "anomalies": len(anomalies),
                            "notified": notified,
                        }
                        logger.info(
                            "Anomaly scan: %s/%s → %d anomalies",
                            tenant.schema_name, company.name, len(anomalies),
                        )
            except Exception:  # noqa: BLE001
                logger.exception("Anomaly scan failed for %s", tenant.schema_name)

    return results
