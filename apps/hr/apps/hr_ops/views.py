from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.http import require_POST

from utils.access import hr_admin_required

from .models import (
    LetterTemplate, HRLetter, Asset, AssetAssignment,
    OnboardingTemplate, EmployeeOnboarding, OnboardingItem,
    ExitRequest, Announcement,
)
from .services import start_onboarding
from apps.employees.models import Employee


# ---------------------------------------------------------------------------
# HR Letters
# ---------------------------------------------------------------------------
@hr_admin_required
def letter_template_list(request):
    tenant = request.tenant
    templates = LetterTemplate.objects.filter(tenant=tenant, is_active=True).order_by("letter_type")
    from .letter_company import get_company_profile
    profile = get_company_profile(tenant)
    return render(request, "hr_ops/letter_templates.html", {
        "templates": templates,
        "profile": profile,
        "has_defaults_available": templates.count() < 7,
        "letter_type_choices": LetterTemplate.LETTER_TYPES,
    })


@hr_admin_required
def letter_template_create_or_edit(request, pk=None):
    from .forms import LetterTemplateForm
    from .letter_defaults import get_default_html, get_default_name
    tenant = request.tenant
    t = get_object_or_404(LetterTemplate, pk=pk, tenant=tenant) if pk else None
    if request.method == "POST":
        form = LetterTemplateForm(request.POST, instance=t)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            obj.created_by = obj.created_by or request.user
            obj.save()
            messages.success(request, f'Template "{obj.name}" saved.')
            return redirect("hr_ops:letter_templates")
    else:
        initial = {}
        if not t:
            letter_type = request.GET.get("type", "offer")
            if letter_type in dict(LetterTemplate.LETTER_TYPES):
                initial = {
                    "letter_type": letter_type,
                    "name": get_default_name(letter_type),
                    "template_html": get_default_html(letter_type) or "",
                }
        form = LetterTemplateForm(instance=t, initial=initial if not t else None)
    from .letter_defaults import DEFAULT_LETTER_TEMPLATES
    import json
    defaults_json = {
        k: {"name": v["name"], "html": v["html"].strip()}
        for k, v in DEFAULT_LETTER_TEMPLATES.items()
    }
    return render(request, "hr_ops/letter_template_form.html", {
        "form": form,
        "template": t,
        "default_types": list(DEFAULT_LETTER_TEMPLATES.keys()),
        "defaults_json": json.dumps(defaults_json),
    })


@login_required
def letter_download(request, pk):
    tenant = request.tenant
    # HR can download any letter; employee can only download their own shared letters
    employee = getattr(request.user, "employee_profile", None)
    qs = HRLetter.objects.filter(tenant=tenant)
    if not request.user.has_perm_code("hr_ops.view_all_letters"):
        qs = qs.filter(employee=employee, is_shared=True)
    letter = get_object_or_404(qs, pk=pk)

    if not letter.pdf:
        messages.error(request, "PDF not yet generated.")
        return redirect("hr_ops:letters")

    response = HttpResponse(letter.pdf.read(), content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{letter.pdf.name}"'
    return response


@hr_admin_required
@require_POST
def share_letter(request, pk):
    tenant = request.tenant
    letter = get_object_or_404(HRLetter, pk=pk, tenant=tenant)
    letter.is_shared = True
    letter.shared_at = timezone.now()
    letter.save(update_fields=["is_shared", "shared_at"])
    messages.success(request, "Letter shared with employee.")
    return redirect("hr_ops:letter_templates")


# ---------------------------------------------------------------------------
# Asset management
# ---------------------------------------------------------------------------
@hr_admin_required
def asset_list(request):
    tenant = request.tenant
    assets = (
        Asset.objects.filter(tenant=tenant)
        .prefetch_related("assignments__employee")
        .order_by("name")
    )
    employees = (
        Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")
        .select_related("department")
        .order_by("first_name", "last_name")
    )
    employees_for_assign = [
        {
            "id": e.pk,
            "name": e.full_name,
            "code": e.employee_code,
            "dept": e.department.name if e.department else "",
        }
        for e in employees
    ]
    return render(
        request,
        "hr_ops/assets.html",
        {"assets": assets, "employees": employees, "employees_for_assign": employees_for_assign},
    )


@hr_admin_required
@require_POST
def asset_assign(request, asset_pk):
    tenant = request.tenant
    asset = get_object_or_404(Asset, pk=asset_pk, tenant=tenant, status="available")
    employee_id = request.POST.get("employee_id")
    if not employee_id:
        messages.error(request, "Please select an employee.")
        return redirect("hr_ops:assets")

    try:
        employee = Employee.objects.get(pk=employee_id, tenant=tenant, is_active=True)
    except Employee.DoesNotExist:
        messages.error(request, "Employee not found. Please pick from the list.")
        return redirect("hr_ops:assets")

    AssetAssignment.objects.create(
        asset=asset, employee=employee,
        condition_on_assign=request.POST.get("condition", "good"),
        assigned_by=request.user,
    )
    asset.status = "assigned"
    asset.save(update_fields=["status"])
    messages.success(request, f"{asset.name} assigned to {employee.full_name}.")
    return redirect("hr_ops:assets")


@hr_admin_required
@require_POST
def asset_return(request, assignment_pk):
    tenant = request.tenant
    assignment = get_object_or_404(AssetAssignment, pk=assignment_pk, asset__tenant=tenant)
    assignment.returned_at = timezone.now()
    assignment.condition_on_return = request.POST.get("condition", "good")
    assignment.save(update_fields=["returned_at", "condition_on_return"])
    assignment.asset.status = "available"
    assignment.asset.save(update_fields=["status"])
    messages.success(request, "Asset returned.")
    return redirect("hr_ops:assets")


# ---------------------------------------------------------------------------
# Onboarding
# ---------------------------------------------------------------------------
@hr_admin_required
def onboarding_list(request):
    tenant = request.tenant
    onboardings = EmployeeOnboarding.objects.filter(
        tenant=tenant, completed_at__isnull=True
    ).select_related("employee").order_by("-started_at")
    return render(request, "hr_ops/onboarding.html", {"onboardings": onboardings})


@hr_admin_required
@require_POST
def onboarding_start(request, employee_pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=tenant)
    onboarding = start_onboarding(tenant, employee)
    if onboarding:
        messages.success(request, f"Onboarding started for {employee.full_name}.")
    else:
        messages.warning(request, "No default onboarding template configured.")
    return redirect("employees:detail", pk=employee_pk)


@hr_admin_required
@require_POST
def onboarding_item_complete(request, item_pk):
    tenant = request.tenant
    item = get_object_or_404(OnboardingItem, pk=item_pk, onboarding__tenant=tenant)
    item.status = "completed"
    item.completed_at = timezone.now()
    item.completed_by = request.user
    item.notes = request.POST.get("notes", "")
    item.save()
    if request.htmx:
        onboarding = item.onboarding
        return render(request, "hr_ops/partials/onboarding_items.html", {"onboarding": onboarding})
    return redirect("hr_ops:onboarding")


# ---------------------------------------------------------------------------
# Exit management
# ---------------------------------------------------------------------------
@hr_admin_required
def exit_list(request):
    tenant = request.tenant
    exits = ExitRequest.objects.filter(tenant=tenant).select_related(
        "employee", "employee__department", "employee__user"
    ).order_by("-created_at")
    return render(request, "hr_ops/exits.html", {
        "exits": exits,
        "today": timezone.localdate(),
    })


@hr_admin_required
@require_POST
def exit_request_create(request, employee_pk):
    import datetime
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=tenant)

    raw_date = (request.POST.get("resignation_date") or "").strip()
    raw_lwd = (request.POST.get("last_working_date") or "").strip()
    exit_reason = request.POST.get("exit_reason", "")

    # Default to today if blank — HR typically clicks the button when employee resigns in-person
    if not raw_date:
        resignation_date = datetime.date.today()
    else:
        try:
            resignation_date = datetime.datetime.strptime(raw_date, "%Y-%m-%d").date()
        except ValueError:
            messages.error(
                request,
                f"Invalid resignation date '{raw_date}'. Use YYYY-MM-DD format.",
            )
            return redirect("employees:detail", pk=employee_pk)

    last_working_date = None
    if raw_lwd:
        try:
            last_working_date = datetime.datetime.strptime(raw_lwd, "%Y-%m-%d").date()
        except ValueError:
            messages.error(
                request,
                f"Invalid last working date '{raw_lwd}'. Use YYYY-MM-DD format.",
            )
            return redirect("employees:detail", pk=employee_pk)

    _, created = ExitRequest.objects.get_or_create(
        tenant=tenant, employee=employee,
        defaults={
            "resignation_date": resignation_date,
            "last_working_date": last_working_date,
            "exit_reason": exit_reason,
        },
    )
    if not created:
        messages.warning(request, f"{employee.full_name} already has an open exit request.")
        return redirect("hr_ops:exit_list")

    # Update employee status
    employee.employment_status = "notice_period"
    employee.save(update_fields=["employment_status"])

    if request.POST.get("disable_login") == "on":
        from apps.employees.access_services import revoke_employee_access
        if revoke_employee_access(employee):
            messages.info(request, f"Application login disabled for {employee.full_name}.")
    elif last_working_date:
        messages.info(
            request,
            f"Login will be disabled automatically on last working day ({last_working_date.strftime('%d %b %Y')}).",
        )

    # Audit trail
    try:
        from apps.hr_ops.services import audit_log
        audit_log(
            tenant, request.user, "create", "ExitRequest", employee,
            f"Exit request created for {employee.full_name} (resignation date {resignation_date})",
            details={"resignation_date": resignation_date.isoformat(), "reason": exit_reason[:200]},
        )
    except Exception:
        pass

    messages.success(request, f"Exit request created for {employee.full_name}.")
    return redirect("hr_ops:exit_list")


@hr_admin_required
@require_POST
def exit_update(request, pk):
    """Update last working day, FnF, and asset return flags."""
    if not request.user.is_hr_admin:
        messages.error(request, "HR admin access required.")
        return redirect("hr_ops:exit_list")
    import datetime
    tenant = request.tenant
    exit_req = get_object_or_404(ExitRequest, pk=pk, tenant=tenant)

    raw_lwd = (request.POST.get("last_working_date") or "").strip()
    if raw_lwd:
        try:
            exit_req.last_working_date = datetime.datetime.strptime(raw_lwd, "%Y-%m-%d").date()
        except ValueError:
            messages.error(request, "Invalid last working date.")
            return redirect("hr_ops:exit_list")
    elif "last_working_date" in request.POST and not raw_lwd:
        exit_req.last_working_date = None

    if "fnf_cleared" in request.POST:
        exit_req.fnf_cleared = request.POST.get("fnf_cleared") == "on"
    if "assets_returned" in request.POST:
        exit_req.assets_returned = request.POST.get("assets_returned") == "on"
    exit_req.save(update_fields=["last_working_date", "fnf_cleared", "assets_returned"])
    messages.success(request, f"Exit details updated for {exit_req.employee.full_name}.")
    return redirect("hr_ops:exit_list")


@hr_admin_required
@require_POST
def exit_finalize(request, pk):
    """One-click: mark employee exited, deactivate profile, disable login."""
    if not request.user.is_hr_admin:
        messages.error(request, "HR admin access required.")
        return redirect("hr_ops:exit_list")
    tenant = request.tenant
    exit_req = get_object_or_404(ExitRequest, pk=pk, tenant=tenant)
    from apps.hr_ops.exit_services import finalize_exit

    was_exited = exit_req.employee.employment_status == "exited"
    result = finalize_exit(exit_req, actor=request.user, disable_login=True)
    emp = result["employee"]
    if was_exited:
        messages.info(request, f"{emp.full_name} was already marked as exited.")
    else:
        msg = f"{emp.full_name} marked as exited (last working day {result['exit_date'].strftime('%d %b %Y')})."
        if result["login_disabled"]:
            msg += " Application login disabled."
        messages.success(request, msg)
    return redirect("hr_ops:exit_list")


@hr_admin_required
@require_POST
def exit_revoke_login(request, pk):
    """Disable application login from the exit management list."""
    if not request.user.is_hr_admin:
        messages.error(request, "HR admin access required.")
        return redirect("hr_ops:exit_list")
    tenant = request.tenant
    exit_req = get_object_or_404(ExitRequest, pk=pk, tenant=tenant)
    from apps.employees.access_services import revoke_employee_access
    if revoke_employee_access(exit_req.employee):
        messages.success(request, f"Login disabled for {exit_req.employee.full_name}.")
    else:
        messages.info(request, f"No active login to disable for {exit_req.employee.full_name}.")
    return redirect("hr_ops:exit_list")


@login_required
def announcement_list(request):
    tenant = request.tenant
    announcements = Announcement.objects.filter(
        tenant=tenant, is_published=True
    ).order_by("-published_at")
    return render(request, "hr_ops/announcements.html", {"announcements": announcements})


# ───────── Onboarding Templates ─────────
@hr_admin_required
def onboarding_template_list(request):
    tenant = request.tenant
    templates = OnboardingTemplate.objects.filter(tenant=tenant).order_by("-is_default", "name")
    for t in templates:
        t.task_count = t.tasks.count()
    return render(request, "hr_ops/onboarding_templates.html", {"templates": templates})


@hr_admin_required
def onboarding_template_create_or_edit(request, pk=None):
    from .forms import OnboardingTemplateForm, OnboardingTaskFormSet
    tenant = request.tenant
    tmpl = get_object_or_404(OnboardingTemplate, pk=pk, tenant=tenant) if pk else None

    if request.method == "POST":
        form = OnboardingTemplateForm(request.POST, instance=tmpl)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            obj.save()
            if obj.is_default:
                OnboardingTemplate.objects.filter(tenant=tenant).exclude(pk=obj.pk).update(is_default=False)
            formset = OnboardingTaskFormSet(request.POST, instance=obj)
            if formset.is_valid():
                formset.save()
                messages.success(request, f'Onboarding template "{obj.name}" saved with {obj.tasks.count()} task(s).')
                return redirect("hr_ops:onboarding_templates")
    else:
        form = OnboardingTemplateForm(instance=tmpl)
        formset = OnboardingTaskFormSet(instance=tmpl)

    return render(request, "hr_ops/onboarding_template_form.html", {
        "form": form, "formset": formset, "template": tmpl,
    })


@hr_admin_required
def onboarding_detail(request, pk):
    """View one employee's onboarding checklist."""
    tenant = request.tenant
    onboarding = get_object_or_404(EmployeeOnboarding, pk=pk, tenant=tenant)
    items = onboarding.items.select_related("task", "completed_by").order_by("task__sequence_order")
    return render(request, "hr_ops/onboarding_detail.html", {
        "onboarding": onboarding, "items": items,
    })


@hr_admin_required
@require_POST
def onboarding_complete_view(request, pk):
    tenant = request.tenant
    onboarding = get_object_or_404(EmployeeOnboarding, pk=pk, tenant=tenant)
    onboarding.completed_at = timezone.now()
    onboarding.save(update_fields=["completed_at"])
    messages.success(request, f"Onboarding completed for {onboarding.employee.full_name}.")
    return redirect("hr_ops:onboarding")


@hr_admin_required
@require_POST
def onboarding_item_skip(request, item_pk):
    tenant = request.tenant
    item = get_object_or_404(OnboardingItem, pk=item_pk, onboarding__tenant=tenant)
    item.status = "skipped"
    item.completed_at = timezone.now()
    item.completed_by = request.user
    item.notes = request.POST.get("notes", "") or "Skipped"
    item.save()
    return redirect("hr_ops:onboarding_detail", pk=item.onboarding.pk)


# ───────── Audit log ─────────
@hr_admin_required
def audit_log_list(request):
    from .models import AuditLog
    from django.core.paginator import Paginator

    tenant = request.tenant
    qs = AuditLog.objects.filter(tenant=tenant).select_related("actor")

    # Filters
    action_f = request.GET.get("action", "")
    resource_f = request.GET.get("resource", "")
    actor_f = request.GET.get("actor", "")
    q = request.GET.get("q", "").strip()

    if action_f:
        qs = qs.filter(action=action_f)
    if resource_f:
        qs = qs.filter(resource_type=resource_f)
    if actor_f:
        qs = qs.filter(actor_id=actor_f)
    if q:
        from django.db.models import Q
        qs = qs.filter(Q(summary__icontains=q) | Q(resource_label__icontains=q))

    page = Paginator(qs.order_by("-created_at"), 50).get_page(request.GET.get("page"))

    # Distinct values for filter dropdowns
    actions = AuditLog.objects.filter(tenant=tenant).values_list("action", flat=True).distinct()
    resources = AuditLog.objects.filter(tenant=tenant).values_list("resource_type", flat=True).distinct()

    return render(request, "hr_ops/audit_log.html", {
        "page": page,
        "actions": sorted(set(actions)),
        "resources": sorted(set(resources)),
        "filters": {"action": action_f, "resource": resource_f, "actor": actor_f, "q": q},
    })


# ───────── Document expiry ─────────
@hr_admin_required
def document_expiry(request):
    """List documents that are expiring soon (or have expired)."""
    import datetime
    from apps.employees.models import EmployeeDocument

    tenant = request.tenant
    today = datetime.date.today()
    days_window = int(request.GET.get("days", 60))
    cutoff = today + datetime.timedelta(days=days_window)

    docs = EmployeeDocument.objects.filter(
        tenant=tenant, expiry_date__isnull=False,
        expiry_date__lte=cutoff,
    ).select_related("employee").order_by("expiry_date")

    expired = []
    expiring_soon = []
    for d in docs:
        days = (d.expiry_date - today).days
        d.days_left = days
        if days < 0:
            expired.append(d)
        else:
            expiring_soon.append(d)

    return render(request, "hr_ops/document_expiry.html", {
        "expired": expired,
        "expiring_soon": expiring_soon,
        "days_window": days_window,
    })


# ───────── People Pulse — birthdays / anniversaries / probation ─────────
@hr_admin_required
def people_pulse(request):
    import datetime
    from apps.employees.models import Employee

    tenant = request.tenant
    today = datetime.date.today()
    end_of_week = today + datetime.timedelta(days=7)
    end_of_month = today + datetime.timedelta(days=30)

    active = Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")

    def next_recurrence(date_obj, ref):
        try:
            this_year = date_obj.replace(year=ref.year)
        except ValueError:
            this_year = date_obj.replace(year=ref.year, day=28)
        if this_year < ref:
            try:
                return date_obj.replace(year=ref.year + 1)
            except ValueError:
                return date_obj.replace(year=ref.year + 1, day=28)
        return this_year

    # ── Birthdays (use dicts; Django templates disallow underscore attrs) ──
    todays_birthdays, week_birthdays, month_birthdays = [], [], []
    for emp in active.exclude(date_of_birth__isnull=True):
        next_bday = next_recurrence(emp.date_of_birth, today)
        days = (next_bday - today).days
        row = {"emp": emp, "next_date": next_bday, "days_left": days}
        if days == 0:
            todays_birthdays.append(row)
        elif days <= 7:
            week_birthdays.append(row)
        elif days <= 30:
            month_birthdays.append(row)
    todays_birthdays.sort(key=lambda r: r["next_date"])
    week_birthdays.sort(key=lambda r: r["next_date"])
    month_birthdays.sort(key=lambda r: r["next_date"])

    # ── Work anniversaries ──
    todays_anniv, upcoming_anniv = [], []
    for emp in active.exclude(date_of_joining__isnull=True):
        next_anniv = next_recurrence(emp.date_of_joining, today)
        days = (next_anniv - today).days
        years = next_anniv.year - emp.date_of_joining.year
        if years < 1:
            continue
        row = {"emp": emp, "next_date": next_anniv, "days_left": days, "years": years}
        if days == 0:
            todays_anniv.append(row)
        elif days <= 30:
            upcoming_anniv.append(row)
    todays_anniv.sort(key=lambda r: -r["years"])
    upcoming_anniv.sort(key=lambda r: r["next_date"])

    # ── Probation ──
    probation_overdue = list(
        active.filter(probation_end_date__lt=today).exclude(date_of_confirmation__isnull=False).order_by("probation_end_date")
    )
    probation_soon = list(
        active.filter(probation_end_date__gte=today, probation_end_date__lte=end_of_month).order_by("probation_end_date")
    )

    return render(request, "hr_ops/people_pulse.html", {
        "todays_birthdays": todays_birthdays,
        "week_birthdays": week_birthdays,
        "month_birthdays": month_birthdays,
        "todays_anniv": todays_anniv,
        "upcoming_anniv": upcoming_anniv,
        "probation_overdue": probation_overdue,
        "probation_soon": probation_soon,
    })


# ───────── Notifications ─────────
@login_required
def notification_list(request):
    from .models import Notification
    from django.utils import timezone
    qs = Notification.objects.filter(recipient=request.user).order_by("-created_at")[:100]

    if request.GET.get("mark_all") == "1":
        Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return redirect("hr_ops:notifications")

    return render(request, "hr_ops/notifications.html", {"notifications": qs})


@login_required
def notification_open(request, pk):
    """Mark notification read and redirect to its action_url."""
    from .models import Notification
    n = get_object_or_404(Notification, pk=pk, recipient=request.user)
    n.mark_read()
    if n.action_url:
        return redirect(n.action_url)
    return redirect("hr_ops:notifications")


@login_required
def notification_dropdown(request):
    """HTMX endpoint that returns the dropdown content (latest 8 + unread count)."""
    from .models import Notification
    latest = list(Notification.objects.filter(recipient=request.user).order_by("-created_at")[:8])
    unread = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return render(request, "hr_ops/partials/notification_dropdown.html", {
        "notifications": latest, "unread_count": unread,
    })


# ───────── Generic create/edit views for assets, announcements ─────────
@hr_admin_required
def asset_create_or_edit(request, pk=None):
    from .forms import AssetForm
    from .asset_services import generate_asset_code
    tenant = request.tenant
    a = get_object_or_404(Asset, pk=pk, tenant=tenant) if pk else None
    if request.method == "POST":
        form = AssetForm(request.POST, instance=a)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            if not obj.asset_code:
                obj.asset_code = generate_asset_code(tenant, obj.category, obj.make)
            obj.save()
            messages.success(request, f'Asset "{obj.name}" saved as {obj.asset_code}.')
            return redirect("hr_ops:assets")
    else:
        form = AssetForm(instance=a)
    return render(request, "hr_ops/asset_form.html", {"form": form, "asset": a})


@hr_admin_required
def announcement_create_or_edit(request, pk=None):
    from .forms import AnnouncementForm
    from django.utils import timezone
    tenant = request.tenant
    a = get_object_or_404(Announcement, pk=pk, tenant=tenant) if pk else None
    if request.method == "POST":
        form = AnnouncementForm(request.POST, instance=a)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            obj.created_by = obj.created_by or request.user
            if obj.is_published and not obj.published_at:
                obj.published_at = timezone.now()
            obj.save()
            messages.success(request, f'Announcement "{obj.title}" saved.')
            return redirect("hr_ops:announcements")
    else:
        form = AnnouncementForm(instance=a)
    return render(request, "hr_ops/announcement_form.html", {"form": form, "announcement": a})
