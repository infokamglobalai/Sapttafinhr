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

    return render(request, "employees/my_work.html", {
        "employee": employee,
        "leave_balances": leave_balances,
        "active_assets": active_assets,
        "onboarding": onboarding,
        "projects": projects,
        "shared_letters": shared_letters,
    })
