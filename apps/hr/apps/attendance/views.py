import datetime
import json

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.db.models import Q

from .models import AttendanceLog, AttendanceRecord, AttendanceRegularization, Shift, EmployeeShiftAssignment
from .services import validate_geo_fence, process_daily_attendance
from apps.employees.models import Employee


# ---------------------------------------------------------------------------
# Mobile / web punch (ESS)
# ---------------------------------------------------------------------------
@login_required
@require_POST
def punch(request):
    """
    API endpoint for GPS-based check-in / check-out.
    Accepts JSON: {log_type, latitude, longitude, accuracy_meters}
    """
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        return JsonResponse({"error": "No employee profile linked."}, status=400)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    log_type = data.get("log_type")
    if log_type not in ("check_in", "check_out"):
        return JsonResponse({"error": "log_type must be check_in or check_out."}, status=400)

    lat = data.get("latitude")
    lon = data.get("longitude")
    accuracy = data.get("accuracy_meters")

    is_within_fence = None
    matched_location = None
    if lat and lon:
        is_within_fence, matched_location = validate_geo_fence(employee, lat, lon)

    log = AttendanceLog.objects.create(
        tenant=request.tenant,
        employee=employee,
        log_time=timezone.now(),
        log_type=log_type,
        source="mobile",
        latitude=lat,
        longitude=lon,
        accuracy_meters=accuracy,
        location=matched_location,
        is_within_fence=is_within_fence,
        ip_address=_get_client_ip(request),
        device_info=data.get("device_info", {}),
    )

    # Trigger async processing for today
    from .tasks import process_employee_attendance
    process_employee_attendance.delay(
        str(request.tenant.id),
        employee.id,
        str(timezone.localdate()),
    )

    return JsonResponse({
        "status": "ok",
        "log_id": log.id,
        "log_type": log_type,
        "log_time": log.log_time.isoformat(),
        "is_within_fence": is_within_fence,
        "location": matched_location.name if matched_location else None,
    })


@login_required
def punch_status(request):
    """Return today's punch status for the logged-in employee (ESS dashboard widget)."""
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        return JsonResponse({"error": "No employee profile."}, status=400)

    today = timezone.localdate()
    today_logs = list(
        AttendanceLog.objects.filter(
            employee=employee, log_time__date=today
        ).order_by("log_time").values("log_type", "log_time", "is_within_fence")
    )

    try:
        record = AttendanceRecord.objects.get(
            tenant=request.tenant, employee=employee, attendance_date=today
        )
        status = record.status
        working_minutes = record.net_working_minutes
    except AttendanceRecord.DoesNotExist:
        status = None
        working_minutes = 0

    return JsonResponse({
        "today": str(today),
        "logs": today_logs,
        "status": status,
        "working_minutes": working_minutes,
    })


# ---------------------------------------------------------------------------
# Admin: attendance register view
# ---------------------------------------------------------------------------
@login_required
def attendance_register(request):
    tenant = request.tenant
    today = timezone.localdate()

    # Date range filter
    date_str = request.GET.get("date", str(today))
    try:
        selected_date = datetime.date.fromisoformat(date_str)
    except ValueError:
        selected_date = today

    dept_id = request.GET.get("department")
    search = request.GET.get("q", "").strip()

    records = AttendanceRecord.objects.filter(
        tenant=tenant, attendance_date=selected_date
    ).select_related("employee", "employee__department", "employee__designation", "shift")

    if dept_id:
        records = records.filter(employee__department_id=dept_id)
    if search:
        records = records.filter(
            Q(employee__first_name__icontains=search) | Q(employee__last_name__icontains=search)
        )

    from apps.employees.models import Department
    departments = Department.objects.filter(tenant=tenant, is_active=True)

    paginator = Paginator(records.order_by("employee__first_name"), 30)
    page_obj = paginator.get_page(request.GET.get("page"))

    if request.htmx:
        return render(request, "attendance/partials/attendance_table.html", {
            "page_obj": page_obj, "selected_date": selected_date
        })

    return render(request, "attendance/register.html", {
        "page_obj": page_obj,
        "selected_date": selected_date,
        "departments": departments,
        "selected_dept": dept_id,
        "search": search,
    })


@login_required
def my_attendance(request):
    """ESS: employee's own attendance history."""
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        messages.error(request, "No employee profile found.")
        return redirect("tenants:dashboard")

    # Default to current month
    today = timezone.localdate()
    year = int(request.GET.get("year", today.year))
    month = int(request.GET.get("month", today.month))

    records = AttendanceRecord.objects.filter(
        employee=employee, attendance_date__year=year, attendance_date__month=month
    ).order_by("attendance_date")

    return render(request, "attendance/my_attendance.html", {
        "records": records,
        "year": year,
        "month": month,
        "employee": employee,
    })


# ---------------------------------------------------------------------------
# Regularization
# ---------------------------------------------------------------------------
@login_required
def regularization_request(request):
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        return redirect("tenants:dashboard")

    if request.method == "POST":
        date_str = request.POST.get("attendance_date")
        reason = request.POST.get("reason", "").strip()
        in_time = request.POST.get("requested_in_time") or None
        out_time = request.POST.get("requested_out_time") or None

        try:
            att_date = datetime.date.fromisoformat(date_str)
        except (ValueError, TypeError):
            messages.error(request, "Invalid date.")
            return redirect("attendance:regularization")

        AttendanceRegularization.objects.create(
            tenant=request.tenant,
            employee=employee,
            attendance_date=att_date,
            requested_in_time=in_time,
            requested_out_time=out_time,
            reason=reason,
        )
        messages.success(request, "Regularization request submitted.")
        if request.htmx:
            return HttpResponse(headers={"HX-Redirect": "/attendance/my/"})
        return redirect("attendance:my_attendance")

    return render(request, "attendance/regularization_form.html")


@login_required
def regularization_list(request):
    """HR/Manager view of pending regularizations."""
    tenant = request.tenant
    qs = AttendanceRegularization.objects.filter(
        tenant=tenant, status="pending"
    ).select_related("employee").order_by("-requested_at")

    return render(request, "attendance/regularizations.html", {"regularizations": qs})


@login_required
@require_POST
def regularization_action(request, pk):
    tenant = request.tenant
    reg = get_object_or_404(AttendanceRegularization, pk=pk, tenant=tenant)
    action = request.POST.get("action")

    if action not in ("approve", "reject"):
        return HttpResponse(status=400)

    reg.status = "approved" if action == "approve" else "rejected"
    reg.remarks = request.POST.get("remarks", "")
    reg.actioned_by = request.user
    reg.actioned_at = timezone.now()
    reg.save()

    # Re-process attendance if approved
    if reg.status == "approved":
        from .tasks import process_employee_attendance
        process_employee_attendance.delay(
            str(tenant.id), reg.employee_id, str(reg.attendance_date)
        )

    # Notify the employee
    try:
        from apps.hr_ops.services import notify
        if reg.employee.user:
            ntype = "attendance_regularization_approved" if reg.status == "approved" else "attendance_regularization_rejected"
            verb = "approved" if reg.status == "approved" else "declined"
            notify(
                reg.employee.user, ntype,
                f"Your attendance correction for {reg.attendance_date.strftime('%d %b')} was {verb}",
                message=f"For {reg.attendance_date.strftime('%d %b %Y')}." + (f"\n\nRemarks: {reg.remarks}" if reg.remarks else ""),
                action_url="/attendance/my/",
            )
    except Exception:
        pass

    if request.htmx:
        qs = AttendanceRegularization.objects.filter(tenant=tenant, status="pending").select_related("employee")
        return render(request, "attendance/partials/regularization_list.html", {"regularizations": qs})
    return redirect("attendance:regularizations")


# ---------------------------------------------------------------------------
# Shift management
# ---------------------------------------------------------------------------
@login_required
def shift_list(request):
    tenant = request.tenant
    shifts = Shift.objects.filter(tenant=tenant).order_by("name")
    return render(request, "attendance/shifts.html", {"shifts": shifts})


@login_required
def shift_create_or_edit(request, pk=None):
    from .forms import ShiftForm
    tenant = request.tenant
    shift = get_object_or_404(Shift, pk=pk, tenant=tenant) if pk else None
    if request.method == "POST":
        form = ShiftForm(request.POST, instance=shift)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            obj.save()
            messages.success(request, f'Shift "{obj.name}" saved.')
            return redirect("attendance:shifts")
    else:
        form = ShiftForm(instance=shift)
    return render(request, "attendance/shift_form.html", {"form": form, "shift": shift})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_client_ip(request) -> str | None:
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
