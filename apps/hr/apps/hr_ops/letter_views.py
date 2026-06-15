"""Letter template views — company settings, defaults, generation."""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from apps.employees.models import Employee

from .forms import CompanyLetterSettingsForm
from .letter_company import get_company_profile, save_company_profile
from .letter_services import seed_default_letter_templates
from .models import LetterTemplate
from .services import generate_letter


@login_required
def letter_company_settings(request):
    if not request.user.is_hr_admin:
        return redirect("/")
    tenant = request.tenant
    profile = get_company_profile(tenant)

    if request.method == "POST":
        form = CompanyLetterSettingsForm(request.POST)
        if form.is_valid():
            save_company_profile(tenant, form.cleaned_data)
            messages.success(request, "Company letter settings saved.")
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
        })

    return render(request, "hr_ops/letter_company_settings.html", {"form": form, "profile": profile})


@login_required
@require_POST
def letter_seed_defaults(request):
    if not request.user.is_hr_admin:
        return redirect("/")
    created, skipped = seed_default_letter_templates(request.tenant, created_by=request.user)
    if created:
        messages.success(request, f"Installed {created} default letter template(s).")
    else:
        messages.info(request, "Default templates already exist — edit them or create custom ones.")
    return redirect("hr_ops:letter_templates")


@login_required
def employee_letter_picker(request, employee_pk):
    if not request.user.is_hr_admin:
        return redirect("/")
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=request.tenant)
    templates = LetterTemplate.objects.filter(tenant=request.tenant, is_active=True).order_by("letter_type")
    profile = get_company_profile(request.tenant)
    return render(request, "hr_ops/employee_letter_picker.html", {
        "employee": employee,
        "templates": templates,
        "profile": profile,
        "needs_setup": not profile.signatory_name,
    })


# Extra fields shown when generating specific letter types
LETTER_EXTRA_FIELDS = {
    "offer": [
        ("ctc", "Annual CTC (INR)", "text", ""),
        ("joining_date", "Date of joining (if different)", "date", ""),
    ],
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
    "warning": [
        ("warning_subject", "Subject", "text", "Formal Warning"),
        ("warning_reason", "Reason / incident", "text", ""),
    ],
    "appreciation": [
        ("appreciation_reason", "Reason for appreciation", "text", ""),
    ],
}


@login_required
def generate_letter_view(request, employee_pk, template_pk):
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=tenant)
    template = get_object_or_404(LetterTemplate, pk=template_pk, tenant=tenant)
    extra_fields = LETTER_EXTRA_FIELDS.get(template.letter_type, [])

    if request.method == "POST":
        extra = {k: v for k, v in request.POST.items()
                 if k not in ("csrfmiddlewaretoken",) and v}
        letter = generate_letter(tenant, employee, template, request.user, extra_context=extra)
        messages.success(request, f"{template.get_letter_type_display()} generated.")
        return redirect("hr_ops:letter_download", pk=letter.pk)

    return render(request, "hr_ops/generate_letter.html", {
        "employee": employee,
        "template": template,
        "extra_fields": extra_fields,
        "profile": get_company_profile(tenant),
    })
