from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q
from django.views.decorators.http import require_POST, require_http_methods

from .models import Employee, Department, Designation, OfficeLocation, EmployeeDocument, AttritionScore
from .forms import EmployeeForm, DepartmentForm, DesignationForm, OfficeLocationForm, DocumentUploadForm, COMPLIANCE_FIELD_NAMES
from .search import filter_employees_by_search
from .services import create_employee, bulk_import_employees, provision_employee_login, email_employee_invite, invite_delivery_message, EmployeeEmailInUse
from apps.tenants.limits import EmployeeLimitExceeded, seats_remaining, employee_limit, active_employee_count
from .access_services import (
    get_employee_access,
    get_login_url,
    build_invite_url,
    push_credential_session,
    pop_credential_session,
    revoke_employee_access,
    restore_employee_access,
    set_employee_roles,
)
from utils.access import tenant_login_required, perm_required
from utils.mail import smtp_configured
from utils.pdf import render_pdf_response


# ---------------------------------------------------------------------------
# Employee directory
# ---------------------------------------------------------------------------
@perm_required("employees.view")
def employee_list(request):
    tenant = request.tenant
    qs = Employee.objects.filter(tenant=tenant).select_related(
        "department", "designation", "reporting_manager"
    )

    # Filters
    search = request.GET.get("q", "").strip()
    dept_id = request.GET.get("department")
    status = request.GET.get("status", "active")

    if search:
        qs = filter_employees_by_search(qs, search)
    if dept_id:
        qs = qs.filter(department_id=dept_id)
    if status:
        qs = qs.filter(employment_status=status)

    paginator = Paginator(qs.order_by("first_name", "last_name"), 25)
    page_obj = paginator.get_page(request.GET.get("page"))

    departments = Department.objects.filter(tenant=tenant, is_active=True)

    if request.htmx:
        return render(request, "employees/partials/employee_results.html", {
            "page_obj": page_obj,
            "departments": departments,
            "search": search,
            "selected_dept": dept_id,
            "selected_status": status,
        })

    emp_base = Employee.objects.filter(tenant=tenant)
    return render(request, "employees/list.html", {
        "page_obj": page_obj,
        "departments": departments,
        "search": search,
        "selected_dept": dept_id,
        "selected_status": status,
        "seats_remaining": seats_remaining(tenant),
        "employee_limit": employee_limit(tenant),
        "active_employee_count": active_employee_count(tenant),
        "at_employee_cap": seats_remaining(tenant) == 0,
        "stats_active": emp_base.filter(employment_status="active").count(),
        "stats_notice": emp_base.filter(employment_status="notice_period").count(),
        "stats_departments": departments.count(),
    })


@perm_required("employees.export")
def employee_export(request):
    """Export filtered employee directory to Excel."""
    from utils.excel import make_workbook, apply_header_row, auto_fit_columns, workbook_response

    tenant = request.tenant
    qs = Employee.objects.filter(tenant=tenant).select_related("department", "designation")

    search = request.GET.get("q", "").strip()
    dept_id = request.GET.get("department")
    status = request.GET.get("status", "active")
    if search:
        qs = filter_employees_by_search(qs, search)
    if dept_id:
        qs = qs.filter(department_id=dept_id)
    if status:
        qs = qs.filter(employment_status=status)

    headers = ["Code", "Name", "Email", "Department", "Designation", "Joined", "Status"]
    wb = make_workbook()
    ws = wb.active
    ws.title = "Employees"
    apply_header_row(ws, headers)
    for row_idx, emp in enumerate(qs.order_by("first_name", "last_name"), start=2):
        ws.cell(row=row_idx, column=1, value=emp.employee_code)
        ws.cell(row=row_idx, column=2, value=emp.full_name)
        ws.cell(row=row_idx, column=3, value=emp.official_email or "")
        ws.cell(row=row_idx, column=4, value=emp.department.name if emp.department else "")
        ws.cell(row=row_idx, column=5, value=emp.designation.name if emp.designation else "")
        ws.cell(row=row_idx, column=6, value=emp.date_of_joining.isoformat() if emp.date_of_joining else "")
        ws.cell(row=row_idx, column=7, value=emp.get_employment_status_display())
    auto_fit_columns(ws)
    return workbook_response(wb, f"employees_{tenant.subdomain}.xlsx")


@tenant_login_required
def company_directory(request):
    """Company-wide employee lookup — all staff can search by name, email, department."""
    tenant = request.tenant
    qs = Employee.objects.filter(
        tenant=tenant, is_active=True, employment_status="active"
    ).select_related("department", "designation", "location")

    search = request.GET.get("q", "").strip()
    dept_id = request.GET.get("department")
    if search:
        qs = filter_employees_by_search(qs, search)
    if dept_id:
        qs = qs.filter(department_id=dept_id)

    paginator = Paginator(qs.order_by("first_name", "last_name"), 24)
    page_obj = paginator.get_page(request.GET.get("page"))
    departments = Department.objects.filter(tenant=tenant, is_active=True)

    return render(request, "employees/directory.html", {
        "page_obj": page_obj,
        "departments": departments,
        "search": search,
        "selected_dept": dept_id,
        "directory_mode": True,
    })


@tenant_login_required
def org_chart(request):
    """Visual organization chart — all staff can browse reporting structure."""
    from .org_chart import build_org_chart

    tenant = request.tenant
    chart = build_org_chart(tenant)
    can_manage = bool(
        request.user.is_hr_admin
        and getattr(request.user, "has_perm_code", lambda _c: False)("employees.edit")
    )
    return render(request, "employees/org_chart.html", {
        "chart": chart,
        "can_manage_org": can_manage,
    })


@perm_required("employees.edit")
def org_chart_reassign(request, pk):
    """Change reporting manager from the org chart (HR)."""
    from .org_chart_services import OrgChartError, manager_choices, reassign_reporting_manager

    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant, is_active=True)

    if request.method == "GET":
        return render(request, "employees/partials/org_chart_reassign_form.html", {
            "employee": employee,
            "managers": manager_choices(tenant, employee),
        })

    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    raw = (request.POST.get("reporting_manager") or "").strip()
    new_manager = None
    if raw:
        new_manager = get_object_or_404(
            Employee, pk=int(raw), tenant=tenant, is_active=True
        )
    try:
        reassign_reporting_manager(employee, new_manager, updated_by=request.user)
    except OrgChartError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except ValueError:
        return JsonResponse({"error": "Invalid manager selected."}, status=400)

    messages.success(
        request,
        f"Updated reporting line for {employee.directory_name}."
        + (f" Now reports to {new_manager.directory_name}." if new_manager else " Now a top-level leader."),
    )
    return JsonResponse({"ok": True})


@tenant_login_required
def colleague_profile(request, pk):
    """Read-only colleague card for non-admin directory."""
    tenant = request.tenant
    employee = get_object_or_404(
        Employee.objects.select_related("department", "designation", "location", "reporting_manager"),
        pk=pk,
        tenant=tenant,
        is_active=True,
    )
    return render(request, "employees/colleague.html", {"employee": employee})


@perm_required("employees.view")
def employee_detail(request, pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)
    documents = employee.documents.all().order_by("-uploaded_at")
    bank_accounts = employee.bank_accounts.all()
    access = get_employee_access(employee)
    return render(request, "employees/detail.html", {
        "employee": employee,
        "documents": documents,
        "bank_accounts": bank_accounts,
        "access": access,
        "login_url": get_login_url(request),
    })


@perm_required("employees.create")
def employee_create(request):
    tenant = request.tenant
    if request.method == "POST":
        form = EmployeeForm(tenant, request.POST, request.FILES)
        if form.is_valid():
            data = {k: v for k, v in form.cleaned_data.items() if k not in COMPLIANCE_FIELD_NAMES}
            try:
                emp, _pw = create_employee(tenant, data, created_by=request.user)
                form.save_compliance(emp)
                # A locked login was created → hand the admin a secure invite link
                # (the only way the employee first gets in).
                if emp.user_id and not emp.user.has_usable_password():
                    invite_url = build_invite_url(request, emp.user)
                    mail_result = email_employee_invite(emp, invite_url, get_login_url(request))
                    push_credential_session(request, emp, emp.user.email, invite_url)
                    messages.warning(request, invite_delivery_message(
                        mail_result, email=emp.user.email, employee_name=emp.full_name,
                    ))
                    if request.htmx:
                        return HttpResponse(
                            headers={"HX-Redirect": f"/employees/{emp.pk}/credentials/"}
                        )
                    return redirect("employees:credentials", pk=emp.pk)
                messages.success(request, f"Employee {emp.full_name} created.")
                if request.htmx:
                    return HttpResponse(
                        headers={"HX-Redirect": f"/employees/{emp.pk}/"}
                    )
                return redirect("employees:detail", pk=emp.pk)
            except EmployeeLimitExceeded as exc:
                from apps.tenants.seat_alerts import notify_owners_add_blocked

                notify_owners_add_blocked(tenant)
                messages.error(request, str(exc))
            except EmployeeEmailInUse as exc:
                messages.error(request, str(exc))
                if exc.employee:
                    form.add_error("official_email", str(exc))
            except Exception as exc:
                messages.error(request, f"Error creating employee: {exc}")
    else:
        form = EmployeeForm(tenant)

    return render(request, "employees/create.html", {"form": form})


@perm_required("employees.edit")
@require_POST
def employee_create_login(request, pk):
    """Provision (or reset) a self-service login for an employee.

    Employees created via the setup wizard don't get a User automatically, so
    this is how an admin grants them access to the My Space / ESS screens. The
    temporary password is shown once for the admin to share (until email is
    wired up).
    """
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)
    reset = bool(employee.user_id)
    try:
        user, needs_invite = provision_employee_login(employee, created_by=request.user, reset_password=reset)
        if needs_invite:
            verb = "reset" if reset else "created"
            invite_url = build_invite_url(request, user)
            mail_result = email_employee_invite(employee, invite_url, get_login_url(request))
            push_credential_session(request, employee, user.email, invite_url)
            messages.warning(request, (
                f"Self-service login {verb} for {employee.full_name}. "
                + invite_delivery_message(mail_result, email=user.email, employee_name=employee.full_name)
            ))
            return redirect("employees:credentials", pk=pk)
        messages.info(request, f"{employee.full_name} already has a login ({user.email}).")
    except Exception as exc:
        messages.error(request, f"Could not create login: {exc}")
    return redirect("employees:detail", pk=pk)


@perm_required("employees.edit")
@require_POST
def bulk_provision_logins(request):
    """Provision login accounts for all employees in this tenant that don't have one yet."""
    tenant = request.tenant
    pending = Employee.objects.filter(tenant=tenant, is_active=True).filter(
        Q(user__isnull=True) | Q(user__password__startswith="!")
    )
    created, skipped = [], []

    for emp in pending:
        email = (emp.official_email or emp.personal_email or "").strip()
        if not email:
            skipped.append(emp.employee_code)
            continue
        try:
            user, _needs_invite = provision_employee_login(emp, created_by=request.user)
            # Locked account (new or never-accepted) → (re)issue an invite link.
            if not user.has_usable_password():
                invite_url = build_invite_url(request, user)
                email_employee_invite(emp, invite_url, get_login_url(request))
                created.append({"name": emp.full_name, "code": emp.employee_code,
                                 "email": email, "invite_url": invite_url})
        except Exception:
            skipped.append(emp.employee_code)

    if created:
        request.session["bulk_credentials"] = created
        return redirect("employees:bulk_credentials")
    if skipped:
        messages.warning(request, f"Could not provision logins for {len(skipped)} employee(s) — add their email first.")
    else:
        messages.info(request, "All employees already have login accounts.")
    return redirect("employees:team_access")


@perm_required("employees.edit")
def bulk_credentials(request):
    """One-time display of passwords generated by bulk_provision_logins."""
    credentials = request.session.pop("bulk_credentials", None)
    if not credentials:
        return redirect("employees:list")
    return render(request, "employees/bulk_credentials.html", {
        "credentials": credentials,
        "login_url": get_login_url(request),
        "smtp_configured": smtp_configured(),
    })


@perm_required("employees.edit")
def employee_credentials(request, pk):
    """One-time display after create / reset login — admin can come back via Reset login."""
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)
    cred = pop_credential_session(request, pk)
    if not cred:
        messages.info(
            request,
            "No temporary password is stored. Use Reset login to generate a new one.",
        )
        return redirect("employees:detail", pk=pk)
    return render(request, "employees/employee_credentials.html", {
        "employee": employee,
        "credential": cred,
        "login_url": get_login_url(request),
        "smtp_configured": smtp_configured(),
    })


@perm_required("employees.edit")
@require_POST
def employee_revoke_access(request, pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)
    if revoke_employee_access(employee):
        messages.success(request, f"Application access disabled for {employee.full_name}.")
    else:
        messages.info(request, f"{employee.full_name} has no active login to disable.")
    return redirect("employees:detail", pk=pk)


@perm_required("employees.edit")
@require_POST
def employee_restore_access(request, pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)
    if restore_employee_access(employee):
        messages.success(request, f"Application access restored for {employee.full_name}.")
    else:
        messages.info(request, f"{employee.full_name} already has active access or no login exists.")
    return redirect("employees:detail", pk=pk)


@perm_required("employees.edit")
def team_access(request):
    """Assign Manager / HR Admin roles and review login status."""
    tenant = request.tenant
    employees = (
        Employee.objects.filter(tenant=tenant, user__isnull=False)
        .select_related("user", "department", "designation")
        .order_by("first_name", "last_name")
    )
    rows = []
    manager_count = hr_admin_count = inactive_count = 0
    for emp in employees:
        access = get_employee_access(emp)
        rows.append({"employee": emp, "access": access})
        roles = access["roles"]
        if "manager" in roles:
            manager_count += 1
        if "hr_admin" in roles:
            hr_admin_count += 1
        if not access["is_active"]:
            inactive_count += 1
    pending_login = Employee.objects.filter(tenant=tenant, is_active=True).filter(
        Q(user__isnull=True) | Q(user__password__startswith="!")
    ).count()
    return render(request, "employees/team_access.html", {
        "rows": rows,
        "stats_total": len(rows),
        "stats_managers": manager_count,
        "stats_hr_admins": hr_admin_count,
        "stats_inactive": inactive_count,
        "stats_pending_login": pending_login,
    })


@perm_required("employees.edit")
@require_POST
def team_access_update(request, pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant, user__isnull=False)
    role_names = ["employee"]
    if request.POST.get("role_manager") == "on":
        role_names.append("manager")
    if request.POST.get("role_hr_admin") == "on":
        role_names.append("hr_admin")
    set_employee_roles(employee.user, role_names, granted_by=request.user)
    messages.success(request, f"Roles updated for {employee.full_name}.")
    return redirect("employees:team_access")


@perm_required("employees.edit")
def employee_edit(request, pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)

    if request.method == "POST":
        form = EmployeeForm(tenant, request.POST, request.FILES, instance=employee)
        if form.is_valid():
            emp = form.save()
            form.save_compliance(emp)
            messages.success(request, "Employee updated successfully.")
            if request.htmx:
                return HttpResponse(headers={"HX-Redirect": f"/employees/{pk}/"})
            return redirect("employees:detail", pk=pk)
    else:
        form = EmployeeForm(tenant, instance=employee)

    if request.htmx:
        return render(request, "employees/partials/edit_form.html", {"form": form, "employee": employee})
    return render(request, "employees/edit.html", {"form": form, "employee": employee})


# ---------------------------------------------------------------------------
# Document management
# ---------------------------------------------------------------------------
@perm_required("employees.edit")
def document_upload(request, employee_pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=tenant)

    if request.method == "POST":
        form = DocumentUploadForm(request.POST, request.FILES)
        if form.is_valid():
            doc = form.save(commit=False)
            doc.tenant = tenant
            doc.employee = employee
            doc.uploaded_by = request.user
            if request.FILES.get("file"):
                f = request.FILES["file"]
                doc.file_size_bytes = f.size
                doc.mime_type = f.content_type
            doc.save()
            messages.success(request, "Document uploaded.")
            if request.htmx:
                docs = employee.documents.all().order_by("-uploaded_at")
                return render(request, "employees/partials/documents_list.html", {
                    "employee": employee, "documents": docs
                })
            return redirect("employees:detail", pk=employee_pk)
    else:
        form = DocumentUploadForm()

    return render(request, "employees/partials/document_upload_form.html", {
        "form": form, "employee": employee
    })


# ---------------------------------------------------------------------------
# Digital ID card
# ---------------------------------------------------------------------------
@perm_required("employees.view")
def id_card_pdf(request, pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)
    return render_pdf_response(
        "employees/id_card_pdf.html",
        {"employee": employee, "tenant": tenant},
        filename=f"ID_{employee.employee_code}.pdf",
    )


# ---------------------------------------------------------------------------
# Bulk import
# ---------------------------------------------------------------------------
@perm_required("employees.create")
def bulk_import(request):
    tenant = request.tenant
    if request.method == "POST" and request.FILES.get("csv_file"):
        result = bulk_import_employees(tenant, request.FILES["csv_file"], created_by=request.user)
        messages.success(request, f"{result['created']} employees imported.")
        if result["errors"]:
            for err in result["errors"][:10]:
                messages.warning(request, f"Row {err['row']}: {err['error']}")
        if request.htmx:
            return HttpResponse(headers={"HX-Redirect": "/employees/"})
        return redirect("employees:list")
    return render(request, "employees/bulk_import.html")


# ---------------------------------------------------------------------------
# Org structure management
# ---------------------------------------------------------------------------
def _org_create_response(
    request,
    *,
    list_template,
    list_context,
    form,
    redirect_name,
    created_name: str,
    item_label: str,
):
    """Save org item, flash message, redirect (or re-render form with errors)."""
    if form.is_valid():
        messages.success(request, f"{item_label} «{created_name}» created successfully.")
        if request.htmx:
            from django.http import HttpResponse
            from django.urls import reverse

            return HttpResponse(headers={"HX-Redirect": reverse(redirect_name)})
        return redirect(redirect_name)

    messages.error(request, f"Could not create {item_label.lower()} — please fix the errors below.")
    if request.htmx:
        from django.http import HttpResponse
        from django.urls import reverse

        return HttpResponse(headers={"HX-Redirect": reverse(redirect_name)})
    return render(request, list_template, {**list_context, "form": form})


def _org_list_response(request, *, partial_template, context, redirect_name, success_msg=None, error_msg=None):
    if error_msg:
        messages.error(request, error_msg)
    elif success_msg:
        messages.success(request, success_msg)
    if request.htmx:
        return render(request, partial_template, context)
    return redirect(redirect_name)


@perm_required("employees.edit")
def department_list(request):
    from .org_structure_services import departments_queryset

    tenant = request.tenant
    departments = departments_queryset(tenant)
    form = DepartmentForm(tenant)
    return render(request, "employees/departments.html", {"departments": departments, "form": form})


@perm_required("employees.edit")
@require_POST
def department_create(request):
    from .org_structure_services import departments_queryset

    tenant = request.tenant
    form = DepartmentForm(tenant, request.POST)
    created_name = ""
    if form.is_valid():
        dept = form.save(commit=False)
        dept.tenant = tenant
        dept.save()
        created_name = dept.name
    return _org_create_response(
        request,
        list_template="employees/departments.html",
        list_context={"departments": departments_queryset(tenant)},
        form=form,
        redirect_name="employees:departments",
        created_name=created_name,
        item_label="Department",
    )


@perm_required("employees.edit")
@require_POST
def department_deactivate(request, pk):
    from .org_structure_services import deactivate_department, departments_queryset

    tenant = request.tenant
    dept = get_object_or_404(Department, pk=pk, tenant=tenant)
    err = deactivate_department(dept)
    return _org_list_response(
        request,
        partial_template="employees/partials/departments_list.html",
        context={"departments": departments_queryset(tenant), "list_error": err},
        redirect_name="employees:departments",
        success_msg=None if err else f"Department «{dept.name}» deactivated.",
        error_msg=err,
    )


@perm_required("employees.edit")
@require_POST
def department_restore(request, pk):
    from .org_structure_services import departments_queryset, restore_department

    tenant = request.tenant
    dept = get_object_or_404(Department, pk=pk, tenant=tenant)
    err = restore_department(dept)
    return _org_list_response(
        request,
        partial_template="employees/partials/departments_list.html",
        context={"departments": departments_queryset(tenant), "list_error": err},
        redirect_name="employees:departments",
        success_msg=None if err else f"Department «{dept.name}» restored.",
        error_msg=err,
    )


@perm_required("employees.edit")
def designation_list(request):
    from .org_structure_services import designations_queryset

    tenant = request.tenant
    designations = designations_queryset(tenant)
    form = DesignationForm()
    return render(request, "employees/designations.html", {"designations": designations, "form": form})


@perm_required("employees.edit")
@require_POST
def designation_create(request):
    from .org_structure_services import designations_queryset

    tenant = request.tenant
    form = DesignationForm(request.POST)
    created_name = ""
    if form.is_valid():
        desig = form.save(commit=False)
        desig.tenant = tenant
        desig.save()
        created_name = desig.name
    return _org_create_response(
        request,
        list_template="employees/designations.html",
        list_context={"designations": designations_queryset(tenant)},
        form=form,
        redirect_name="employees:designations",
        created_name=created_name,
        item_label="Designation",
    )


@perm_required("employees.edit")
@require_POST
def designation_deactivate(request, pk):
    from .org_structure_services import deactivate_designation, designations_queryset

    tenant = request.tenant
    desig = get_object_or_404(Designation, pk=pk, tenant=tenant)
    err = deactivate_designation(desig)
    return _org_list_response(
        request,
        partial_template="employees/partials/designations_list.html",
        context={"designations": designations_queryset(tenant), "list_error": err},
        redirect_name="employees:designations",
        success_msg=None if err else f"Designation «{desig.name}» deactivated.",
        error_msg=err,
    )


@perm_required("employees.edit")
@require_POST
def designation_restore(request, pk):
    from .org_structure_services import designations_queryset, restore_designation

    tenant = request.tenant
    desig = get_object_or_404(Designation, pk=pk, tenant=tenant)
    err = restore_designation(desig)
    return _org_list_response(
        request,
        partial_template="employees/partials/designations_list.html",
        context={"designations": designations_queryset(tenant), "list_error": err},
        redirect_name="employees:designations",
        success_msg=None if err else f"Designation «{desig.name}» restored.",
        error_msg=err,
    )


@perm_required("employees.edit")
def location_list(request):
    from .org_structure_services import locations_queryset

    tenant = request.tenant
    locations = locations_queryset(tenant)
    form = OfficeLocationForm()
    return render(request, "employees/locations.html", {"locations": locations, "form": form})


@perm_required("employees.edit")
@require_POST
def location_create(request):
    from .org_structure_services import locations_queryset

    tenant = request.tenant
    form = OfficeLocationForm(request.POST)
    created_name = ""
    if form.is_valid():
        loc = form.save(commit=False)
        loc.tenant = tenant
        loc.save()
        created_name = loc.name
    return _org_create_response(
        request,
        list_template="employees/locations.html",
        list_context={"locations": locations_queryset(tenant)},
        form=form,
        redirect_name="employees:locations",
        created_name=created_name,
        item_label="Location",
    )


@perm_required("employees.edit")
@require_POST
def location_deactivate(request, pk):
    from .org_structure_services import deactivate_location, locations_queryset

    tenant = request.tenant
    loc = get_object_or_404(OfficeLocation, pk=pk, tenant=tenant)
    err = deactivate_location(loc)
    return _org_list_response(
        request,
        partial_template="employees/partials/locations_list.html",
        context={"locations": locations_queryset(tenant), "list_error": err},
        redirect_name="employees:locations",
        success_msg=None if err else f"Location «{loc.name}» deactivated.",
        error_msg=err,
    )


@perm_required("employees.edit")
@require_POST
def location_restore(request, pk):
    from .org_structure_services import locations_queryset, restore_location

    tenant = request.tenant
    loc = get_object_or_404(OfficeLocation, pk=pk, tenant=tenant)
    err = restore_location(loc)
    return _org_list_response(
        request,
        partial_template="employees/partials/locations_list.html",
        context={"locations": locations_queryset(tenant), "list_error": err},
        redirect_name="employees:locations",
        success_msg=None if err else f"Location «{loc.name}» restored.",
        error_msg=err,
    )


# ─────────────────────────────────────────────────────────────────────────
# Attrition Risk Scoring (AI feature #4 — pure heuristic, no external API)
# ─────────────────────────────────────────────────────────────────────────
@perm_required("reports.view")
def attrition_dashboard(request):
    """HR-only view of every employee's flight-risk score."""
    tenant = request.tenant

    scores = (
        AttritionScore.objects.filter(tenant=tenant)
        .select_related("employee", "employee__department", "employee__designation")
        .order_by("-score")
    )

    # Filter by band if requested
    band = request.GET.get("band")
    if band in ("high", "medium", "low"):
        scores = scores.filter(risk_band=band)

    counts = {
        "high":   AttritionScore.objects.filter(tenant=tenant, risk_band="high").count(),
        "medium": AttritionScore.objects.filter(tenant=tenant, risk_band="medium").count(),
        "low":    AttritionScore.objects.filter(tenant=tenant, risk_band="low").count(),
        "total":  AttritionScore.objects.filter(tenant=tenant).count(),
    }
    last_computed = (
        AttritionScore.objects.filter(tenant=tenant)
        .order_by("-computed_at").values_list("computed_at", flat=True).first()
    )

    return render(request, "employees/attrition_dashboard.html", {
        "scores": scores[:200], "counts": counts, "band": band,
        "last_computed": last_computed,
    })


@perm_required("reports.view")
@require_http_methods(["GET", "POST"])
def attrition_recompute(request):
    """Manually trigger a recompute for this tenant (also runs nightly via cron)."""
    if request.method == "GET":
        messages.info(
            request,
            "Use the “Recompute scores” button on the Attrition Risk page to refresh flight-risk scores.",
        )
        return redirect("employees:attrition")

    tenant = request.tenant
    from .attrition import recompute_all

    try:
        counts = recompute_all(tenant)
    except Exception as exc:
        messages.error(request, f"Could not recompute attrition scores: {exc}")
        return redirect("employees:attrition")

    messages.success(
        request,
        f"Attrition scored: {counts['high']} high, {counts['medium']} medium, {counts['low']} low "
        f"({counts['total']} employees).",
    )
    return redirect("employees:attrition")
