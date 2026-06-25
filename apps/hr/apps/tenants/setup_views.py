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

from .setup_validation import validate_setup_post
from .tax_validation import tax_id_hint, tax_id_label, tax_id_placeholder


def _default_form_data(tenant) -> dict:
    return {
        "company_name": tenant.name,
        "gstin": tenant.gstin or "",
        "pan": tenant.pan or "",
        "address": tenant.address or "",
        "departments": "Engineering\nSales\nHuman Resources\nFinance\nOperations",
        "leave_rows": [
            ("Casual Leave", "CL"),
            ("Earned Leave", "EL"),
            ("Sick Leave", "SL"),
        ],
        "emp_rows": [{
            "code": "",
            "first": "",
            "last": "",
            "doj": "",
            "dept": "",
            "email": "",
            "role": "employee",
        }],
    }


def _form_data_from_post(post) -> dict:
    leave_rows = []
    for name, code in zip(post.getlist("leave_name[]"), post.getlist("leave_code[]")):
        leave_rows.append((name.strip(), code.strip().upper()))

    emp_rows = []
    for i, code in enumerate(post.getlist("emp_code[]")):
        emp_rows.append({
            "code": (code or "").strip(),
            "first": (post.getlist("emp_first[]")[i] if i < len(post.getlist("emp_first[]")) else "").strip(),
            "last": (post.getlist("emp_last[]")[i] if i < len(post.getlist("emp_last[]")) else "").strip(),
            "doj": (post.getlist("emp_doj[]")[i] if i < len(post.getlist("emp_doj[]")) else "").strip(),
            "dept": (post.getlist("emp_dept[]")[i] if i < len(post.getlist("emp_dept[]")) else "").strip(),
            "email": (post.getlist("emp_email[]")[i] if i < len(post.getlist("emp_email[]")) else "").strip(),
            "role": (post.getlist("emp_role[]")[i] if i < len(post.getlist("emp_role[]")) else "employee").strip(),
        })
    if not emp_rows:
        emp_rows = _default_form_data(None)["emp_rows"]

    return {
        "company_name": (post.get("company_name") or "").strip(),
        "gstin": (post.get("gstin") or "").strip(),
        "pan": (post.get("pan") or "").strip(),
        "address": (post.get("address") or "").strip(),
        "departments": post.get("departments") or "",
        "leave_rows": leave_rows or _default_form_data(None)["leave_rows"],
        "emp_rows": emp_rows,
    }


def _setup_context(tenant, *, form_data=None, field_errors=None):
    jurisdiction = tenant.payroll_jurisdiction
    return {
        "tenant": tenant,
        "form": form_data or _default_form_data(tenant),
        "field_errors": field_errors or {},
        "tax_id_label": tax_id_label(jurisdiction),
        "tax_id_hint": tax_id_hint(jurisdiction),
        "tax_id_placeholder": tax_id_placeholder(jurisdiction),
    }


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

    return render(request, "tenants/setup.html", _setup_context(tenant))


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

    cleaned, field_errors = validate_setup_post(tenant, request.POST)
    form_data = _form_data_from_post(request.POST)
    if field_errors:
        for key, msg in field_errors.items():
            if key == "__all__":
                messages.error(request, msg)
            else:
                messages.error(request, msg)
        return render(
            request,
            "tenants/setup.html",
            _setup_context(tenant, form_data=form_data, field_errors=field_errors),
        )

    assert cleaned is not None

    tenant.name = cleaned["company_name"]
    tenant.gstin = cleaned["gstin"]
    tenant.pan = cleaned["pan"]
    tenant.address = cleaned["address"]
    tenant.save(update_fields=["name", "gstin", "pan", "address"])

    dept_by_name = {}
    for name in cleaned["departments"]:
        dept, _ = Department.objects.get_or_create(tenant=tenant, name=name)
        dept_by_name[name.lower()] = dept

    for name, code in cleaned["leave_rows"]:
        LeaveType.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name})

    new_employees = []
    for row in cleaned["emp_rows"]:
        dept = dept_by_name.get(row["dept"].lower()) if row["dept"] else None

        from apps.employees.services import create_employee, _parse_date
        from apps.tenants.limits import check_employee_capacity, EmployeeLimitExceeded

        try:
            check_employee_capacity(tenant, additional=1)
        except EmployeeLimitExceeded as exc:
            messages.error(request, str(exc))
            return render(
                request,
                "tenants/setup.html",
                _setup_context(tenant, form_data=form_data, field_errors={"__all__": str(exc)}),
            )

        try:
            doj_parsed = _parse_date(row["doj"])
        except ValueError as exc:
            messages.error(request, f"Invalid date for {row['code']}: {exc}")
            return render(
                request,
                "tenants/setup.html",
                _setup_context(tenant, form_data=form_data),
            )

        emp, _ = create_employee(
            tenant,
            {
                "employee_code": row["code"],
                "first_name": row["first"],
                "last_name": row["last"],
                "date_of_joining": doj_parsed,
                "department": dept,
                "official_email": row["email"],
                "employment_status": "active",
            },
            created_by=request.user,
        )
        new_employees.append((emp, row["email"], row["role"]))

    from apps.employees.access_services import build_invite_url, set_employee_roles
    from apps.employees.access_services import get_login_url
    from apps.employees.services import email_employee_invite, invite_delivery_message

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
