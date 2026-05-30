from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.http import require_POST

from .models import (
    LetterTemplate, HRLetter, Asset, AssetAssignment,
    OnboardingTemplate, EmployeeOnboarding, OnboardingItem,
    ExitRequest, Announcement,
)
from .services import generate_letter, start_onboarding
from apps.employees.models import Employee


# ---------------------------------------------------------------------------
# HR Letters
# ---------------------------------------------------------------------------
@login_required
def letter_template_list(request):
    tenant = request.tenant
    templates = LetterTemplate.objects.filter(tenant=tenant, is_active=True).order_by("letter_type")
    return render(request, "hr_ops/letter_templates.html", {"templates": templates})


@login_required
def generate_letter_view(request, employee_pk, template_pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=tenant)
    template = get_object_or_404(LetterTemplate, pk=template_pk, tenant=tenant)

    if request.method == "POST":
        extra = {k: v for k, v in request.POST.items() if not k.startswith("csrfmiddlewaretoken")}
        letter = generate_letter(tenant, employee, template, request.user, extra_context=extra)
        messages.success(request, f"{template.get_letter_type_display()} generated.")
        return redirect("hr_ops:letter_download", pk=letter.pk)

    return render(request, "hr_ops/generate_letter.html", {
        "employee": employee, "template": template
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


@login_required
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
@login_required
def asset_list(request):
    tenant = request.tenant
    assets = Asset.objects.filter(tenant=tenant).order_by("name")
    return render(request, "hr_ops/assets.html", {"assets": assets})


@login_required
@require_POST
def asset_assign(request, asset_pk):
    tenant = request.tenant
    asset = get_object_or_404(Asset, pk=asset_pk, tenant=tenant, status="available")
    employee_id = request.POST.get("employee_id")
    employee = get_object_or_404(Employee, pk=employee_id, tenant=tenant)

    AssetAssignment.objects.create(
        asset=asset, employee=employee,
        condition_on_assign=request.POST.get("condition", "good"),
        assigned_by=request.user,
    )
    asset.status = "assigned"
    asset.save(update_fields=["status"])
    messages.success(request, f"{asset.name} assigned to {employee.full_name}.")
    return redirect("hr_ops:assets")


@login_required
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
@login_required
def onboarding_list(request):
    tenant = request.tenant
    onboardings = EmployeeOnboarding.objects.filter(
        tenant=tenant, completed_at__isnull=True
    ).select_related("employee").order_by("-started_at")
    return render(request, "hr_ops/onboarding.html", {"onboardings": onboardings})


@login_required
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


@login_required
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
@login_required
def exit_list(request):
    tenant = request.tenant
    exits = ExitRequest.objects.filter(tenant=tenant).select_related("employee").order_by("-created_at")
    return render(request, "hr_ops/exits.html", {"exits": exits})


@login_required
@require_POST
def exit_request_create(request, employee_pk):
    import datetime
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=tenant)

    raw_date = (request.POST.get("resignation_date") or "").strip()
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

    _, created = ExitRequest.objects.get_or_create(
        tenant=tenant, employee=employee,
        defaults={"resignation_date": resignation_date, "exit_reason": exit_reason},
    )
    if not created:
        messages.warning(request, f"{employee.full_name} already has an open exit request.")
        return redirect("hr_ops:exit_list")

    # Update employee status
    employee.employment_status = "notice_period"
    employee.save(update_fields=["employment_status"])

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


# ---------------------------------------------------------------------------
# Announcements
# ---------------------------------------------------------------------------
@login_required
def announcement_list(request):
    tenant = request.tenant
    announcements = Announcement.objects.filter(
        tenant=tenant, is_published=True
    ).order_by("-published_at")
    return render(request, "hr_ops/announcements.html", {"announcements": announcements})


# ───────── Onboarding Templates ─────────
@login_required
def onboarding_template_list(request):
    tenant = request.tenant
    templates = OnboardingTemplate.objects.filter(tenant=tenant).order_by("-is_default", "name")
    for t in templates:
        t.task_count = t.tasks.count()
    return render(request, "hr_ops/onboarding_templates.html", {"templates": templates})


@login_required
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


@login_required
def onboarding_detail(request, pk):
    """View one employee's onboarding checklist."""
    tenant = request.tenant
    onboarding = get_object_or_404(EmployeeOnboarding, pk=pk, tenant=tenant)
    items = onboarding.items.select_related("task", "completed_by").order_by("task__sequence_order")
    return render(request, "hr_ops/onboarding_detail.html", {
        "onboarding": onboarding, "items": items,
    })


@login_required
@require_POST
def onboarding_complete_view(request, pk):
    tenant = request.tenant
    onboarding = get_object_or_404(EmployeeOnboarding, pk=pk, tenant=tenant)
    onboarding.completed_at = timezone.now()
    onboarding.save(update_fields=["completed_at"])
    messages.success(request, f"Onboarding completed for {onboarding.employee.full_name}.")
    return redirect("hr_ops:onboarding")


@login_required
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
@login_required
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
@login_required
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
@login_required
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


# ───────── Generic create/edit views for letter templates, assets, announcements ─────────
@login_required
def letter_template_create_or_edit(request, pk=None):
    from .forms import LetterTemplateForm
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
        form = LetterTemplateForm(instance=t)
    return render(request, "hr_ops/letter_template_form.html", {"form": form, "template": t})


@login_required
def asset_create_or_edit(request, pk=None):
    from .forms import AssetForm
    tenant = request.tenant
    a = get_object_or_404(Asset, pk=pk, tenant=tenant) if pk else None
    if request.method == "POST":
        form = AssetForm(request.POST, instance=a)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            obj.save()
            messages.success(request, f'Asset "{obj.name}" saved.')
            return redirect("hr_ops:assets")
    else:
        form = AssetForm(instance=a)
    return render(request, "hr_ops/asset_form.html", {"form": form, "asset": a})


@login_required
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
