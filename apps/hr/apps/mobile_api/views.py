"""JSON API for the Saptta HR mobile app."""
from __future__ import annotations

import calendar
import datetime

from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.attendance.models import AttendanceLog, AttendanceRecord
from apps.attendance.services import validate_geo_fence
from apps.attendance.tasks import process_employee_attendance
from apps.attendance.views import _get_client_ip
from apps.employees.models import Employee
from apps.hr_ops.models import Notification
from apps.leaves.models import LeaveBalance, LeaveRequest, LeaveType
from apps.leaves.services import apply_leave, approve_leave, reject_leave
from apps.payroll.models import Payslip
from apps.payroll.payslip_services import render_payslip_html
from utils.access import can_manage_employee, has_full_team_scope, team_employee_ids
from utils.pdf import render_html_to_pdf

from .auth import json_body_required, mobile_api_login_required


def _employee_or_error(request):
    employee = getattr(request.user, "employee_profile", None)
    if employee is None:
        return None, JsonResponse({"detail": "No employee profile linked."}, status=400)
    return employee, None


def _serialize_user(request):
    user = request.user
    employee = getattr(user, "employee_profile", None)
    return {
        "email": user.email,
        "display_name": user.display_name,
        "role_label": user.role_label,
        "is_hr_admin": user.is_hr_admin,
        "is_manager": user.is_manager,
        "workspace": request.tenant.subdomain,
        "tenant_name": request.tenant.name,
        "employee": {
            "id": employee.id,
            "full_name": employee.full_name,
            "employee_code": employee.employee_code,
            "department": employee.department.name if employee and employee.department else None,
        }
        if employee
        else None,
    }


def _serialize_leave(req: LeaveRequest) -> dict:
    return {
        "id": req.id,
        "leave_type": req.leave_type.name,
        "leave_type_code": req.leave_type.code,
        "from_date": str(req.from_date),
        "to_date": str(req.to_date),
        "total_days": float(req.total_days),
        "half_day_type": req.half_day_type or "",
        "status": req.status,
        "reason": req.reason,
        "applied_at": req.applied_at.isoformat() if req.applied_at else None,
        "employee_name": req.employee.full_name if hasattr(req, "employee") else None,
    }


@csrf_exempt
@require_http_methods(["GET"])
@mobile_api_login_required
def me_view(request):
    return JsonResponse(_serialize_user(request))


@csrf_exempt
@require_http_methods(["GET"])
@mobile_api_login_required
def attendance_today(request):
    employee, err = _employee_or_error(request)
    if err:
        return err

    today = timezone.localdate()
    today_logs = list(
        AttendanceLog.objects.filter(employee=employee, log_time__date=today)
        .order_by("log_time")
        .values("log_type", "log_time", "is_within_fence", "location_id")
    )
    for row in today_logs:
        row["log_time"] = row["log_time"].isoformat()

    try:
        record = AttendanceRecord.objects.get(
            tenant=request.tenant, employee=employee, attendance_date=today
        )
        status = record.status
        working_minutes = record.net_working_minutes
    except AttendanceRecord.DoesNotExist:
        status = None
        working_minutes = 0

    return JsonResponse(
        {
            "today": str(today),
            "logs": today_logs,
            "status": status,
            "working_minutes": working_minutes,
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
@mobile_api_login_required
@json_body_required
def attendance_punch(request):
    employee, err = _employee_or_error(request)
    if err:
        return err

    data = request.json_data
    log_type = data.get("log_type")
    if log_type not in ("check_in", "check_out"):
        return JsonResponse({"detail": "log_type must be check_in or check_out."}, status=400)

    lat = data.get("latitude")
    lon = data.get("longitude")
    accuracy = data.get("accuracy_meters")

    is_within_fence = None
    matched_location = None
    if lat is not None and lon is not None:
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

    process_employee_attendance.delay(
        str(request.tenant.id),
        employee.id,
        str(timezone.localdate()),
    )

    return JsonResponse(
        {
            "status": "ok",
            "log_id": log.id,
            "log_type": log_type,
            "log_time": log.log_time.isoformat(),
            "is_within_fence": is_within_fence,
            "location": matched_location.name if matched_location else None,
        }
    )


@csrf_exempt
@require_http_methods(["GET"])
@mobile_api_login_required
def attendance_history(request):
    employee, err = _employee_or_error(request)
    if err:
        return err

    today = timezone.localdate()
    year = int(request.GET.get("year", today.year))
    month = int(request.GET.get("month", today.month))

    records = AttendanceRecord.objects.filter(
        employee=employee, attendance_date__year=year, attendance_date__month=month
    ).order_by("attendance_date")

    return JsonResponse(
        {
            "year": year,
            "month": month,
            "month_name": calendar.month_name[month],
            "records": [
                {
                    "date": str(r.attendance_date),
                    "status": r.status,
                    "first_in": r.first_in_time.isoformat() if r.first_in_time else None,
                    "last_out": r.last_out_time.isoformat() if r.last_out_time else None,
                    "net_working_minutes": r.net_working_minutes,
                    "late_by_minutes": r.late_by_minutes,
                }
                for r in records
            ],
        }
    )


@csrf_exempt
@require_http_methods(["GET"])
@mobile_api_login_required
def leave_balances(request):
    employee, err = _employee_or_error(request)
    if err:
        return err

    year = timezone.localdate().year
    balances = {
        b.leave_type_id: b
        for b in LeaveBalance.objects.filter(employee=employee, year=year).select_related("leave_type")
    }
    leave_types = LeaveType.objects.filter(tenant=request.tenant, is_active=True)

    return JsonResponse(
        {
            "year": year,
            "balances": [
                {
                    "leave_type_id": lt.id,
                    "leave_type": lt.name,
                    "code": lt.code,
                    "available": float(balances[lt.id].available) if lt.id in balances else 0.0,
                    "used": float(balances[lt.id].taken) if lt.id in balances else 0.0,
                }
                for lt in leave_types
            ],
        }
    )


@csrf_exempt
@require_http_methods(["GET"])
@mobile_api_login_required
def leave_requests_list(request):
    employee, err = _employee_or_error(request)
    if err:
        return err

    qs = (
        LeaveRequest.objects.filter(employee=employee)
        .select_related("leave_type")
        .order_by("-applied_at")[:50]
    )
    return JsonResponse({"requests": [_serialize_leave(r) for r in qs]})


@csrf_exempt
@require_http_methods(["POST"])
@mobile_api_login_required
@json_body_required
def leave_requests_create(request):
    employee, err = _employee_or_error(request)
    if err:
        return err

    data = request.json_data
    try:
        from_date = datetime.date.fromisoformat(data.get("from_date", ""))
        to_date = datetime.date.fromisoformat(data.get("to_date", ""))
        leave_type_id = int(data.get("leave_type_id"))
    except (ValueError, TypeError):
        return JsonResponse({"detail": "Invalid leave request fields."}, status=400)

    reason = (data.get("reason") or "").strip()
    half_day_type = data.get("half_day_type") or ""

    try:
        leave_req = apply_leave(
            request.tenant,
            employee,
            leave_type_id,
            from_date,
            to_date,
            half_day_type,
            reason,
            document=None,
        )
    except (ValueError, Exception) as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    return JsonResponse({"request": _serialize_leave(leave_req)}, status=201)


@csrf_exempt
@require_http_methods(["GET"])
@mobile_api_login_required
def payslips_list(request):
    employee, err = _employee_or_error(request)
    if err:
        return err

    payslips = Payslip.objects.filter(employee=employee, is_published=True).select_related(
        "payroll_record"
    ).order_by("-year", "-month")
    return JsonResponse(
        {
            "payslips": [
                {
                    "id": p.id,
                    "year": p.year,
                    "month": p.month,
                    "label": f"{calendar.month_name[p.month]} {p.year}",
                    "net_pay": float(p.payroll_record.net_payable) if p.payroll_record else None,
                }
                for p in payslips
            ]
        }
    )


@csrf_exempt
@require_http_methods(["GET"])
@mobile_api_login_required
def payslip_pdf(request, pk: int):
    employee, err = _employee_or_error(request)
    if err:
        return err

    payslip = Payslip.objects.filter(
        pk=pk, employee=employee, is_published=True
    ).select_related("payroll_record", "payroll_record__payroll_run", "template").first()
    if payslip is None:
        return JsonResponse({"detail": "Payslip not found."}, status=404)

    record = payslip.payroll_record
    run = record.payroll_run
    html, _layout = render_payslip_html(record, run, request.tenant, payslip.template)
    pdf_bytes = render_html_to_pdf(html)

    if request.GET.get("format") == "json":
        import base64

        return JsonResponse(
            {
                "filename": f"payslip_{payslip.year}_{payslip.month:02d}.pdf",
                "content_base64": base64.b64encode(pdf_bytes).decode("ascii"),
            }
        )

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="payslip_{payslip.year}_{payslip.month:02d}.pdf"'
    return response


@csrf_exempt
@require_http_methods(["GET"])
@mobile_api_login_required
def notifications_list(request):
    qs = Notification.objects.filter(recipient=request.user).order_by("-created_at")[:100]
    unread = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return JsonResponse(
        {
            "unread_count": unread,
            "notifications": [
                {
                    "id": n.id,
                    "type": n.notification_type,
                    "title": n.title,
                    "message": n.message,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat(),
                }
                for n in qs
            ],
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
@mobile_api_login_required
def notification_mark_read(request, pk: int):
    notif = Notification.objects.filter(pk=pk, recipient=request.user).first()
    if notif is None:
        return JsonResponse({"detail": "Not found."}, status=404)
    notif.mark_read()
    return JsonResponse({"ok": True})


def _pending_leaves_qs(request):
    tenant = request.tenant
    user = request.user
    employee = getattr(user, "employee_profile", None)
    if has_full_team_scope(user):
        return LeaveRequest.objects.filter(tenant=tenant, status="pending")
    if employee:
        return LeaveRequest.objects.filter(
            tenant=tenant,
            status="pending",
            employee__reporting_manager=employee,
        )
    return LeaveRequest.objects.none()


@csrf_exempt
@require_http_methods(["GET"])
@mobile_api_login_required
def approvals_leaves_list(request):
    if not (request.user.is_manager or request.user.is_hr_admin):
        return JsonResponse({"detail": "Manager access required."}, status=403)

    qs = _pending_leaves_qs(request).select_related("employee", "leave_type").order_by("-applied_at")
    items = []
    for req in qs[:50]:
        row = _serialize_leave(req)
        row["employee_name"] = req.employee.full_name
        items.append(row)
    return JsonResponse({"pending": items})


@csrf_exempt
@require_http_methods(["POST"])
@mobile_api_login_required
@json_body_required
def approvals_leaves_action(request, pk: int):
    if not (request.user.is_manager or request.user.is_hr_admin):
        return JsonResponse({"detail": "Manager access required."}, status=403)

    leave_req = LeaveRequest.objects.filter(pk=pk, tenant=request.tenant).select_related("employee").first()
    if leave_req is None:
        return JsonResponse({"detail": "Not found."}, status=404)
    if not can_manage_employee(request.user, leave_req.employee):
        return JsonResponse({"detail": "You cannot action leave for this employee."}, status=403)

    action = (request.json_data.get("action") or "").strip().lower()
    remarks = (request.json_data.get("remarks") or "").strip()

    try:
        if action == "approve":
            approve_leave(leave_req, actioned_by=request.user, remarks=remarks)
        elif action == "reject":
            reject_leave(leave_req, actioned_by=request.user, remarks=remarks)
        else:
            return JsonResponse({"detail": "action must be approve or reject."}, status=400)
    except ValueError as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    return JsonResponse({"request": _serialize_leave(leave_req)})
