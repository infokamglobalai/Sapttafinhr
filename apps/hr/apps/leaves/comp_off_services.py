"""Comp-off (compensatory leave) workflow."""
import datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import CompOffCredit

COMP_OFF_CODES = frozenset({"CO", "COMP", "COMPOFF"})


def is_comp_off_leave_type(leave_type) -> bool:
    code = (leave_type.code or "").upper().replace("_", "").replace("-", "")
    return code in {"CO", "COMP", "COMPOFF"}


def available_comp_off_total(tenant, employee) -> Decimal:
    today = timezone.localdate()
    agg = CompOffCredit.objects.filter(
        tenant=tenant,
        employee=employee,
        status="available",
        valid_until__gte=today,
    ).aggregate(total=Sum("days_earned"))
    return agg["total"] or Decimal("0")


def request_comp_off(tenant, employee, worked_date: datetime.date, reason: str = "") -> CompOffCredit:
    if worked_date > timezone.localdate():
        raise ValueError("Worked date cannot be in the future.")
    if CompOffCredit.objects.filter(
        tenant=tenant, employee=employee, worked_date=worked_date
    ).exclude(status="rejected").exists():
        raise ValueError("A comp-off request already exists for this date.")

    valid_until = worked_date + datetime.timedelta(days=90)
    return CompOffCredit.objects.create(
        tenant=tenant,
        employee=employee,
        worked_date=worked_date,
        days_earned=1,
        valid_until=valid_until,
        status="pending",
    )


@transaction.atomic
def approve_comp_off(credit: CompOffCredit, approver) -> CompOffCredit:
    if credit.status != "pending":
        raise ValueError("Only pending comp-off requests can be approved.")
    credit.status = "available"
    credit.approved_by = approver
    credit.save(update_fields=["status", "approved_by"])
    return credit


@transaction.atomic
def reject_comp_off(credit: CompOffCredit, approver) -> CompOffCredit:
    if credit.status != "pending":
        raise ValueError("Only pending comp-off requests can be rejected.")
    credit.status = "rejected"
    credit.approved_by = approver
    credit.save(update_fields=["status", "approved_by"])
    return credit


def available_comp_off_days(tenant, employee) -> list:
    today = timezone.localdate()
    return list(
        CompOffCredit.objects.filter(
            tenant=tenant,
            employee=employee,
            status="available",
            valid_until__gte=today,
        ).order_by("worked_date")
    )


@transaction.atomic
def redeem_comp_off_for_leave(tenant, employee, days: Decimal, leave_request) -> list[CompOffCredit]:
    """Consume comp-off credits FIFO when a comp-off leave is approved."""
    if days <= 0:
        return []

    credits = list(
        CompOffCredit.objects.select_for_update().filter(
            tenant=tenant,
            employee=employee,
            status="available",
            valid_until__gte=timezone.localdate(),
        ).order_by("worked_date", "created_at")
    )
    remaining = days
    used = []
    for credit in credits:
        if remaining <= 0:
            break
        earned = Decimal(str(credit.days_earned))
        if earned <= remaining:
            credit.status = "used"
            credit.leave_request = leave_request
            credit.save(update_fields=["status", "leave_request"])
            used.append(credit)
            remaining -= earned
        else:
            # Split: use partial credit (reduce days_earned, create remainder)
            credit.days_earned = earned - remaining
            credit.save(update_fields=["days_earned"])
            CompOffCredit.objects.create(
                tenant=tenant,
                employee=employee,
                worked_date=credit.worked_date,
                days_earned=remaining,
                valid_until=credit.valid_until,
                status="used",
                approved_by=credit.approved_by,
                leave_request=leave_request,
            )
            remaining = Decimal("0")
            break

    if remaining > 0:
        raise ValueError(
            f"Insufficient comp-off balance. Available: {days - remaining}, Requested: {days}"
        )
    return used


@transaction.atomic
def restore_comp_off_for_leave(leave_request) -> int:
    """Return comp-off credits linked to a cancelled approved leave."""
    credits = list(
        CompOffCredit.objects.select_for_update().filter(
            leave_request=leave_request,
            status="used",
        )
    )
    for credit in credits:
        credit.status = "available"
        credit.leave_request = None
        credit.save(update_fields=["status", "leave_request"])
    return len(credits)
