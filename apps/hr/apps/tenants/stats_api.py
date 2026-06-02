"""Internal HR stats JSON — consumed by the unified shell (FIN/SPA) for KPIs.

HR is server-rendered (htmx), not a REST product; the full HR experience is the
SSO-embedded Django app. This endpoint exposes just the headline workspace KPIs
(already computed for HR's own dashboard) so the SPA's HR home can show LIVE
numbers without re-implementing HR as a REST API.

Auth: SSO_SHARED_SECRET (Bearer), same control-plane trust as provisioning.
Workspace selected via ?workspace=<subdomain>. Plain Django (no DRF dep).
"""
from __future__ import annotations

import hmac
from datetime import date

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods


def _authorized(request) -> bool:
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        return False
    header = request.headers.get("Authorization", "")
    presented = header[7:] if header.startswith("Bearer ") else ""
    return bool(presented) and hmac.compare_digest(presented, secret)


@require_http_methods(["GET"])
def hr_stats(request):
    """GET /internal/stats/?workspace=<subdomain>  (Bearer SSO_SHARED_SECRET)."""
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    from apps.tenants.models import Tenant

    workspace = (request.GET.get("workspace") or "").strip().lower()
    tenant = Tenant.objects.filter(subdomain=workspace).first()
    if not tenant:
        return JsonResponse({"detail": "Unknown workspace."}, status=404)

    from apps.attendance.models import AttendanceRecord, AttendanceRegularization
    from apps.employees.models import Employee
    from apps.leaves.models import LeaveRequest

    today = date.today()
    month_start = today.replace(day=1)
    active = Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")

    return JsonResponse({
        "workspace": workspace,
        "total_employees": active.count(),
        "present_today": AttendanceRecord.objects.filter(tenant=tenant, attendance_date=today, status="present").count(),
        "on_leave_today": LeaveRequest.objects.filter(
            tenant=tenant, status="approved", from_date__lte=today, to_date__gte=today,
        ).count(),
        "pending_leave_approvals": LeaveRequest.objects.filter(tenant=tenant, status="pending").count(),
        "pending_regularizations": AttendanceRegularization.objects.filter(tenant=tenant, status="pending").count(),
        "new_joiners_this_month": active.filter(date_of_joining__gte=month_start).count(),
    })
