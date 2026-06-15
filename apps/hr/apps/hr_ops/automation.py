"""Scheduled HR automation: payroll reminders, weekly digest."""
from __future__ import annotations

from calendar import month_name
from datetime import date, timedelta
from django.utils import timezone

from apps.hr_ops.services import notify


def send_payroll_reminders(tenant, today: date | None = None) -> int:
    """Remind HR admins to lock attendance / run payroll before month-end."""
    from apps.accounts.models import User
    from apps.attendance.models import AttendanceRecord
    from apps.employees.models import Employee
    from apps.payroll.models import PayrollRun

    today = today or timezone.localdate()
    year, month = today.year, today.month

    # Remind from 25th until payroll run exists for current month
    if today.day < 25:
        return 0

    if PayrollRun.objects.filter(tenant=tenant, year=year, month=month).exists():
        return 0

    days_in_month = (date(year + (month // 12), (month % 12) + 1, 1) - timedelta(days=1)).day
    days_left = days_in_month - today.day

    active_count = Employee.objects.filter(
        tenant=tenant, is_active=True, employment_status="active"
    ).count()
    attendance_count = AttendanceRecord.objects.filter(
        tenant=tenant,
        attendance_date__year=year,
        attendance_date__month=month,
    ).count()

    period = f"{month_name[month]} {year}"
    title = f"Payroll reminder — {period}"
    body = (
        f"{days_left} day(s) left in {period}. Payroll run not started. "
    )
    if active_count and attendance_count < active_count:
        body += (
            f"Attendance records: {attendance_count}/{active_count} employees this month. "
        )
    body += "Please review attendance and initiate payroll."

    hr_users = User.objects.filter(
        tenant=tenant,
        is_active=True,
        user_roles__role__name__in=("super_admin", "hr_admin"),
    ).distinct()
    count = 0
    for user in hr_users:
        notify(
            user, "general", title,
            message=body,
            action_url=f"/payroll/review/?year={year}&month={month}",
            send_email=True,
        )
        count += 1
    return count


def build_weekly_hr_digest(tenant) -> dict:
    """Aggregate HR metrics for the past 7 days."""
    from apps.employees.models import Employee
    from apps.leaves.models import LeaveRequest
    from apps.recruitment.models import JobApplication
    from apps.attendance.models import AttendanceDay

    today = timezone.localdate()
    week_start = today - timedelta(days=7)

    active_employees = Employee.objects.filter(tenant=tenant, is_active=True).count()
    new_joiners = Employee.objects.filter(
        tenant=tenant,
        date_of_joining__gte=week_start,
        date_of_joining__lte=today,
    ).count()
    exits = Employee.objects.filter(
        tenant=tenant,
        date_of_exit__gte=week_start,
        date_of_exit__lte=today,
    ).count()

    pending_leaves = LeaveRequest.objects.filter(
        tenant=tenant,
        status="pending",
    ).count()

    new_applications = JobApplication.objects.filter(
        tenant=tenant,
        applied_at__date__gte=week_start,
    ).count()

    from apps.attendance.models import AttendanceRecord

    absent_days = AttendanceRecord.objects.filter(
        tenant=tenant,
        attendance_date__gte=week_start,
        status__in=["absent", "half_day"],
    ).count()

    return {
        "period": f"{week_start.isoformat()} to {today.isoformat()}",
        "active_employees": active_employees,
        "new_joiners": new_joiners,
        "exits": exits,
        "pending_leaves": pending_leaves,
        "new_applications": new_applications,
        "absent_days": absent_days,
    }


def send_weekly_hr_digest(tenant) -> int:
    """Notify HR admins with a weekly summary."""
    from apps.accounts.models import User

    digest = build_weekly_hr_digest(tenant)
    title = "Weekly HR digest"
    body = (
        f"Active employees: {digest['active_employees']}\n"
        f"New joiners (7d): {digest['new_joiners']}\n"
        f"Exits (7d): {digest['exits']}\n"
        f"Pending leave requests: {digest['pending_leaves']}\n"
        f"New job applications (7d): {digest['new_applications']}\n"
        f"Absent/half-day records (7d): {digest['absent_days']}"
    )

    hr_users = User.objects.filter(
        tenant=tenant,
        is_active=True,
        user_roles__role__name__in=("super_admin", "hr_admin"),
    ).distinct()
    count = 0
    for user in hr_users:
        notify(user, "general", title, message=body, action_url="/")
        count += 1
    return count
