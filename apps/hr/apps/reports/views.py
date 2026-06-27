import datetime

from django.contrib import messages
from django.db.models import Count, Sum
from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.http import require_POST

from utils.access import perm_required
from utils.excel import make_workbook, apply_header_row, auto_fit_columns, workbook_response


@perm_required("reports.view")
def report_hub(request):
    return render(request, "reports/index.html")


def _parse_dates(request):
    today = timezone.localdate()
    start = request.GET.get("from")
    end = request.GET.get("to")
    try:
        start_date = datetime.date.fromisoformat(start) if start else today.replace(day=1)
        end_date = datetime.date.fromisoformat(end) if end else today
    except ValueError:
        start_date = today.replace(day=1)
        end_date = today
    if start_date > end_date:
        start_date, end_date = end_date, start_date
    return start_date, end_date


@perm_required("reports.view")
def leave_report(request):
    from apps.leaves.models import LeaveRequest

    tenant = request.tenant
    start_date, end_date = _parse_dates(request)
    status = request.GET.get("status", "")

    qs = LeaveRequest.objects.filter(
        tenant=tenant,
        from_date__lte=end_date,
        to_date__gte=start_date,
    ).select_related("employee", "leave_type").order_by("-applied_at")

    if status:
        qs = qs.filter(status=status)

    return render(request, "reports/leave.html", {
        "rows": qs[:500],
        "start_date": start_date,
        "end_date": end_date,
        "status": status,
        "total": qs.count(),
    })


@perm_required("reports.export")
def leave_report_export(request):
    from apps.leaves.models import LeaveRequest

    tenant = request.tenant
    start_date, end_date = _parse_dates(request)
    status = request.GET.get("status", "")

    qs = LeaveRequest.objects.filter(
        tenant=tenant,
        from_date__lte=end_date,
        to_date__gte=start_date,
    ).select_related("employee", "leave_type").order_by("employee__first_name")

    if status:
        qs = qs.filter(status=status)

    wb = make_workbook()
    ws = wb.active
    ws.title = "Leave Report"
    headers = ["Employee Code", "Employee", "Leave Type", "From", "To", "Days", "Status", "Applied"]
    apply_header_row(ws, headers)
    for i, row in enumerate(qs, start=2):
        ws.append([
            row.employee.employee_code,
            row.employee.full_name,
            row.leave_type.code,
            row.from_date.isoformat(),
            row.to_date.isoformat(),
            float(row.total_days),
            row.status,
            row.applied_at.date().isoformat() if row.applied_at else "",
        ])
    auto_fit_columns(ws)
    return workbook_response(wb, f"leave_report_{start_date}_{end_date}.xlsx")


@perm_required("reports.view")
def attendance_report(request):
    from apps.attendance.models import AttendanceRecord

    tenant = request.tenant
    start_date, end_date = _parse_dates(request)
    dept_id = request.GET.get("department")

    qs = AttendanceRecord.objects.filter(
        tenant=tenant,
        attendance_date__range=(start_date, end_date),
    ).select_related("employee", "employee__department")

    if dept_id:
        qs = qs.filter(employee__department_id=dept_id)

    summary = qs.values("status").annotate(count=Count("id")).order_by("status")

    from apps.employees.models import Department
    departments = Department.objects.filter(tenant=tenant, is_active=True)

    return render(request, "reports/attendance.html", {
        "rows": qs.order_by("-attendance_date", "employee__first_name")[:500],
        "summary": summary,
        "start_date": start_date,
        "end_date": end_date,
        "departments": departments,
        "selected_dept": dept_id,
        "total": qs.count(),
    })


@perm_required("reports.export")
def attendance_report_export(request):
    from apps.attendance.models import AttendanceRecord

    tenant = request.tenant
    start_date, end_date = _parse_dates(request)

    qs = AttendanceRecord.objects.filter(
        tenant=tenant,
        attendance_date__range=(start_date, end_date),
    ).select_related("employee", "employee__department").order_by("attendance_date", "employee__first_name")

    wb = make_workbook()
    ws = wb.active
    ws.title = "Attendance"
    apply_header_row(ws, ["Date", "Employee Code", "Employee", "Department", "Status", "Working Mins"])
    for row in qs:
        ws.append([
            row.attendance_date.isoformat(),
            row.employee.employee_code,
            row.employee.full_name,
            row.employee.department.name if row.employee.department else "",
            row.status,
            row.net_working_minutes or 0,
        ])
    auto_fit_columns(ws)
    return workbook_response(wb, f"attendance_{start_date}_{end_date}.xlsx")


@perm_required("reports.view")
def headcount_report(request):
    from apps.employees.models import Employee

    tenant = request.tenant
    employees = Employee.objects.filter(tenant=tenant).select_related("department", "designation")
    status = request.GET.get("status", "active")
    if status:
        employees = employees.filter(employment_status=status)

    by_dept = employees.values("department__name").annotate(count=Count("id")).order_by("-count")
    by_desig = employees.values("designation__name").annotate(count=Count("id")).order_by("-count")[:15]

    return render(request, "reports/headcount.html", {
        "employees": employees.order_by("first_name", "last_name")[:500],
        "by_dept": by_dept,
        "by_desig": by_desig,
        "status": status,
        "total": employees.count(),
    })


@perm_required("reports.export")
def headcount_report_export(request):
    from apps.employees.models import Employee

    tenant = request.tenant
    employees = Employee.objects.filter(tenant=tenant).select_related("department", "designation")
    status = request.GET.get("status", "active")
    if status:
        employees = employees.filter(employment_status=status)

    wb = make_workbook()
    ws = wb.active
    ws.title = "Headcount"
    apply_header_row(ws, ["Code", "Name", "Department", "Designation", "Status", "DOJ", "Manager"])
    for emp in employees.order_by("first_name"):
        ws.append([
            emp.employee_code,
            emp.full_name,
            emp.department.name if emp.department else "",
            emp.designation.name if emp.designation else "",
            emp.employment_status,
            emp.date_of_joining.isoformat() if emp.date_of_joining else "",
            emp.reporting_manager.full_name if emp.reporting_manager else "",
        ])
    auto_fit_columns(ws)
    return workbook_response(wb, "headcount_report.xlsx")


@perm_required("reports.view")
def manpower_report(request):
    from apps.tenants.jurisdiction import is_gcc_payroll
    from .manpower import build_manpower_summary

    tenant = request.tenant
    if not is_gcc_payroll(tenant.payroll_jurisdiction):
        messages.info(request, "Manpower report is available for GCC / Kuwait workspaces.")
        return redirect("reports:index")

    summary = build_manpower_summary(tenant)
    return render(request, "reports/manpower.html", {"summary": summary})


@perm_required("reports.export")
def manpower_report_export(request):
    from apps.tenants.jurisdiction import is_gcc_payroll
    from .manpower import manpower_export_rows

    tenant = request.tenant
    if not is_gcc_payroll(tenant.payroll_jurisdiction):
        messages.info(request, "Manpower export is for GCC workspaces.")
        return redirect("reports:index")

    from django.utils import timezone
    rows = manpower_export_rows(tenant)
    if rows and rows[0][0] == "Manpower / Establishment Report":
        rows[3] = ["Report date", timezone.localdate().isoformat()]

    wb = make_workbook()
    ws = wb.active
    ws.title = "Manpower"
    for row in rows:
        ws.append(row)
    auto_fit_columns(ws)
    return workbook_response(wb, f"manpower_{tenant.subdomain}.xlsx")


@perm_required("reports.view")
def payroll_summary_report(request):
    from apps.payroll.models import PayrollRun, PayrollRecord

    tenant = request.tenant
    run_id = request.GET.get("run")
    runs = PayrollRun.objects.filter(tenant=tenant).order_by("-year", "-month")

    records = PayrollRecord.objects.none()
    selected_run = None
    if run_id:
        selected_run = runs.filter(pk=run_id).first()
    elif runs.exists():
        selected_run = runs.first()

    if selected_run:
        records = PayrollRecord.objects.filter(
            payroll_run=selected_run
        ).select_related("employee").order_by("employee__first_name")

    totals = records.aggregate(
        gross=Sum("gross_earnings"),
        net=Sum("net_payable"),
        pf=Sum("pf_employee"),
        esi=Sum("esi_employee"),
        tds=Sum("tds"),
    )

    return render(request, "reports/payroll.html", {
        "runs": runs,
        "selected_run": selected_run,
        "records": records[:500],
        "totals": totals,
    })


@perm_required("reports.export")
def payroll_summary_export(request):
    from apps.payroll.models import PayrollRun, PayrollRecord

    tenant = request.tenant
    run = get_run_or_404(request, tenant)
    records = PayrollRecord.objects.filter(payroll_run=run).select_related("employee")

    wb = make_workbook()
    ws = wb.active
    ws.title = "Payroll Summary"
    apply_header_row(ws, ["Employee", "Gross", "Net", "PF", "ESI", "TDS"])
    for rec in records:
        ws.append([
            rec.employee.full_name,
            float(rec.gross_earnings or 0),
            float(rec.net_payable or 0),
            float(rec.pf_employee or 0),
            float(rec.esi_employee or 0),
            float(rec.tds or 0),
        ])
    auto_fit_columns(ws)
    return workbook_response(wb, f"payroll_summary_{run.year}_{run.month:02d}.xlsx")


def get_run_or_404(request, tenant):
    from apps.payroll.models import PayrollRun
    run_id = request.GET.get("run")
    if not run_id:
        run = PayrollRun.objects.filter(tenant=tenant).order_by("-year", "-month").first()
        if not run:
            from django.http import Http404
            raise Http404("No payroll runs found.")
        return run
    return get_object_or_404(PayrollRun, pk=run_id, tenant=tenant)


@perm_required("reports.export")
def monthly_report_pack_download(request):
    """Download ZIP of leave + attendance + payroll PDFs for a month."""
    from apps.reports.report_pack import build_monthly_report_pack

    tenant = request.tenant
    today = timezone.localdate()
    year = int(request.GET.get("year", today.year))
    month = int(request.GET.get("month", today.month))

    zip_bytes = build_monthly_report_pack(tenant, year, month)
    response = HttpResponse(zip_bytes, content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="hr_reports_{year}_{month:02d}.zip"'
    return response
