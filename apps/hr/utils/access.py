"""Role and permission decorators for HRMS views."""
from functools import wraps

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden, JsonResponse
from django.shortcuts import redirect


def _deny(request, message: str):
    if request.headers.get("HX-Request") or "application/json" in request.headers.get("Accept", ""):
        return HttpResponseForbidden(message)
    messages.error(request, message)
    return redirect("tenants:dashboard")


def tenant_login_required(view_func):
    @wraps(view_func)
    @login_required
    def wrapper(request, *args, **kwargs):
        if not getattr(request, "tenant", None):
            messages.error(request, "This page requires a workspace login.")
            return redirect("accounts:login")
        return view_func(request, *args, **kwargs)
    return wrapper


def hr_admin_required(view_func):
    @wraps(view_func)
    @tenant_login_required
    def wrapper(request, *args, **kwargs):
        if not request.user.is_hr_admin:
            return _deny(request, "HR admin access required.")
        return view_func(request, *args, **kwargs)
    return wrapper


def manager_or_hr_required(view_func):
    @wraps(view_func)
    @tenant_login_required
    def wrapper(request, *args, **kwargs):
        if not (request.user.is_hr_admin or request.user.is_manager):
            return _deny(request, "Manager or HR admin access required.")
        return view_func(request, *args, **kwargs)
    return wrapper


def employee_profile_required(view_func):
    @wraps(view_func)
    @tenant_login_required
    def wrapper(request, *args, **kwargs):
        if not getattr(request.user, "employee_profile", None):
            messages.warning(
                request,
                "Your login is not linked to an employee record yet. Please contact HR.",
            )
            return redirect("tenants:dashboard")
        return view_func(request, *args, **kwargs)
    return wrapper


def perm_required(*codenames):
    def decorator(view_func):
        @wraps(view_func)
        @tenant_login_required
        def wrapper(request, *args, **kwargs):
            if request.user.is_hr_admin:
                return view_func(request, *args, **kwargs)
            if any(request.user.has_perm_code(c) for c in codenames):
                return view_func(request, *args, **kwargs)
            return _deny(request, "You do not have permission for this action.")
        return wrapper
    return decorator


def can_generate_letters(user) -> bool:
    return bool(user.is_hr_admin or user.has_perm_code("hr_ops.generate_letters"))


def can_approve_letters(user) -> bool:
    return bool(user.is_hr_admin or user.has_perm_code("hr_ops.approve_letters"))


def can_manage_company_vault(user) -> bool:
    return bool(user.is_hr_admin or user.has_perm_code("hr_ops.manage_company_vault"))


def can_issue_letter(user, letter) -> bool:
    """Issue PDF: generators for drafts; generators or approvers after approval."""
    if letter.status == "approved":
        return can_generate_letters(user) or can_approve_letters(user)
    if letter.status in ("draft", "rejected"):
        return can_generate_letters(user)
    return False


def can_manage_employee(user, employee) -> bool:
    if user.is_hr_admin or user.has_perm_code("leaves.approve_all"):
        return True
    manager = getattr(user, "employee_profile", None)
    return bool(manager and employee.reporting_manager_id == manager.id)


def has_full_team_scope(user) -> bool:
    """All-employee scope (HR ops) vs direct-report scope (managers)."""
    return user.is_hr_admin or user.has_perm_code("leaves.approve_all")


def can_review_employee(user, employee) -> bool:
    if user.is_hr_admin or user.has_perm_code("performance.manage"):
        return True
    if not user.has_perm_code("performance.review_team"):
        return False
    reviewer = getattr(user, "employee_profile", None)
    return bool(reviewer and employee.reporting_manager_id == reviewer.id)


def team_employee_ids(user, tenant):
    """Direct report IDs for managers; all active employees for HR admin."""
    if user.is_hr_admin or user.has_perm_code("employees.view"):
        from apps.employees.models import Employee
        return list(
            Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")
            .values_list("id", flat=True)
        )
    manager = getattr(user, "employee_profile", None)
    if not manager:
        return []
    from apps.employees.models import Employee
    return list(
        Employee.objects.filter(tenant=tenant, reporting_manager=manager, employment_status="active")
        .values_list("id", flat=True)
    )


def json_403(message: str):
    return JsonResponse({"error": message}, status=403)
