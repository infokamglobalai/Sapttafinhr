"""Employee self-service — job profile hub."""
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone

from apps.hr_ops.models import AssetAssignment, EmployeeOnboarding
from apps.leaves.models import LeaveBalance, LeaveRequest
from apps.projects.access import projects_for_employee
from utils.access import employee_profile_required, my_team_scope


@login_required
def my_work(request):
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        return redirect("tenants:dashboard")

    year = timezone.localdate().year
    leave_balances = (
        LeaveBalance.objects.filter(employee=employee, year=year)
        .select_related("leave_type")
        .order_by("leave_type__name")
    )
    active_assets = AssetAssignment.objects.filter(
        employee=employee, returned_at__isnull=True
    ).count()
    onboarding = (
        EmployeeOnboarding.objects.filter(employee=employee, completed_at__isnull=True)
        .order_by("-started_at")
        .first()
    )
    projects = projects_for_employee(employee).filter(status__in=("planning", "active"))[:6]
    shared_letters = employee.hr_letters.filter(is_shared=True).order_by("-shared_at")[:5]

    exit_request = None
    settlement_info = None
    try:
        from apps.hr_ops.models import ExitRequest
        from apps.payroll.settlement import settlement_estimate

        exit_request = (
            ExitRequest.objects.select_related("hr_acknowledged_by")
            .filter(employee=employee, tenant=request.tenant)
            .first()
        )
        if exit_request:
            lwd = exit_request.last_working_date or timezone.localdate()
            if exit_request.settlement_amount is not None and exit_request.settlement_computed_at:
                settlement_info = {
                    "label": exit_request.settlement_label or "Settlement",
                    "amount": exit_request.settlement_amount,
                    "currency": request.tenant.currency,
                }
            else:
                est = settlement_estimate(employee, lwd, tenant=request.tenant)
                settlement_info = {
                    "label": est.get("label") or "Settlement",
                    "amount": est.get("amount"),
                    "currency": est.get("currency", request.tenant.currency),
                }
    except Exception:
        pass

    return render(request, "employees/my_work.html", {
        "employee": employee,
        "leave_balances": leave_balances,
        "active_assets": active_assets,
        "onboarding": onboarding,
        "projects": projects,
        "shared_letters": shared_letters,
        "exit_request": exit_request,
        "settlement_info": settlement_info,
    })


@employee_profile_required
def my_team(request):
    """Manager / HR hub — direct reports or org-wide oversight."""
    user = request.user
    if not user.is_manager:
        return redirect("tenants:dashboard")

    employee = getattr(user, "employee_profile", None)
    if not employee:
        return redirect("tenants:dashboard")

    from apps.attendance.models import AttendanceRecord, AttendanceRegularization
    from apps.hr_ops.models import ServiceRequest
    from apps.leaves.models import CompOffCredit
    from apps.payroll.models import ExpenseClaim

    scope = my_team_scope(user, request.tenant, employee)
    team_ids = scope["ids"]
    today = timezone.localdate()

    pending_leaves = LeaveRequest.objects.filter(
        tenant=request.tenant, employee_id__in=team_ids, status="pending"
    ).count()
    pending_comp_off = CompOffCredit.objects.filter(
        tenant=request.tenant, employee_id__in=team_ids, status="pending"
    ).count()
    pending_expenses = ExpenseClaim.objects.filter(
        tenant=request.tenant, employee_id__in=team_ids, status="pending"
    ).count()
    pending_requests = ServiceRequest.objects.filter(
        tenant=request.tenant,
        employee_id__in=team_ids,
        status="pending_manager",
    ).count()
    pending_corrections = AttendanceRegularization.objects.filter(
        tenant=request.tenant, employee_id__in=team_ids, status="pending"
    ).count()

    present_today = AttendanceRecord.objects.filter(
        tenant=request.tenant,
        employee_id__in=team_ids,
        attendance_date=today,
        status="present",
    ).count() if team_ids else 0
    on_leave_today = LeaveRequest.objects.filter(
        tenant=request.tenant,
        employee_id__in=team_ids,
        status="approved",
        from_date__lte=today,
        to_date__gte=today,
    ).count() if team_ids else 0

    pending_leaves_list = (
        LeaveRequest.objects.filter(
            tenant=request.tenant, employee_id__in=team_ids, status="pending"
        )
        .select_related("employee", "leave_type")
        .order_by("-applied_at")[:5]
        if team_ids else
        LeaveRequest.objects.none()
    )

    team_actions = [
        {"label": "Leave approvals", "url_name": "leaves:pending", "count": pending_leaves},
        {"label": "Comp-off approvals", "url_name": "leaves:comp_off_pending", "count": pending_comp_off},
        {"label": "Expense approvals", "url_name": "payroll:team_expenses", "count": pending_expenses},
        {"label": "Request approvals", "url_name": "hr_ops:team_service_requests", "count": pending_requests},
        {"label": "Attendance corrections", "url_name": "attendance:regularizations", "count": pending_corrections},
    ]
    team_tools = [
        {"label": "Team attendance", "url_name": "attendance:team_attendance"},
        {"label": "Team reviews", "url_name": "performance:team_reviews"},
    ]

    for item in team_actions + team_tools:
        try:
            item["url"] = reverse(item["url_name"])
        except Exception:
            item["url"] = ""

    return render(request, "employees/my_team.html", {
        "employee": employee,
        "team_scope": scope,
        "team": scope["preview"],
        "team_size": scope["workforce_total"],
        "pending_total": sum(a["count"] for a in team_actions),
        "present_today": present_today,
        "on_leave_today": on_leave_today,
        "pending_leaves_list": pending_leaves_list,
        "team_actions": [a for a in team_actions if a.get("url")],
        "team_tools": [t for t in team_tools if t.get("url")],
    })
