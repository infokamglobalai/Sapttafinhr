"""Seat-limit alerts — in-app + email notifications for workspace owners."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .limits import active_employee_count, employee_limit, seats_remaining

SEAT_NOTIFY_WARNING_DAYS = 7
SEAT_NOTIFY_BLOCKED_HOURS = 24

NOTIF_WARNING = "seat_limit_warning"
NOTIF_REACHED = "seat_limit_reached"
NOTIF_FREED = "seat_freed"


def seat_usage_snapshot(tenant) -> dict:
    """Current seat usage for UI and notifications."""
    used = active_employee_count(tenant)
    limit = employee_limit(tenant)
    remaining = max(0, limit - used)
    pct = int(round(used / limit * 100)) if limit else 0
    return {
        "used": used,
        "limit": limit,
        "remaining": remaining,
        "pct": pct,
        "at_cap": remaining == 0 and limit > 0,
        "near_cap": limit > 0 and (remaining == 0 or pct >= 90 or remaining <= 3),
    }


def seat_alert_level(tenant) -> str | None:
    """Banner severity: critical (full), warning (≥90% or ≤3 left), else None."""
    snap = seat_usage_snapshot(tenant)
    if snap["limit"] <= 0:
        return None
    if snap["at_cap"]:
        return "critical"
    if snap["pct"] >= 90 or snap["remaining"] <= 3:
        return "warning"
    return None


def workspace_owners(tenant):
    from apps.accounts.models import User

    return User.objects.filter(
        tenant=tenant,
        is_active=True,
        user_roles__role__name="super_admin",
    ).distinct()


def _recent_notification_exists(
    tenant,
    recipient,
    notification_type: str,
    *,
    hours: int | None = None,
    days: int | None = None,
) -> bool:
    from apps.hr_ops.models import Notification

    cutoff = timezone.now()
    if hours is not None:
        cutoff -= timedelta(hours=hours)
    elif days is not None:
        cutoff -= timedelta(days=days)
    else:
        cutoff -= timedelta(days=SEAT_NOTIFY_WARNING_DAYS)

    return Notification.objects.filter(
        tenant=tenant,
        recipient=recipient,
        notification_type=notification_type,
        created_at__gte=cutoff,
    ).exists()


def _notify_owners(
    tenant,
    notification_type: str,
    title: str,
    message: str,
    action_url: str,
    *,
    dedupe_hours: int | None = None,
    dedupe_days: int | None = None,
) -> int:
    from apps.hr_ops.services import notify

    sent = 0
    for owner in workspace_owners(tenant):
        if _recent_notification_exists(
            tenant,
            owner,
            notification_type,
            hours=dedupe_hours,
            days=dedupe_days,
        ):
            continue
        notify(
            owner,
            notification_type,
            title,
            message,
            action_url=action_url,
            send_email=True,
        )
        sent += 1
    return sent


def notify_owners_seat_warning(tenant) -> int:
    snap = seat_usage_snapshot(tenant)
    if snap["at_cap"] or snap["pct"] < 90:
        return 0
    title = f"Seat limit warning — {snap['used']}/{snap['limit']} used"
    message = (
        f"Your workspace has {snap['remaining']} seat(s) remaining "
        f"({snap['pct']}% of your plan). Add seats in Billing before you reach the limit."
    )
    return _notify_owners(
        tenant,
        NOTIF_WARNING,
        title,
        message,
        "/employees/",
        dedupe_days=SEAT_NOTIFY_WARNING_DAYS,
    )


def notify_owners_seat_reached(tenant, *, urgent: bool = False) -> int:
    snap = seat_usage_snapshot(tenant)
    if not snap["at_cap"]:
        return 0
    title = f"Employee seat limit reached ({snap['used']}/{snap['limit']})"
    message = (
        "You cannot add more employees until you upgrade seats in Billing. "
        "When someone exits after full & final settlement, their seat is freed automatically."
    )
    return _notify_owners(
        tenant,
        NOTIF_REACHED,
        title,
        message,
        "/auth/settings/?tab=billing",
        dedupe_hours=SEAT_NOTIFY_BLOCKED_HOURS if urgent else None,
        dedupe_days=None if urgent else SEAT_NOTIFY_WARNING_DAYS,
    )


def notify_owners_seat_freed(tenant, *, freed: int = 1) -> int:
    snap = seat_usage_snapshot(tenant)
    if snap["at_cap"]:
        return 0
    title = f"{freed} seat{'s' if freed != 1 else ''} available — you can add employees"
    message = (
        f"An employee exit freed {freed} seat(s). "
        f"You now have {snap['remaining']} of {snap['limit']} seats available — "
        "no plan upgrade needed to hire a replacement."
    )
    return _notify_owners(
        tenant,
        NOTIF_FREED,
        title,
        message,
        "/employees/create/",
        dedupe_hours=12,
    )


def sync_seat_limit_alerts(tenant, *, was_at_cap: bool | None = None) -> None:
    """
    Fire owner notifications after headcount changes.
    Pass was_at_cap=True when an exit may have freed a seat.
    """
    snap = seat_usage_snapshot(tenant)
    if was_at_cap and not snap["at_cap"]:
        notify_owners_seat_freed(tenant)
        return
    if snap["at_cap"]:
        notify_owners_seat_reached(tenant)
    elif snap["pct"] >= 90:
        notify_owners_seat_warning(tenant)


def notify_owners_add_blocked(tenant) -> None:
    """Called when create/import is rejected at the seat cap."""
    notify_owners_seat_reached(tenant, urgent=True)
