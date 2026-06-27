"""Letter management views — settings, generation workflow, history."""
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST, require_http_methods

from apps.employees.models import Employee
from utils.access import can_approve_letters, can_generate_letters, can_issue_letter, perm_required

from .forms import CompanyLetterSettingsForm, LetterDraftForm, LetterSignatoryForm
from .letter_company import get_branding, get_company_profile, get_letter_signatories, save_company_profile
from .letter_render import render_letter_body, wrap_letter_document
from .letter_services import seed_default_letter_templates
from .letter_workflow import (
    approve_letter,
    create_draft_letter,
    create_revision,
    duplicate_letter,
    email_letter,
    issue_letter,
    issue_or_submit,
    reject_letter,
    save_draft,
    soft_delete_letter,
    submit_for_approval,
)
from .models import CompanyLetterSignatory, HRLetter, LetterTemplate
from .services import audit_log


def _client_ip(request):
    return request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")


LETTER_EXTRA_FIELDS = {
    "offer": [
        ("ctc", "Annual CTC (INR)", "text", ""),
        ("joining_date", "Date of joining (if different)", "date", ""),
    ],
    "appointment": [],
    "relieving": [
        ("resignation_date", "Resignation date", "date", ""),
        ("last_working_day", "Last working day", "date", ""),
    ],
    "experience": [
        ("last_working_day", "Last working day", "date", ""),
    ],
    "increment": [
        ("new_ctc", "New annual CTC (INR)", "text", ""),
        ("effective_date", "Effective date", "date", ""),
    ],
    "promotion": [
        ("new_designation", "New designation", "text", ""),
        ("new_department", "New department", "text", ""),
        ("effective_date", "Effective date", "date", ""),
    ],
    "confirmation": [
        ("confirmation_date", "Confirmation date", "date", ""),
    ],
    "termination": [
        ("last_working_day", "Last working day", "date", ""),
        ("termination_reason", "Reason", "text", ""),
    ],
    "internship": [
        ("internship_start", "Internship start", "date", ""),
        ("internship_end", "Internship end", "date", ""),
    ],
    "warning": [
        ("warning_subject", "Subject", "text", "Formal Warning"),
        ("warning_reason", "Reason / incident", "text", ""),
    ],
    "appreciation": [
        ("appreciation_reason", "Reason for appreciation", "text", ""),
    ],
    "intent": [
        ("proposed_designation", "Proposed designation", "text", ""),
        ("proposed_joining_date", "Tentative joining date", "date", ""),
        ("joining_date", "Joining date (if different)", "date", ""),
        ("ctc", "Proposed annual CTC (INR)", "text", ""),
        ("intent_valid_until", "LOI valid until", "date", ""),
    ],
    "noc": [
        ("noc_purpose", "Purpose of NOC", "text", "Visa / loan / higher studies / new employment"),
        ("noc_valid_until", "Valid until (optional)", "date", ""),
        ("last_working_day", "Last working day (if applicable)", "date", ""),
    ],
    "certificate": [
        ("certificate_title", "Certificate title", "text", "Certificate of Achievement"),
        ("certificate_event", "Event / program name", "text", "Annual Sports Day 2026"),
        ("certificate_date", "Event / award date", "date", ""),
        ("certificate_reason", "Achievement / participation details", "text", ""),
    ],
}


@perm_required("hr_ops.generate_letters")
def letter_company_settings(request):
    tenant = request.tenant
    profile = get_company_profile(tenant)
    branding = get_branding(tenant)

    if request.method == "POST":
        form = CompanyLetterSettingsForm(request.POST, request.FILES)
        if form.is_valid():
            save_company_profile(tenant, form.cleaned_data, files=request.FILES)
            messages.success(request, "Company letterhead settings saved.")
            return redirect("hr_ops:letter_company_settings")
    else:
        form = CompanyLetterSettingsForm(initial={
            "display_name": profile.name,
            "address": profile.address,
            "city": profile.city,
            "signatory_name": profile.signatory_name,
            "signatory_title": profile.signatory_title,
            "contact_email": profile.contact_email,
            "contact_phone": profile.contact_phone,
            "ref_prefix": profile.ref_prefix,
            "footer_text": profile.footer_text,
        })

    return render(request, "hr_ops/letter_company_settings.html", {
        "form": form,
        "profile": profile,
        "branding": branding,
        "signatories": get_letter_signatories(tenant),
        "signatory_count": CompanyLetterSignatory.objects.filter(tenant=tenant, is_active=True).count(),
    })


@perm_required("hr_ops.generate_letters")
def letter_signatories(request):
    tenant = request.tenant
    signatories = CompanyLetterSignatory.objects.filter(tenant=tenant).order_by("sort_order", "pk")
    return render(request, "hr_ops/letter_signatories.html", {
        "signatories": signatories,
        "legacy_signatories": get_letter_signatories(tenant) if not signatories.filter(is_active=True).exists() else [],
    })


@perm_required("hr_ops.generate_letters")
@require_http_methods(["GET", "POST"])
def letter_signatory_edit(request, pk=None):
    tenant = request.tenant
    signatory = get_object_or_404(CompanyLetterSignatory, pk=pk, tenant=tenant) if pk else None

    if request.method == "POST":
        form = LetterSignatoryForm(request.POST, request.FILES, instance=signatory)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            obj.save()
            messages.success(request, f'Signatory "{obj.name}" saved.')
            return redirect("hr_ops:letter_signatories")
    else:
        initial = {}
        if not signatory:
            initial["sort_order"] = (
                CompanyLetterSignatory.objects.filter(tenant=tenant).count()
            )
        form = LetterSignatoryForm(instance=signatory, initial=initial if not signatory else None)

    return render(request, "hr_ops/letter_signatory_form.html", {"form": form, "signatory": signatory})


@perm_required("hr_ops.generate_letters")
@require_POST
def letter_signatory_import_legacy(request):
    """Create first signatory row from legacy letterhead name + signature image."""
    tenant = request.tenant
    if CompanyLetterSignatory.objects.filter(tenant=tenant).exists():
        messages.info(request, "Signatories already configured — edit them below.")
        return redirect("hr_ops:letter_signatories")

    profile = get_company_profile(tenant)
    branding = get_branding(tenant)
    if not profile.signatory_name and not (branding and branding.signature_image):
        messages.error(request, "Set signatory name or signature on letterhead settings first.")
        return redirect("hr_ops:letter_company_settings")

    CompanyLetterSignatory.objects.create(
        tenant=tenant,
        name=profile.signatory_name or "Authorized Signatory",
        title=profile.signatory_title or "",
        signature_image=branding.signature_image if branding and branding.signature_image else None,
        sort_order=0,
    )
    messages.success(request, "Imported legacy signatory. Add more signatories if needed.")
    return redirect("hr_ops:letter_signatories")


@perm_required("hr_ops.generate_letters")
@require_POST
def letter_signatory_delete(request, pk):
    signatory = get_object_or_404(CompanyLetterSignatory, pk=pk, tenant=request.tenant)
    name = signatory.name
    signatory.delete()
    messages.success(request, f'Removed signatory "{name}".')
    return redirect("hr_ops:letter_signatories")


@perm_required("hr_ops.generate_letters")
def letter_seed_defaults(request):
    created, skipped = seed_default_letter_templates(request.tenant, created_by=request.user)
    if created:
        messages.success(request, f"Installed {created} default letter template(s).")
    else:
        messages.info(request, "Default templates already exist — edit them or create custom ones.")
    return redirect("hr_ops:letter_templates")


@perm_required("hr_ops.generate_letters")
def letter_history(request):
    tenant = request.tenant
    qs = (
        HRLetter.objects.filter(tenant=tenant, is_deleted=False)
        .select_related("employee", "template", "generated_by", "approved_by")
        .order_by("-generated_at")
    )

    employee_id = request.GET.get("employee")
    letter_type = request.GET.get("type")
    status = request.GET.get("status")
    generated_by = request.GET.get("generated_by")
    date_from = request.GET.get("from")
    date_to = request.GET.get("to")

    if employee_id:
        qs = qs.filter(employee_id=employee_id)
    if letter_type:
        qs = qs.filter(letter_type=letter_type)
    if status:
        qs = qs.filter(status=status)
    if generated_by:
        qs = qs.filter(generated_by_id=generated_by)
    if date_from:
        qs = qs.filter(generated_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(generated_at__date__lte=date_to)

    paginator = Paginator(qs, 25)
    page_obj = paginator.get_page(request.GET.get("page"))

    pending_approval_count = 0
    if can_approve_letters(request.user):
        pending_approval_count = HRLetter.objects.filter(
            tenant=tenant, status="pending_approval", is_deleted=False
        ).count()

    employees = Employee.objects.filter(tenant=tenant, is_active=True).order_by("first_name", "last_name")[:200]
    from apps.accounts.models import User
    authors = User.objects.filter(
        pk__in=HRLetter.objects.filter(tenant=tenant).values_list("generated_by_id", flat=True).distinct()
    )

    return render(request, "hr_ops/letter_history.html", {
        "page_obj": page_obj,
        "employees": employees,
        "authors": authors,
        "letter_type_choices": LetterTemplate.LETTER_TYPES,
        "status_choices": HRLetter.STATUS_CHOICES,
        "pending_approval_count": pending_approval_count,
        "can_approve_letters": can_approve_letters(request.user),
        "filters": {
            "employee": employee_id or "",
            "type": letter_type or "",
            "status": status or "",
            "generated_by": generated_by or "",
            "from": date_from or "",
            "to": date_to or "",
        },
    })


@perm_required("hr_ops.generate_letters")
def letter_detail(request, pk):
    letter = get_object_or_404(
        HRLetter.objects.select_related(
            "employee", "template", "generated_by", "approved_by", "rejected_by",
            "job_application", "job_application__candidate", "job_application__job_opening",
        ),
        pk=pk,
        tenant=request.tenant,
        is_deleted=False,
    )
    audit_log(
        request.tenant, request.user, "view", "HRLetter", letter,
        f"Viewed {letter.get_letter_type_display() if hasattr(letter, 'get_letter_type_display') else letter.letter_type}",
        ip_address=_client_ip(request),
    )
    revisions = HRLetter.objects.filter(
        tenant=request.tenant,
        is_deleted=False,
    ).filter(Q(pk=letter.pk) | Q(parent=letter.parent or letter)).order_by("-version")

    user = request.user
    return render(request, "hr_ops/letter_detail.html", {
        "letter": letter,
        "revisions": revisions,
        "preview_html": wrap_letter_document(render_letter_body(letter), request.tenant),
        "can_generate_letters": can_generate_letters(user),
        "can_approve_letters": can_approve_letters(user),
        "can_issue_letter": can_issue_letter(user, letter),
    })


@perm_required("hr_ops.generate_letters")
def letter_edit_draft(request, pk):
    letter = get_object_or_404(HRLetter, pk=pk, tenant=request.tenant, is_deleted=False)
    if not letter.is_editable:
        messages.error(request, "Issued letters cannot be edited. Create a revision instead.")
        return redirect("hr_ops:letter_detail", pk=letter.pk)

    if request.method == "POST":
        form = LetterDraftForm(request.POST)
        if form.is_valid():
            save_draft(letter, form.cleaned_data["draft_html"], request.user, ip=_client_ip(request))
            messages.success(request, "Draft saved.")
            if request.POST.get("action") == "preview":
                return redirect("hr_ops:letter_detail", pk=letter.pk)
            return redirect("hr_ops:letter_edit_draft", pk=letter.pk)
    else:
        form = LetterDraftForm(initial={"draft_html": letter.draft_html})

    return render(request, "hr_ops/letter_edit_draft.html", {"letter": letter, "form": form})


@perm_required("hr_ops.generate_letters")
def employee_letter_picker(request, employee_pk):
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=request.tenant)
    templates = LetterTemplate.objects.filter(tenant=request.tenant, is_active=True).order_by("letter_type")
    profile = get_company_profile(request.tenant)
    recent = HRLetter.objects.filter(tenant=request.tenant, employee=employee, is_deleted=False)[:5]
    return render(request, "hr_ops/employee_letter_picker.html", {
        "employee": employee,
        "templates": templates,
        "profile": profile,
        "needs_setup": not profile.signatory_name,
        "recent_letters": recent,
    })


@perm_required("hr_ops.generate_letters")
@require_http_methods(["GET", "POST"])
def generate_letter_view(request, employee_pk, template_pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=tenant)
    template = get_object_or_404(LetterTemplate, pk=template_pk, tenant=tenant)
    extra_fields = LETTER_EXTRA_FIELDS.get(template.letter_type, [])

    if request.method == "POST":
        extra = {k: v for k, v in request.POST.items()
                 if k not in ("csrfmiddlewaretoken", "action") and v}
        letter = create_draft_letter(tenant, employee, template, request.user, extra_context=extra)
        messages.success(request, f"Draft {template.get_letter_type_display()} created.")
        return redirect("hr_ops:letter_edit_draft", pk=letter.pk)

    return render(request, "hr_ops/generate_letter.html", {
        "employee": employee,
        "template": template,
        "extra_fields": extra_fields,
        "profile": get_company_profile(tenant),
    })


@perm_required("hr_ops.generate_letters")
@require_POST
def letter_submit(request, pk):
    letter = get_object_or_404(HRLetter, pk=pk, tenant=request.tenant, is_deleted=False)
    try:
        submit_for_approval(letter, request.user, ip=_client_ip(request))
        messages.success(request, "Letter submitted for approval.")
    except ValueError as exc:
        messages.error(request, str(exc))
    return redirect("hr_ops:letter_detail", pk=pk)


@perm_required("hr_ops.approve_letters")
@require_POST
def letter_approve(request, pk):
    letter = get_object_or_404(HRLetter, pk=pk, tenant=request.tenant, is_deleted=False)
    try:
        approve_letter(letter, request.user, ip=_client_ip(request))
        messages.success(request, "Letter approved.")
    except ValueError as exc:
        messages.error(request, str(exc))
    return redirect("hr_ops:letter_detail", pk=pk)


@perm_required("hr_ops.approve_letters")
@require_POST
def letter_reject(request, pk):
    letter = get_object_or_404(HRLetter, pk=pk, tenant=request.tenant, is_deleted=False)
    reason = request.POST.get("reason", "")
    try:
        reject_letter(letter, request.user, reason, ip=_client_ip(request))
        messages.success(request, "Letter rejected.")
    except ValueError as exc:
        messages.error(request, str(exc))
    return redirect("hr_ops:letter_detail", pk=pk)


@perm_required("hr_ops.generate_letters", "hr_ops.approve_letters")
@require_POST
def letter_issue(request, pk):
    letter = get_object_or_404(HRLetter, pk=pk, tenant=request.tenant, is_deleted=False)
    if not can_issue_letter(request.user, letter):
        messages.error(request, "You do not have permission to issue this letter.")
        return redirect("hr_ops:letter_detail", pk=pk)
    try:
        if letter.status == "approved":
            issue_letter(letter, request.user, ip=_client_ip(request))
        else:
            issue_or_submit(letter, request.user, ip=_client_ip(request))
        messages.success(request, "Letter issued successfully.")
    except ValueError as exc:
        messages.error(request, str(exc))
    return redirect("hr_ops:letter_detail", pk=pk)


@perm_required("hr_ops.generate_letters")
@require_POST
def letter_email(request, pk):
    letter = get_object_or_404(HRLetter, pk=pk, tenant=request.tenant, is_deleted=False)
    if email_letter(letter, request.user, ip=_client_ip(request)):
        messages.success(request, "Letter emailed to employee.")
    else:
        messages.error(request, "Could not email — check employee has an email address.")
    return redirect("hr_ops:letter_detail", pk=pk)


@perm_required("hr_ops.generate_letters")
@require_POST
def letter_duplicate(request, pk):
    letter = get_object_or_404(HRLetter, pk=pk, tenant=request.tenant, is_deleted=False)
    new_letter = duplicate_letter(letter, request.user, ip=_client_ip(request))
    messages.success(request, "Letter duplicated as new draft.")
    return redirect("hr_ops:letter_edit_draft", pk=new_letter.pk)


@perm_required("hr_ops.generate_letters")
@require_POST
def letter_revision(request, pk):
    letter = get_object_or_404(HRLetter, pk=pk, tenant=request.tenant, is_deleted=False)
    try:
        revision = create_revision(letter, request.user, ip=_client_ip(request))
        messages.success(request, f"Revision v{revision.version} created.")
        return redirect("hr_ops:letter_edit_draft", pk=revision.pk)
    except ValueError as exc:
        messages.error(request, str(exc))
        return redirect("hr_ops:letter_detail", pk=pk)


@perm_required("hr_ops.generate_letters")
@require_POST
def letter_delete(request, pk):
    letter = get_object_or_404(HRLetter, pk=pk, tenant=request.tenant, is_deleted=False)
    try:
        soft_delete_letter(letter, request.user, ip=_client_ip(request))
        messages.success(request, "Draft deleted.")
    except ValueError as exc:
        messages.error(request, str(exc))
        return redirect("hr_ops:letter_detail", pk=pk)
    return redirect("hr_ops:letter_history")
