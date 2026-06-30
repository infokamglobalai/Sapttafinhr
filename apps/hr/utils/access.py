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
        user = request.user
        if not getattr(user, "employee_profile", None) and (user.is_hr_admin or user.is_manager):
            from apps.employees.profile_link import ensure_user_employee_profile

            ensure_user_employee_profile(user, tenant=request.tenant)
        if not getattr(user, "employee_profile", None):
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


def my_team_scope(user, tenant, manager_emp):
    """
    Resolve whose data appears on My Team:
    - direct reports when assigned
    - whole workforce for HR admins with no direct reports
  """
    from apps.employees.models import Employee

    direct_qs = Employee.objects.filter(
        tenant=tenant,
        reporting_manager=manager_emp,
        employment_status="active",
    )
    direct_ids = list(direct_qs.values_list("id", flat=True))

    if direct_ids:
        return {
            "mode": "direct",
            "ids": direct_ids,
            "section_title": "Direct reports",
            "subtitle": (
                "Approvals, attendance, and reviews for people who report to you."
            ),
            "preview": direct_qs.select_related("department", "designation").order_by(
                "first_name", "last_name"
            ),
            "use_hr_profile": False,
            "workforce_total": len(direct_ids),
        }

    if has_full_team_scope(user):
        all_ids = team_employee_ids(user, tenant)
        all_ids = [i for i in all_ids if i != manager_emp.pk]
        preview = (
            Employee.objects.filter(tenant=tenant, pk__in=all_ids, employment_status="active")
            .select_related("department", "designation")
            .order_by("-date_of_joining", "first_name")[:12]
        )
        return {
            "mode": "org",
            "ids": all_ids,
            "section_title": "Workforce snapshot",
            "subtitle": (
                "As HR you oversee the whole company — use the queues below to "
                "approve leave, expenses, and requests for anyone."
            ),
            "preview": preview,
            "use_hr_profile": True,
            "workforce_total": len(all_ids),
        }

    return {
        "mode": "empty",
        "ids": [],
        "section_title": "",
        "subtitle": (
            "When HR assigns employees to report to you, their profiles and "
            "pending approvals will show up here."
        ),
        "preview": Employee.objects.none(),
        "use_hr_profile": False,
        "workforce_total": 0,
    }


def json_403(message: str):
    return JsonResponse({"error": message}, status=403)
