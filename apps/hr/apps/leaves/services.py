"""
Leave service layer.
- Holiday lookup
- Leave day calculation (excluding weekends/holidays per leave type config)
- Balance deduction and credit
- Approval workflow
"""
import datetime
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from .models import LeaveRequest, LeaveBalance, LeaveType, Holiday, HolidayCalendar
from .comp_off_services import is_comp_off_leave_type, available_comp_off_total, redeem_comp_off_for_leave, restore_comp_off_for_leave


# ---------------------------------------------------------------------------
# Holiday helpers
# ---------------------------------------------------------------------------
def get_holiday(tenant, date: datetime.date):
    """Return Holiday object if date is a national holiday, else None."""
    calendar = HolidayCalendar.objects.filter(
        tenant=tenant, year=date.year, is_default=True
    ).first()
    if not calendar:
        return None
    return Holiday.objects.filter(
        calendar=calendar, holiday_date=date, is_active=True
    ).first()


def get_holidays_in_range(tenant, start: datetime.date, end: datetime.date) -> set:
    """Return set of holiday dates between start and end inclusive."""
    year = start.year
    calendar = HolidayCalendar.objects.filter(tenant=tenant, year=year, is_default=True).first()
    if not calendar:
        return set()
    return set(
        Holiday.objects.filter(
            calendar=calendar,
            holiday_date__range=(start, end),
            is_active=True,
        ).values_list("holiday_date", flat=True)
    )


# ---------------------------------------------------------------------------
# Day counting
# ---------------------------------------------------------------------------
def count_leave_days(
    leave_type: LeaveType,
    from_date: datetime.date,
    to_date: datetime.date,
    half_day_type: str,
    tenant,
) -> Decimal:
    """
    Count actual leave days based on leave type configuration.
    Excludes holidays and weekends if the leave type is configured to do so.
    """
    if half_day_type in ("first_half", "second_half"):
        return Decimal("0.5")

    holidays = get_holidays_in_range(tenant, from_date, to_date) if not leave_type.include_holidays else set()
    total = Decimal("0")
    current = from_date

    while current <= to_date:
        is_weekend = current.weekday() >= 5  # Saturday=5, Sunday=6
        is_holiday = current in holidays

        if not leave_type.include_weekends and is_weekend:
            current += datetime.timedelta(days=1)
            continue
        if not leave_type.include_holidays and is_holiday:
            current += datetime.timedelta(days=1)
            continue

        total += Decimal("1")
        current += datetime.timedelta(days=1)

    return total


# ---------------------------------------------------------------------------
# Balance management
# ---------------------------------------------------------------------------
def get_or_create_balance(tenant, employee, leave_type: LeaveType, year: int) -> LeaveBalance:
    balance, created = LeaveBalance.objects.get_or_create(
        tenant=tenant, employee=employee, leave_type=leave_type, year=year,
        defaults={"opening_balance": Decimal("0"), "credited": Decimal("0")},
    )
    if created and leave_type.accrual_type == "upfront":
        balance.credited = leave_type.accrual_value or Decimal("0")
        balance.save()
    return balance


def deduct_leave_balance(tenant, employee, leave_type: LeaveType, days: Decimal, year: int):
    balance = get_or_create_balance(tenant, employee, leave_type, year)
    balance.taken += days
    balance.save()


def restore_leave_balance(tenant, employee, leave_type: LeaveType, days: Decimal, year: int):
    balance = get_or_create_balance(tenant, employee, leave_type, year)
    balance.taken = max(Decimal("0"), balance.taken - days)
    balance.save()


# ---------------------------------------------------------------------------
# Leave request workflow
# ---------------------------------------------------------------------------
@transaction.atomic
def apply_leave(tenant, employee, leave_type_id: int, from_date, to_date, half_day_type: str, reason: str, document=None) -> LeaveRequest:
    """
    Validate and create a leave request. Raises ValueError on validation failure.
    Does NOT deduct balance — balance is deducted on approval.
    """
    leave_type = LeaveType.objects.get(id=leave_type_id, tenant=tenant, is_active=True)
    today = datetime.date.today()
    year = from_date.year

    # Notice period check
    if leave_type.min_notice_days > 0:
        notice_deadline = today + datetime.timedelta(days=leave_type.min_notice_days)
        if from_date < notice_deadline:
            raise ValueError(
                f"{leave_type.name} requires {leave_type.min_notice_days} days advance notice."
            )

    # Gender restriction
    if leave_type.applicable_gender != "all":
        emp_gender = employee.gender
        if leave_type.applicable_gender == "female" and emp_gender != "female":
            raise ValueError(f"{leave_type.name} is only applicable to female employees.")
        if leave_type.applicable_gender == "male" and emp_gender != "male":
            raise ValueError(f"{leave_type.name} is only applicable to male employees.")

    # Probation restriction
    if leave_type.applicable_after_months > 0:
        months_served = (today - employee.date_of_joining).days // 30
        if months_served < leave_type.applicable_after_months:
            raise ValueError(
                f"{leave_type.name} is available only after {leave_type.applicable_after_months} months of service."
            )

    # Compute days
    total_days = count_leave_days(leave_type, from_date, to_date, half_day_type, tenant)

    if total_days <= 0:
        raise ValueError("No working days in the selected date range.")

    # Balance check (paid leaves) or comp-off credit check
    if is_comp_off_leave_type(leave_type):
        available = available_comp_off_total(tenant, employee)
        if available < total_days:
            raise ValueError(
                f"Insufficient comp-off balance. Available: {available}, Requested: {total_days}"
            )
    elif leave_type.is_paid:
        balance = get_or_create_balance(tenant, employee, leave_type, year)
        if balance.available < total_days:
            raise ValueError(
                f"Insufficient {leave_type.code} balance. Available: {balance.available}, Requested: {total_days}"
            )

    # Document requirement
    if leave_type.requires_document_after and total_days > leave_type.requires_document_after and not document:
        raise ValueError(f"Supporting document required for {leave_type.name} exceeding {leave_type.requires_document_after} days.")

    request = LeaveRequest.objects.create(
        tenant=tenant,
        employee=employee,
        leave_type=leave_type,
        from_date=from_date,
        to_date=to_date,
        total_days=total_days,
        half_day_type=half_day_type,
        reason=reason,
        document=document,
        status="pending",
    )

    # Notify the reporting manager (if any) that there's a new request to approve
    try:
        from apps.hr_ops.services import notify
        manager = employee.reporting_manager
        if manager and manager.user:
            notify(
                manager.user,
                "leave_applied",
                f"New leave request from {employee.full_name}",
                message=f"{employee.full_name} applied for {leave_type.name} ({leave_type.code}) "
                        f"from {from_date.strftime('%d %b')} to {to_date.strftime('%d %b')} ({total_days} day(s)).",
                action_url="/leaves/pending/",
            )
    except Exception:
        pass

    return request


@transaction.atomic
def approve_leave(leave_request: LeaveRequest, actioned_by, remarks: str = "") -> LeaveRequest:
    if leave_request.status != "pending":
        raise ValueError(f"Leave is already {leave_request.status}.")

    leave_request.status = "approved"
    leave_request.actioned_by = actioned_by
    leave_request.actioned_at = timezone.now()
    leave_request.remarks = remarks
    leave_request.save()

    # Deduct balance or redeem comp-off credits
    if is_comp_off_leave_type(leave_request.leave_type):
        redeem_comp_off_for_leave(
            leave_request.tenant,
            leave_request.employee,
            leave_request.total_days,
            leave_request,
        )
    else:
        deduct_leave_balance(
            leave_request.tenant,
            leave_request.employee,
            leave_request.leave_type,
            leave_request.total_days,
            leave_request.from_date.year,
        )

    # Update attendance records to "on_leave" for the approved dates
    _mark_attendance_on_leave(leave_request)

    # Notify the employee
    try:
        from apps.hr_ops.services import notify, audit_log
        emp_user = leave_request.employee.user
        if emp_user:
            notify(
                emp_user, "leave_approved",
                f"Your {leave_request.leave_type.name} request was approved",
                message=f"{leave_request.from_date.strftime('%d %b %Y')} → {leave_request.to_date.strftime('%d %b %Y')} ({leave_request.total_days} day(s))."
                        + (f"\n\n{remarks}" if remarks else ""),
                action_url="/leaves/my/",
            )
        audit_log(
            leave_request.tenant, actioned_by, "approve", "LeaveRequest", leave_request,
            f"Approved {leave_request.leave_type.code} for {leave_request.employee.full_name} "
            f"({leave_request.total_days} day(s), {leave_request.from_date} → {leave_request.to_date})",
            details={"remarks": remarks, "days": float(leave_request.total_days)},
        )
    except Exception:
        pass

    return leave_request


@transaction.atomic
def reject_leave(leave_request: LeaveRequest, actioned_by, remarks: str = "") -> LeaveRequest:
    if leave_request.status not in ("pending",):
        raise ValueError(f"Leave is already {leave_request.status}.")
    leave_request.status = "rejected"
    leave_request.actioned_by = actioned_by
    leave_request.actioned_at = timezone.now()
    leave_request.remarks = remarks
    leave_request.save()

    try:
        from apps.hr_ops.services import notify, audit_log
        emp_user = leave_request.employee.user
        if emp_user:
            notify(
                emp_user, "leave_rejected",
                f"Your {leave_request.leave_type.name} request was declined",
                message=f"{leave_request.from_date.strftime('%d %b %Y')} → {leave_request.to_date.strftime('%d %b %Y')} ({leave_request.total_days} day(s))."
                        + (f"\n\nReason: {remarks}" if remarks else ""),
                action_url="/leaves/my/",
            )
        audit_log(
            leave_request.tenant, actioned_by, "reject", "LeaveRequest", leave_request,
            f"Rejected {leave_request.leave_type.code} for {leave_request.employee.full_name}",
            details={"remarks": remarks},
        )
    except Exception:
        pass

    return leave_request


@transaction.atomic
def cancel_leave(leave_request: LeaveRequest) -> LeaveRequest:
    if leave_request.status not in ("pending", "approved"):
        raise ValueError("Cannot cancel a leave that is already rejected or cancelled.")

    was_approved = leave_request.status == "approved"
    leave_request.status = "cancelled"
    leave_request.save()

    if was_approved:
        if is_comp_off_leave_type(leave_request.leave_type):
            restore_comp_off_for_leave(leave_request)
        else:
            restore_leave_balance(
                leave_request.tenant,
                leave_request.employee,
                leave_request.leave_type,
                leave_request.total_days,
                leave_request.from_date.year,
            )
    return leave_request


def _mark_attendance_on_leave(leave_request: LeaveRequest):
    """Update attendance records for approved leave dates."""
    from apps.attendance.models import AttendanceRecord
    from apps.attendance.services import get_employee_shift

    current = leave_request.from_date
    while current <= leave_request.to_date:
        shift = get_employee_shift(leave_request.employee, current)
        AttendanceRecord.objects.update_or_create(
            tenant=leave_request.tenant,
            employee=leave_request.employee,
            attendance_date=current,
            defaults={"status": "on_leave", "shift": shift},
        )
        current += datetime.timedelta(days=1)


# ---------------------------------------------------------------------------
# Annual leave credit (called by Celery at year start)
# ---------------------------------------------------------------------------
def credit_upfront_leaves(tenant, year: int):
    """Credit upfront leave types to all active employees for a given year."""
    from apps.employees.models import Employee

    employees = Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")
    leave_types = LeaveType.objects.filter(tenant=tenant, is_active=True, accrual_type="upfront")

    for emp in employees:
        for lt in leave_types:
            # Skip gender restrictions
            if lt.applicable_gender == "female" and emp.gender != "female":
                continue
            if lt.applicable_gender == "male" and emp.gender != "male":
                continue
            balance, created = LeaveBalance.objects.get_or_create(
                tenant=tenant, employee=emp, leave_type=lt, year=year,
                defaults={"credited": lt.accrual_value or 0},
            )
            if not created and balance.credited == 0:
                balance.credited = lt.accrual_value or 0
                balance.save()


def credit_monthly_accrual(tenant, year: int | None = None, month: int | None = None) -> int:
    """Credit monthly-accrual leave types for all active employees. Returns credits applied."""
    from apps.employees.models import Employee

    today = datetime.date.today()
    year = year or today.year
    month = month or today.month

    employees = Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")
    leave_types = LeaveType.objects.filter(tenant=tenant, is_active=True, accrual_type="monthly")

    credits = 0
    for emp in employees:
        for lt in leave_types:
            if lt.applicable_gender == "female" and emp.gender != "female":
                continue
            if lt.applicable_gender == "male" and emp.gender != "male":
                continue
            if lt.applicable_after_months > 0:
                months_served = (today - emp.date_of_joining).days // 30
                if months_served < lt.applicable_after_months:
                    continue

            balance = get_or_create_balance(tenant, emp, lt, year)
            accrual = lt.accrual_value or Decimal("0")
            if accrual <= 0:
                continue

            new_credited = balance.credited + accrual
            if lt.max_annual_balance is not None:
                cap = lt.max_annual_balance + balance.opening_balance + balance.carry_forward
                new_credited = min(new_credited, cap)

            if new_credited > balance.credited:
                balance.credited = new_credited
                balance.save(update_fields=["credited", "updated_at"])
                credits += 1

    return credits
