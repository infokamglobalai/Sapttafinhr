"""Link Recruitment AI offers to formal HR letter drafts."""
from __future__ import annotations

from apps.recruitment.models import JobApplication
from apps.recruitment.offer_ai import generate_offer_letter_text, offer_text_to_html

from .letter_services import seed_default_letter_templates
from .letter_workflow import create_draft_letter, save_draft
from .models import HRLetter, LetterTemplate


OPEN_OFFER_STATUSES = ("draft", "pending_approval", "approved", "rejected")


def find_open_offer_draft(application: JobApplication) -> HRLetter | None:
    return (
        HRLetter.objects.filter(
            tenant=application.tenant,
            job_application=application,
            letter_type="offer",
            is_deleted=False,
            status__in=OPEN_OFFER_STATUSES,
        )
        .order_by("-generated_at")
        .first()
    )


def _offer_template(tenant, created_by):
    template = LetterTemplate.objects.filter(
        tenant=tenant, letter_type="offer", is_active=True
    ).first()
    if template:
        return template
    seed_default_letter_templates(tenant, created_by=created_by)
    return LetterTemplate.objects.filter(
        tenant=tenant, letter_type="offer", is_active=True
    ).first()


def _application_offer_context(application: JobApplication, *, salary: str = "", joining_date: str = "") -> dict:
    candidate = application.candidate
    job = application.job_opening
    extra = {}
    ctc = salary or (str(candidate.expected_ctc) if candidate.expected_ctc else "")
    if ctc:
        extra["ctc"] = ctc
    if joining_date:
        extra["joining_date"] = joining_date
    extra["recruitment_role"] = job.title
    extra["recruitment_department"] = job.department.name if job.department_id else ""
    return extra


def create_recruitment_offer_draft(
    application: JobApplication,
    actor,
    *,
    ai_body_text: str | None = None,
    use_ai_body: bool = False,
    salary: str = "",
    joining_date: str = "",
    probation_months: int = 3,
    regenerate: bool = False,
) -> HRLetter:
    """
    Create (or update) an HR offer letter draft for a recruitment application.
    Ensures a matching employee record exists for letter merge fields.
    """
    from apps.recruitment.services import ensure_employee_for_application

    tenant = application.tenant
    existing = find_open_offer_draft(application)
    if existing and not regenerate:
        if use_ai_body and ai_body_text:
            save_draft(existing, offer_text_to_html(ai_body_text), actor)
        return existing

    employee = ensure_employee_for_application(application, created_by=actor)
    template = _offer_template(tenant, actor)
    if not template:
        raise ValueError("No offer letter template found. Seed letter templates first.")

    extra = _application_offer_context(application, salary=salary, joining_date=joining_date)
    body_text = ai_body_text
    if use_ai_body and not body_text:
        job = application.job_opening
        candidate = application.candidate
        body_text = generate_offer_letter_text(
            tenant,
            candidate_name=candidate.display_name,
            role=job.title,
            department=extra.get("recruitment_department", ""),
            salary=salary or extra.get("ctc", ""),
            joining_date=joining_date,
            probation_months=probation_months,
        )

    letter = create_draft_letter(
        tenant,
        employee,
        template,
        actor,
        extra_context=extra,
        job_application=application,
    )
    if use_ai_body and body_text:
        letter.draft_html = offer_text_to_html(body_text)
        letter.save(update_fields=["draft_html", "updated_at"])
    return letter
