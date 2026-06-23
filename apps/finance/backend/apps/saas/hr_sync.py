"""Push subscription headcount + status to the HR backend (internal network)."""
from __future__ import annotations

import logging

from django.conf import settings

from .models import ProductCode, Subscription
from .pricing import INCLUDED_EMPLOYEES, max_employees_for_plan

logger = logging.getLogger(__name__)


def sync_hr_subscription(
    schema_name: str,
    *,
    plan_code: str = "",
    max_employees: int | None = None,
    subscription_id: str = "",
    status: str = "active",
) -> bool:
    """Best-effort sync after billing activation. Returns True if HR acknowledged."""
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    base = getattr(settings, "HR_INTERNAL_BASE_URL", "")
    if not (secret and base):
        logger.info("HR subscription sync skipped (SSO_SHARED_SECRET / HR_INTERNAL_BASE_URL unset)")
        return False

    sub = Subscription.objects.filter(tenant__schema_name=schema_name).select_related("tenant").first()
    if sub and not sub.allows_product(ProductCode.HR):
        logger.info("HR subscription sync skipped — no HR entitlement on %s", schema_name)
        return False

    headcount = max_employees
    if headcount is None:
        headcount = max_employees_for_plan(plan_code or (sub.plan.code if sub else ""))

    payload = {
        "subdomain": schema_name,
        "max_employees": headcount or INCLUDED_EMPLOYEES,
        "subscription_id": subscription_id or (str(sub.id) if sub else ""),
        "status": status,
        "entitlement_status": "active" if status == "active" else status,
        "plan_code": plan_code or (sub.plan.code if sub else ""),
    }
    if sub:
        if sub.current_period_start:
            payload["current_period_start"] = sub.current_period_start.isoformat()
        if sub.current_period_end:
            payload["current_period_end"] = sub.current_period_end.isoformat()

    try:
        import requests

        resp = requests.post(
            f"{base.rstrip('/')}/internal/sync-subscription/",
            headers={
                "Authorization": f"Bearer {secret}",
                "Host": "localhost",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if resp.ok:
            logger.info("HR subscription synced for %s (max_employees=%s)", schema_name, payload["max_employees"])
            return True
        logger.warning("HR subscription sync failed for %s: HTTP %s %s", schema_name, resp.status_code, resp.text[:200])
    except Exception:  # noqa: BLE001
        logger.exception("HR subscription sync call failed for %s", schema_name)
    return False
