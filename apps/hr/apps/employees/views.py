from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q
from django.views.decorators.http import require_POST

from .models import Employee, Department, Designation, OfficeLocation, EmployeeDocument, AttritionScore
from .forms import EmployeeForm, DepartmentForm, DesignationForm, OfficeLocationForm, DocumentUploadForm
from .services import create_employee, bulk_import_employees, provision_employee_login, email_login_credentials
from utils.pdf import render_pdf_response


# ---------------------------------------------------------------------------
# Employee directory
# ---------------------------------------------------------------------------
@login_required
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
        qs = qs.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(employee_code__icontains=search)
            | Q(official_email__icontains=search)
        )
    if dept_id:
        qs = qs.filter(department_id=dept_id)
    if status:
        qs = qs.filter(employment_status=status)

    paginator = Paginator(qs.order_by("first_name", "last_name"), 25)
    page_obj = paginator.get_page(request.GET.get("page"))

    departments = Department.objects.filter(tenant=tenant, is_active=True)

    if request.htmx:
        return render(request, "employees/partials/employee_table.html", {
            "page_obj": page_obj, "departments": departments
        })

    return render(request, "employees/list.html", {
        "page_obj": page_obj,
        "departments": departments,
        "search": search,
        "selected_dept": dept_id,
        "selected_status": status,
    })


@login_required
def employee_detail(request, pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)
    documents = employee.documents.all().order_by("-uploaded_at")
    bank_accounts = employee.bank_accounts.all()
    return render(request, "employees/detail.html", {
        "employee": employee,
        "documents": documents,
        "bank_accounts": bank_accounts,
    })


@login_required
def employee_create(request):
    tenant = request.tenant
    if request.method == "POST":
        form = EmployeeForm(tenant, request.POST, request.FILES)
        if form.is_valid():
            data = form.cleaned_data
            try:
                emp, temp_password = create_employee(tenant, data, created_by=request.user)
                messages.success(
                    request,
                    f"Employee {emp.full_name} created. Temporary password: {temp_password}"
                )
                if request.htmx:
                    return HttpResponse(
                        headers={"HX-Redirect": f"/employees/{emp.pk}/"}
                    )
                return redirect("employees:detail", pk=emp.pk)
            except Exception as exc:
                messages.error(request, f"Error creating employee: {exc}")
    else:
        form = EmployeeForm(tenant)

    return render(request, "employees/create.html", {"form": form})


@login_required
@require_POST
def employee_create_login(request, pk):
    """Provision (or reset) a self-service login for an employee.

    Employees created via the setup wizard don't get a User automatically, so
    this is how an admin grants them access to the My Space / ESS screens. The
    temporary password is shown once for the admin to share (until email is
    wired up).
    """
    tenant = request.tenant
    if not request.user.is_hr_admin:
        messages.error(request, "HR admin access required.")
        return redirect("employees:detail", pk=pk)
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)
    reset = bool(employee.user_id)  # already linked → treat as a password reset
    try:
        user, password = provision_employee_login(employee, created_by=request.user, reset_password=reset)
        if password:
            verb = "reset" if reset else "created"
            from django.urls import reverse
            login_url = request.build_absolute_uri(reverse("accounts:login"))
            emailed = email_login_credentials(employee, password, login_url)
            if emailed:
                messages.success(
                    request,
                    f"Self-service login {verb} for {employee.full_name} and emailed to {user.email}.",
                )
            else:
                # Email not sent (no mail backend / send failed) — fall back to on-screen.
                messages.success(
                    request,
                    f"Self-service login {verb} for {employee.full_name}. "
                    f"Email: {user.email} · Temporary password: {password} "
                    f"— share it securely; they can change it after signing in.",
                )
        else:
            messages.info(request, f"{employee.full_name} already has a login ({user.email}).")
    except Exception as exc:
        messages.error(request, f"Could not create login: {exc}")
    return redirect("employees:detail", pk=pk)


@login_required
@require_POST
def bulk_provision_logins(request):
    """Provision login accounts for all employees in this tenant that don't have one yet."""
    tenant = request.tenant
    if not request.user.is_hr_admin:
        messages.error(request, "HR admin access required.")
        return redirect("employees:list")

    no_login = Employee.objects.filter(tenant=tenant, user__isnull=True, is_active=True)
    created, skipped = [], []
    from django.urls import reverse
    login_url = request.build_absolute_uri(reverse("accounts:login"))

    for emp in no_login:
        email = (emp.official_email or emp.personal_email or "").strip()
        if not email:
            skipped.append(emp.employee_code)
            continue
        try:
            user, password = provision_employee_login(emp, created_by=request.user)
            if password:
                email_login_credentials(emp, password, login_url)
                created.append({"name": emp.full_name, "code": emp.employee_code,
                                 "email": email, "password": password})
        except Exception:
            skipped.append(emp.employee_code)

    if created:
        request.session["bulk_credentials"] = created
        return redirect("employees:bulk_credentials")
    if skipped:
        messages.warning(request, f"Could not provision logins for {len(skipped)} employee(s) — add their email first.")
    else:
        messages.info(request, "All employees already have login accounts.")
    return redirect("employees:list")


@login_required
def bulk_credentials(request):
    """One-time display of passwords generated by bulk_provision_logins."""
    credentials = request.session.pop("bulk_credentials", None)
    if not credentials:
        return redirect("employees:list")
    login_url = request.build_absolute_uri("/auth/login/")
    return render(request, "employees/bulk_credentials.html", {
        "credentials": credentials,
        "login_url": login_url,
    })


@login_required
def employee_edit(request, pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=pk, tenant=tenant)

    if request.method == "POST":
        form = EmployeeForm(tenant, request.POST, request.FILES, instance=employee)
        if form.is_valid():
            form.save()
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
@login_required
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
@login_required
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
@login_required
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
@login_required
def department_list(request):
    tenant = request.tenant
    departments = Department.objects.filter(tenant=tenant).order_by("name")
    form = DepartmentForm(tenant)
    return render(request, "employees/departments.html", {"departments": departments, "form": form})


@login_required
def department_create(request):
    tenant = request.tenant
    if request.method == "POST":
        form = DepartmentForm(tenant, request.POST)
        if form.is_valid():
            dept = form.save(commit=False)
            dept.tenant = tenant
            dept.save()
            if request.htmx:
                departments = Department.objects.filter(tenant=tenant).order_by("name")
                return render(request, "employees/partials/departments_list.html", {"departments": departments})
            return redirect("employees:departments")
    return redirect("employees:departments")


@login_required
def designation_list(request):
    tenant = request.tenant
    designations = Designation.objects.filter(tenant=tenant).order_by("level", "name")
    form = DesignationForm()
    return render(request, "employees/designations.html", {"designations": designations, "form": form})


@login_required
def designation_create(request):
    tenant = request.tenant
    if request.method == "POST":
        form = DesignationForm(request.POST)
        if form.is_valid():
            desig = form.save(commit=False)
            desig.tenant = tenant
            desig.save()
            if request.htmx:
                designations = Designation.objects.filter(tenant=tenant).order_by("level", "name")
                return render(request, "employees/partials/designations_list.html", {"designations": designations})
            return redirect("employees:designations")
    return redirect("employees:designations")


@login_required
def location_list(request):
    tenant = request.tenant
    locations = OfficeLocation.objects.filter(tenant=tenant).order_by("name")
    form = OfficeLocationForm()
    return render(request, "employees/locations.html", {"locations": locations, "form": form})


@login_required
def location_create(request):
    tenant = request.tenant
    if request.method == "POST":
        form = OfficeLocationForm(request.POST)
        if form.is_valid():
            loc = form.save(commit=False)
            loc.tenant = tenant
            loc.save()
            if request.htmx:
                locations = OfficeLocation.objects.filter(tenant=tenant).order_by("name")
                return render(request, "employees/partials/locations_list.html", {"locations": locations})
            return redirect("employees:locations")
    return redirect("employees:locations")


# ─────────────────────────────────────────────────────────────────────────
# Attrition Risk Scoring (AI feature #4 — pure heuristic, no external API)
# ─────────────────────────────────────────────────────────────────────────
@login_required
def attrition_dashboard(request):
    """HR-only view of every employee's flight-risk score."""
    tenant = request.tenant
    if not request.user.is_hr_admin:
        messages.error(request, "HR admin access required.")
        return redirect("tenants:dashboard")

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


@login_required
@require_POST
def attrition_recompute(request):
    """Manually trigger a recompute for this tenant (also runs nightly via cron)."""
    tenant = request.tenant
    if not request.user.is_hr_admin:
        return JsonResponse({"error": "forbidden"}, status=403)
    from .attrition import recompute_all
    counts = recompute_all(tenant)
    messages.success(
        request,
        f"Attrition scored: {counts['high']} high, {counts['medium']} medium, {counts['low']} low.",
    )
    return redirect("employees:attrition")
