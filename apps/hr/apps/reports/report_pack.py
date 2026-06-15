"""Build monthly HR report PDF pack (leave, attendance, payroll) as ZIP."""
from __future__ import annotations

import datetime
import io
import zipfile
from calendar import month_name

from django.db.models import Count

from utils.pdf import render_pdf


def _month_bounds(year: int, month: int) -> tuple[datetime.date, datetime.date]:
    start = datetime.date(year, month, 1)
    if month == 12:
        end = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        end = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)
    return start, end


def gather_leave_data(tenant, start: datetime.date, end: datetime.date) -> dict:
    from apps.leaves.models import LeaveRequest

    qs = LeaveRequest.objects.filter(
        tenant=tenant,
        from_date__lte=end,
        to_date__gte=start,
    ).select_related("employee", "leave_type").order_by("employee__first_name")

    by_status = list(qs.values("status").annotate(count=Count("id")).order_by("status"))
    rows = [
        {
            "code": r.employee.employee_code,
            "name": r.employee.full_name,
            "type": r.leave_type.code,
            "from": r.from_date,
            "to": r.to_date,
            "days": r.total_days,
            "status": r.status,
        }
        for r in qs[:200]
    ]
    return {"rows": rows, "by_status": by_status, "total": qs.count()}


def gather_attendance_data(tenant, start: datetime.date, end: datetime.date) -> dict:
    from apps.attendance.models import AttendanceRecord, MonthlyAttendanceSummary

    summary = (
        AttendanceRecord.objects.filter(
            tenant=tenant,
            attendance_date__range=(start, end),
        )
        .values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )

    monthly = MonthlyAttendanceSummary.objects.filter(
        tenant=tenant, year=start.year, month=start.month,
    ).select_related("employee").order_by("employee__first_name")

    emp_rows = [
        {
            "code": s.employee.employee_code,
            "name": s.employee.full_name,
            "present": s.present_days,
            "leave": s.on_leave_days,
            "absent": s.absent_days,
            "lop": s.lop_days,
        }
        for s in monthly
    ]
    return {
        "status_breakdown": list(summary),
        "employee_rows": emp_rows,
        "total_records": AttendanceRecord.objects.filter(
            tenant=tenant, attendance_date__range=(start, end),
        ).count(),
    }


def gather_payroll_data(tenant, year: int, month: int) -> dict | None:
    from apps.payroll.models import PayrollRun, PayrollRecord

    run = PayrollRun.objects.filter(tenant=tenant, year=year, month=month).first()
    if not run:
        return None

    records = (
        PayrollRecord.objects.filter(payroll_run=run)
        .select_related("employee", "employee__department")
        .order_by("employee__first_name")
    )
    return {
        "run": run,
        "records": [
            {
                "code": r.employee.employee_code,
                "name": r.employee.full_name,
                "dept": r.employee.department.name if r.employee.department else "—",
                "paid_days": r.paid_days,
                "lop": r.lop_days,
                "gross": r.gross_earnings,
                "deductions": r.total_deductions,
                "net": r.net_payable,
            }
            for r in records
        ],
    }


def build_monthly_report_pack(tenant, year: int, month: int) -> bytes:
    """Return ZIP bytes with leave, attendance, and payroll summary PDFs."""
    start, end = _month_bounds(year, month)
    period = f"{month_name[month]} {year}"

    leave_data = gather_leave_data(tenant, start, end)
    att_data = gather_attendance_data(tenant, start, end)
    payroll_data = gather_payroll_data(tenant, year, month)

    base_ctx = {"tenant": tenant, "period": period, "start": start, "end": end}

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            f"leave_report_{year}_{month:02d}.pdf",
            render_pdf("reports/pdf/leave_report.html", {**base_ctx, **leave_data}),
        )
        zf.writestr(
            f"attendance_report_{year}_{month:02d}.pdf",
            render_pdf("reports/pdf/attendance_report.html", {**base_ctx, **att_data}),
        )
        if payroll_data:
            zf.writestr(
                f"payroll_summary_{year}_{month:02d}.pdf",
                render_pdf(
                    "reports/pdf/payroll_summary.html",
                    {**base_ctx, **payroll_data},
                ),
            )

    return buf.getvalue()
