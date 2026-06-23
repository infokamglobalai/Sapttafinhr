"""Audit-trail helper for the super-admin console.

Every privileged mutation routes through `record_audit` so the platform keeps an
accountable, append-only history of operator actions. Best-effort: auditing must
never break the action it is recording.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def record_audit(request, action: str, *, target_schema: str = "", target_label: str = "", detail: dict | None = None):
    """Write one SaasAuditLog row for a super-admin action. Never raises."""
    try:
        from .models import SaasAuditLog

        actor = getattr(getattr(request, "user", None), "email", "") or "system"
        return SaasAuditLog.objects.create(
            actor_email=actor,
            action=action,
            target_schema=target_schema or "",
            target_label=target_label or "",
            detail=detail or {},
        )
    except Exception:  # noqa: BLE001 — auditing must not break the action
        logger.exception("audit log write failed for action=%s schema=%s", action, target_schema)
        return None
