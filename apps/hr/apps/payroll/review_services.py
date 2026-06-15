"""Pre-payroll readiness checks and run totals refresh."""
from __future__ import annotations

import datetime
from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone

from apps.employees.models import Employee


def refresh_run_totals(payroll_run) -> None:
    """Re-aggregate payroll run summary from its records."""
    agg = payroll_run.records.aggregate(
        gross=Sum("gross_earnings"),
        ded=Sum("total_deductions"),
        net=Sum("net_payable"),
        pf_er=Sum("pf_employer"),
        esi_er=Sum("esi_employer"),
        lwf_er=Sum("lwf_employer"),
    )
    payroll_run.total_employees = payroll_run.records.count()
    payroll_run.total_gross = agg["gross"] or Decimal("0")
    payroll_run.total_deductions = agg["ded"] or Decimal("0")
    payroll_run.total_net = agg["net"] or Decimal("0")
    payroll_run.total_employer_cost = (
        (agg["pf_er"] or 0) + (agg["esi_er"] or 0) + (agg["lwf_er"] or 0)
    )
    payroll_run.save(
        update_fields=[
            "total_employees", "total_gross", "total_deductions",
            "total_net", "total_employer_cost",
        ]
    )


def prepare_month_attendance(tenant, year: int, month: int) -> int:
    """Compute monthly attendance summaries for all active employees."""
    from apps.attendance.services import compute_monthly_summary

    employees = Employee.objects.filter(
        tenant=tenant, is_active=True, employment_status__in=["active", "notice_period"],
    )
    count = 0
    for emp in employees:
        compute_monthly_summary(tenant, emp, year, month)
        count += 1
    return count


def _leave_days_in_month(tenant, employee, year: int, month: int) -> Decimal:
    from apps.leaves.models import LeaveRequest

    start = datetime.date(year, month, 1)
    if month == 12:
        end = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        end = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)

    total = Decimal("0")
    for lr in LeaveRequest.objects.filter(
        tenant=tenant,
        employee=employee,
        status="approved",
        from_date__lte=end,
        to_date__gte=start,
    ):
        total += lr.total_days
    return total


def build_monthly_readiness(tenant, year: int, month: int) -> dict:
    """
    Pre-payroll checklist: attendance, leave, salary, pending corrections.
    Returns rows + summary counts for HR review before running payroll.
    """
    from apps.attendance.models import AttendanceRegularization, MonthlyAttendanceSummary
    from apps.payroll.models import EmployeeSalary, PayrollRun

    employees = (
        Employee.objects.filter(
            tenant=tenant, is_active=True, employment_status__in=["active", "notice_period"],
        )
        .select_related("department", "designation")
        .order_by("first_name", "last_name")
    )

    month_start = datetime.date(year, month, 1)
    if month == 12:
        month_end = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        month_end = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)

    pending_regs = AttendanceRegularization.objects.filter(
        tenant=tenant, status="pending",
        attendance_date__range=(month_start, month_end),
    ).count()

    existing_run = PayrollRun.objects.filter(tenant=tenant, year=year, month=month).first()

    rows = []
    ready = 0
    blocked = 0

    for emp in employees:
        summary = MonthlyAttendanceSummary.objects.filter(
            tenant=tenant, employee=emp, year=year, month=month,
        ).first()

        has_salary = EmployeeSalary.objects.filter(
            tenant=tenant, employee=emp, is_active=True,
            effective_date__lte=month_end,
        ).exists()

        emp_pending_regs = AttendanceRegularization.objects.filter(
            tenant=tenant, employee=emp, status="pending",
            attendance_date__range=(month_start, month_end),
        ).count()

        issues = []
        if not has_salary:
            issues.append("No salary structure")
        if not summary:
            issues.append("Attendance not computed")
        if emp_pending_regs:
            issues.append(f"{emp_pending_regs} pending correction(s)")

        att_lop = Decimal("0")
        present = Decimal("0")
        on_leave = Decimal("0")
        absent = 0
        if summary:
            att_lop = summary.lop_days + Decimal(str(summary.absent_days))
            present = summary.present_days
            on_leave = summary.on_leave_days
            absent = summary.absent_days

        leave_days = _leave_days_in_month(tenant, emp, year, month)
        is_ready = not issues

        if is_ready:
            ready += 1
        else:
            blocked += 1

        rows.append({
            "employee": emp,
            "has_salary": has_salary,
            "summary": summary,
            "present_days": present,
            "on_leave_days": on_leave,
            "absent_days": absent,
            "lop_days": att_lop,
            "leave_days": leave_days,
            "pending_regs": emp_pending_regs,
            "issues": issues,
            "is_ready": is_ready,
        })

    return {
        "year": year,
        "month": month,
        "rows": rows,
        "total": len(rows),
        "ready_count": ready,
        "blocked_count": blocked,
        "pending_regs_total": pending_regs,
        "existing_run": existing_run,
        "all_ready": blocked == 0 and len(rows) > 0,
    }


def get_employee_month_context(tenant, employee, year: int, month: int, payroll_run=None) -> dict:
    """Attendance + leave + optional payroll record for one employee."""
    from apps.attendance.models import MonthlyAttendanceSummary, AttendanceRecord
    from apps.leaves.models import LeaveRequest
    from apps.payroll.models import PayrollRecord

    month_start = datetime.date(year, month, 1)
    if month == 12:
        month_end = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        month_end = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)

    summary = MonthlyAttendanceSummary.objects.filter(
        tenant=tenant, employee=employee, year=year, month=month,
    ).first()

    leaves = LeaveRequest.objects.filter(
        tenant=tenant, employee=employee,
        from_date__lte=month_end, to_date__gte=month_start,
    ).exclude(status__in=["cancelled", "withdrawn"]).select_related("leave_type").order_by("-from_date")

    attendance_days = (
        AttendanceRecord.objects.filter(
            tenant=tenant, employee=employee,
            attendance_date__range=(month_start, month_end),
        )
        .order_by("attendance_date")
    )

    record = None
    if payroll_run:
        record = PayrollRecord.objects.filter(
            payroll_run=payroll_run, employee=employee,
        ).first()

    return {
        "summary": summary,
        "leaves": leaves,
        "attendance_days": attendance_days,
        "record": record,
        "month_start": month_start,
        "month_end": month_end,
    }
