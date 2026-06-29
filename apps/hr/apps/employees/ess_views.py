"""Employee self-service — job profile hub."""
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.utils import timezone

from apps.hr_ops.models import AssetAssignment, EmployeeOnboarding
from apps.leaves.models import LeaveBalance
from apps.projects.access import projects_for_employee


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
