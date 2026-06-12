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
    if not credentials:
        return redirect("tenants:dashboard")
    return render(request, "tenants/setup_complete.html", {
        "credentials": credentials,
        "company_name": company_name,
        "login_url": request.build_absolute_uri("/auth/login/"),
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

        emp, created = Employee.objects.get_or_create(
            tenant=tenant,
            employee_code=code,
            defaults={
                "first_name": first,
                "last_name":  last,
                "date_of_joining": doj,
                "department": dept,
                "official_email": email,
            },
        )
        if created:
            new_employees.append((emp, email, role))

    # 5) Provision login accounts for every new employee that has an email
    credentials = []
    for emp, email, role_name in new_employees:
        if not email:
            continue
        try:
            _ensure_role(tenant, role_name)
            user, password = provision_employee_login(emp, created_by=request.user)
            if password:
                credentials.append({
                    "name":     emp.full_name or emp.employee_code,
                    "code":     emp.employee_code,
                    "email":    email,
                    "password": password,
                    "role":     role_name.replace("_", " ").title(),
                })
        except Exception:
            pass  # No email or duplicate — skip silently

    tenant.employee_count = Employee.objects.filter(tenant=tenant, is_active=True).count()
    tenant.setup_complete = True
    tenant.save(update_fields=["employee_count", "setup_complete"])

    if credentials:
        request.session["setup_credentials"]  = credentials
        request.session["setup_company_name"] = tenant.name
        return redirect("tenants:setup_complete")

    messages.success(request, f"Setup complete — {len(new_employees)} employee(s) added.")
    return redirect("tenants:dashboard")


def _ensure_role(tenant, role_name: str):
    """Make sure the named role exists in this tenant."""
    from apps.accounts.models import Role
    Role.objects.get_or_create(tenant=tenant, name=role_name.lower())
