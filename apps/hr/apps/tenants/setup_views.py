"""HR first-run setup — forced wizard until tenant.setup_complete.

Server-rendered (HR has no SPA). One page collects the essentials so HR is
actually usable: company info, departments, leave types, and the first
employees. On submit we create the records, provision login accounts for every
employee that has an email, and redirect to a one-time credentials summary
page so the admin can share passwords before entering the workspace.

Gated by tenants.middleware.TenantMiddleware (redirects here until complete).
"""
from __future__ import annotations

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_GET


@login_required
@require_http_methods(["GET", "POST"])
def setup(request):
    tenant = getattr(request, "tenant", None)
    if tenant is None:
        return redirect("/auth/login/")
    if tenant.setup_complete:
        return redirect("tenants:dashboard")

    if request.method == "POST":
        return _handle_submit(request, tenant)

    return render(request, "tenants/setup.html", {"tenant": tenant})


@login_required
@require_GET
def setup_complete(request):
    """One-time credentials display after setup. Reads and clears the session."""
    credentials = request.session.pop("setup_credentials", None)
    company_name = request.session.pop("setup_company_name", "")
    login_url = request.session.pop("setup_login_url", "")
    if not credentials:
        return redirect("tenants:dashboard")
    return render(request, "tenants/setup_complete.html", {
        "credentials": credentials,
        "company_name": company_name,
        "login_url": login_url or request.build_absolute_uri("/auth/employee-login/"),
    })


def _handle_submit(request, tenant):
    from apps.employees.models import Department, Employee
    from apps.employees.services import provision_employee_login
    from apps.leaves.models import LeaveType

    p = request.POST

    # 1) Company info
    tenant.name    = (p.get("company_name") or tenant.name).strip()
    tenant.gstin   = (p.get("gstin") or "").strip()
    tenant.pan     = (p.get("pan") or "").strip()
    tenant.address = (p.get("address") or "").strip()
    tenant.save(update_fields=["name", "gstin", "pan", "address"])

    # 2) Departments (newline-separated)
    dept_names = [d.strip() for d in (p.get("departments") or "").splitlines() if d.strip()]
    dept_by_name = {}
    for name in dept_names:
        dept, _ = Department.objects.get_or_create(tenant=tenant, name=name)
        dept_by_name[name.lower()] = dept

    # 3) Leave types
    for name, code in zip(p.getlist("leave_name[]"), p.getlist("leave_code[]")):
        name, code = name.strip(), code.strip().upper()
        if name and code:
            LeaveType.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name})

    # 4) Employees — collect newly created ones for login provisioning
    emp_codes  = p.getlist("emp_code[]")
    emp_first  = p.getlist("emp_first[]")
    emp_last   = p.getlist("emp_last[]")
    emp_doj    = p.getlist("emp_doj[]")
    emp_dept   = p.getlist("emp_dept[]")
    emp_email  = p.getlist("emp_email[]")
    emp_role   = p.getlist("emp_role[]")

    new_employees = []
    for i, code in enumerate(emp_codes):
        code  = (code or "").strip()
        first = (emp_first[i]  if i < len(emp_first)  else "").strip()
        last  = (emp_last[i]   if i < len(emp_last)   else "").strip()
        doj   = (emp_doj[i]    if i < len(emp_doj)    else "").strip()
        if not (code and first and doj):
            continue
        dept  = dept_by_name.get((emp_dept[i]  if i < len(emp_dept)  else "").strip().lower())
        email = (emp_email[i]  if i < len(emp_email)  else "").strip()
        role  = (emp_role[i]   if i < len(emp_role)   else "employee").strip() or "employee"

        from apps.employees.services import create_employee, _parse_date
        from apps.tenants.limits import check_employee_capacity, EmployeeLimitExceeded

        emp, created = None, False
        try:
            check_employee_capacity(tenant, additional=1)
        except EmployeeLimitExceeded as exc:
            messages.error(request, str(exc))
            return redirect("tenants:setup")

        try:
            doj_parsed = _parse_date(doj)
        except ValueError as exc:
            messages.error(request, f"Invalid date for {code}: {exc}")
            return redirect("tenants:setup")

        emp, _ = create_employee(
            tenant,
            {
                "employee_code": code,
                "first_name": first,
                "last_name": last,
                "date_of_joining": doj_parsed,
                "department": dept,
                "official_email": email,
                "employment_status": "active",
            },
            created_by=request.user,
        )
        new_employees.append((emp, email, role))

    # 5) Provision login accounts + assign roles for every new employee with email
    from apps.employees.access_services import build_invite_url, set_employee_roles
    from apps.employees.services import provision_employee_login, email_employee_invite, invite_delivery_message
    from apps.employees.access_services import get_login_url

    credentials = []
    for emp, email, role_name in new_employees:
        if not email:
            continue
        try:
            user, needs_invite = provision_employee_login(emp, created_by=request.user)
            role_names = [role_name.lower()] if role_name else ["employee"]
            set_employee_roles(user, role_names, granted_by=request.user)
            if needs_invite:
                invite_url = build_invite_url(request, user)
                login_url = get_login_url(request)
                mail_result = email_employee_invite(emp, invite_url, login_url)
                credentials.append({
                    "name": emp.full_name or emp.employee_code,
                    "code": emp.employee_code,
                    "email": email,
                    "invite_url": invite_url,
                    "role": role_name.replace("_", " ").title(),
                    "emailed": mail_result.get("sent"),
                    "email_note": invite_delivery_message(
                        mail_result, email=email, employee_name=emp.full_name,
                    ),
                })
        except Exception as exc:
            messages.warning(
                request,
                f"Could not invite {emp.full_name or emp.employee_code} ({email}): {exc}",
            )

    tenant.employee_count = Employee.objects.filter(tenant=tenant, is_active=True).count()

    from apps.payroll.bootstrap import bootstrap_payroll_for_tenant
    from apps.leaves.models import HolidayCalendar

    if tenant.is_india_payroll or tenant.is_gcc_payroll:
        try:
            bootstrap_payroll_for_tenant(tenant, assign_salaries=True)
        except Exception:
            pass

    year = timezone.localdate().year
    if not HolidayCalendar.objects.filter(tenant=tenant, year=year).exists():
        HolidayCalendar.objects.create(
            tenant=tenant,
            name=f"Company Calendar {year}",
            year=year,
            is_default=True,
        )

    tenant.setup_complete = True
    tenant.save(update_fields=["employee_count", "setup_complete"])

    if credentials:
        request.session["setup_credentials"] = credentials
        request.session["setup_company_name"] = tenant.name
        request.session["setup_login_url"] = get_login_url(request)
        return redirect("tenants:setup_complete")

    messages.success(request, f"Setup complete — {len(new_employees)} employee(s) added.")
    return redirect("tenants:dashboard")


def _ensure_role(tenant, role_name: str):
    """Ensure role row exists (legacy helper; roles are assigned via set_employee_roles)."""
    from apps.accounts.models import Role
    Role.objects.get_or_create(tenant=tenant, name=role_name.lower(), defaults={"is_system": True})
