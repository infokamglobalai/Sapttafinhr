"""HR first-run setup — forced wizard until tenant.setup_complete.

Server-rendered (HR has no SPA). One page collects the essentials so HR is
actually usable: company info, departments, leave types, and the first
employees. On submit we create the records and mark the tenant set up, then
redirect into the dashboard.

Gated by tenants.middleware.TenantMiddleware (redirects here until complete).
"""
from __future__ import annotations

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods


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


def _handle_submit(request, tenant):
    from apps.employees.models import Department, Employee
    from apps.leaves.models import LeaveType

    p = request.POST

    # 1) Company info on the tenant
    tenant.name = (p.get("company_name") or tenant.name).strip()
    tenant.gstin = (p.get("gstin") or "").strip()
    tenant.pan = (p.get("pan") or "").strip()
    tenant.address = (p.get("address") or "").strip()
    tenant.save(update_fields=["name", "gstin", "pan", "address"])

    # 2) Departments (newline-separated)
    dept_names = [d.strip() for d in (p.get("departments") or "").splitlines() if d.strip()]
    dept_by_name = {}
    for name in dept_names:
        dept, _ = Department.objects.get_or_create(tenant=tenant, name=name)
        dept_by_name[name.lower()] = dept

    # 3) Leave types: parallel arrays name[]/code[]
    lt_names = p.getlist("leave_name[]")
    lt_codes = p.getlist("leave_code[]")
    for name, code in zip(lt_names, lt_codes):
        name, code = name.strip(), code.strip().upper()
        if name and code:
            LeaveType.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name})

    # 4) First employees: parallel arrays
    emp_codes = p.getlist("emp_code[]")
    emp_first = p.getlist("emp_first[]")
    emp_last = p.getlist("emp_last[]")
    emp_doj = p.getlist("emp_doj[]")
    emp_dept = p.getlist("emp_dept[]")
    emp_email = p.getlist("emp_email[]")
    created_emps = 0
    for i, code in enumerate(emp_codes):
        code = (code or "").strip()
        first = (emp_first[i] if i < len(emp_first) else "").strip()
        last = (emp_last[i] if i < len(emp_last) else "").strip()
        doj = (emp_doj[i] if i < len(emp_doj) else "").strip()
        if not (code and first and doj):
            continue  # skip incomplete rows
        dept = dept_by_name.get((emp_dept[i] if i < len(emp_dept) else "").strip().lower())
        Employee.objects.get_or_create(
            tenant=tenant, employee_code=code,
            defaults={
                "first_name": first, "last_name": last, "date_of_joining": doj,
                "department": dept,
                "official_email": (emp_email[i] if i < len(emp_email) else "").strip(),
            },
        )
        created_emps += 1

    # Keep the denormalized count honest
    tenant.employee_count = Employee.objects.filter(tenant=tenant, is_active=True).count()
    tenant.setup_complete = True
    tenant.save(update_fields=["employee_count", "setup_complete"])

    messages.success(request, f"HR setup complete — {created_emps} employee(s) added. Welcome!")
    return redirect("tenants:dashboard")
