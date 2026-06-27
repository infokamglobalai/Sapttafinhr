"""Letter lifecycle — draft, approval, issue, email, revisions."""
from __future__ import annotations

import datetime
import logging

from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

from apps.employees.models import EmployeeDocument

from .letter_render import render_letter_pdf, render_template_html
from .models import HRLetter, LetterTemplate
from .services import audit_log

logger = logging.getLogger(__name__)

LETTER_DOC_TYPE_MAP = {
    "offer": "offer_letter",
    "intent": "intent_letter",
    "appointment": "appointment",
    "experience": "experience",
    "relieving": "relieving",
    "promotion": "promotion",
    "increment": "increment",
    "warning": "warning",
    "confirmation": "confirmation",
    "termination": "termination",
    "internship": "internship",
    "noc": "noc",
    "certificate": "certificate",
}


def _next_reference(tenant, letter_type: str, employee) -> str:
    from .letter_company import get_company_profile

    profile = get_company_profile(tenant)
    prefix = profile.ref_prefix or "HR"
    code = (letter_type or "LTR")[:3].upper()
    return f"{prefix}/{code}/{employee.employee_code}/v{datetime.date.today():%Y%m%d}"


def _log(tenant, actor, action, letter, summary, details=None, ip=None):
    audit_log(
        tenant, actor, action, "HRLetter", letter, summary,
        details=details, ip_address=ip,
    )


def create_draft_letter(
    tenant,
    employee,
    template: LetterTemplate,
    created_by,
    extra_context: dict | None = None,
    *,
    parent=None,
    version: int = 1,
    job_application=None,
) -> HRLetter:
    html = render_template_html(tenant, employee, template, extra_context)
    letter = HRLetter.objects.create(
        tenant=tenant,
        employee=employee,
        template=template,
        letter_type=template.letter_type,
        status="draft",
        draft_html=html,
        extra_context=extra_context or {},
        reference_number=_next_reference(tenant, template.letter_type, employee),
        version=version,
        parent=parent,
        generated_by=created_by,
        job_application=job_application,
    )
    _log(tenant, created_by, "create", letter, f"Draft {template.get_letter_type_display()} for {employee.full_name}")
    return letter


def save_draft(letter: HRLetter, draft_html: str, actor, *, ip=None) -> HRLetter:
    if not letter.is_editable:
        raise ValueError("Issued letters cannot be edited. Create a revision instead.")
    letter.draft_html = draft_html
    letter.save(update_fields=["draft_html", "updated_at"])
    _log(letter.tenant, actor, "update", letter, "Draft content updated", ip=ip)
    return letter


def submit_for_approval(letter: HRLetter, actor, *, ip=None) -> HRLetter:
    if letter.status not in ("draft", "rejected"):
        raise ValueError("Only draft or rejected letters can be submitted.")
    letter.status = "pending_approval"
    letter.submitted_at = timezone.now()
    letter.rejection_reason = ""
    letter.rejected_by = None
    letter.rejected_at = None
    letter.save(update_fields=[
        "status", "submitted_at", "rejection_reason", "rejected_by", "rejected_at", "updated_at",
    ])
    _log(letter.tenant, actor, "submit", letter, "Submitted for approval", ip=ip)
    return letter


def approve_letter(letter: HRLetter, actor, *, ip=None) -> HRLetter:
    if letter.status != "pending_approval":
        raise ValueError("Letter is not pending approval.")
    if letter.generated_by_id and actor.pk == letter.generated_by_id and not getattr(actor, "is_hr_admin", False):
        raise ValueError(
            "You cannot approve a letter you created. Ask another approver (e.g. HR head or workspace owner)."
        )
    letter.status = "approved"
    letter.approved_by = actor
    letter.approved_at = timezone.now()
    letter.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
    _log(letter.tenant, actor, "approve", letter, "Letter approved", ip=ip)
    return letter


def reject_letter(letter: HRLetter, actor, reason: str = "", *, ip=None) -> HRLetter:
    if letter.status != "pending_approval":
        raise ValueError("Letter is not pending approval.")
    letter.status = "rejected"
    letter.rejected_by = actor
    letter.rejected_at = timezone.now()
    letter.rejection_reason = (reason or "").strip()
    letter.save(update_fields=[
        "status", "rejected_by", "rejected_at", "rejection_reason", "updated_at",
    ])
    _log(letter.tenant, actor, "reject", letter, "Letter rejected", {"reason": reason}, ip=ip)
    return letter


def _archive_to_employee_documents(letter: HRLetter, actor) -> EmployeeDocument:
    doc_type = LETTER_DOC_TYPE_MAP.get(letter.letter_type, "other")
    label = dict(LetterTemplate.LETTER_TYPES).get(letter.letter_type, letter.letter_type.title())
    doc = EmployeeDocument(
        tenant=letter.tenant,
        employee=letter.employee,
        document_type=doc_type,
        document_name=f"{label} — {letter.reference_number or letter.pk}",
        uploaded_by=actor,
        is_verified=True,
        verified_by=actor,
    )
    if letter.pdf:
        letter.pdf.open("rb")
        content = letter.pdf.read()
        letter.pdf.close()
        filename = letter.pdf.name.split("/")[-1]
        doc.file.save(filename, ContentFile(content), save=False)
        doc.file_size_bytes = len(content)
        doc.mime_type = "application/pdf"
    doc.save()
    letter.employee_document = doc
    letter.save(update_fields=["employee_document", "updated_at"])
    return doc


def issue_letter(letter: HRLetter, actor, *, ip=None, skip_approval_check: bool = False) -> HRLetter:
    if letter.status == "issued":
        return letter
    if letter.status == "draft" and not skip_approval_check:
        tpl = letter.template
        if tpl and tpl.requires_approval:
            raise ValueError("This letter type requires approval before issuing.")
    if letter.status == "pending_approval":
        raise ValueError("Approve the letter before issuing.")
    if letter.status == "rejected":
        raise ValueError("Rejected letters cannot be issued. Edit and resubmit.")

    pdf_bytes = render_letter_pdf(letter)
    filename = f"{letter.letter_type}_{letter.employee.employee_code}_v{letter.version}.pdf"
    letter.pdf.save(filename, ContentFile(pdf_bytes), save=False)
    letter.status = "issued"
    letter.issued_at = timezone.now()
    letter.is_shared = True
    letter.shared_at = timezone.now()
    letter.save(update_fields=["pdf", "status", "issued_at", "is_shared", "shared_at", "updated_at"])
    if letter.parent_id:
        HRLetter.objects.filter(pk=letter.parent_id, status="issued").update(status="superseded")
    _archive_to_employee_documents(letter, actor)
    _log(letter.tenant, actor, "issue", letter, "Letter issued and archived to employee documents", ip=ip)
    return letter


def duplicate_letter(letter: HRLetter, actor, *, ip=None) -> HRLetter:
    new_letter = HRLetter.objects.create(
        tenant=letter.tenant,
        employee=letter.employee,
        template=letter.template,
        letter_type=letter.letter_type,
        status="draft",
        draft_html=letter.draft_html,
        extra_context=dict(letter.extra_context or {}),
        reference_number=_next_reference(letter.tenant, letter.letter_type, letter.employee),
        version=1,
        generated_by=actor,
    )
    _log(letter.tenant, actor, "duplicate", new_letter, f"Duplicated from letter #{letter.pk}", ip=ip)
    return new_letter


def create_revision(letter: HRLetter, actor, *, ip=None) -> HRLetter:
    if letter.status != "issued":
        raise ValueError("Only issued letters can be revised.")
    next_version = (
        HRLetter.objects.filter(tenant=letter.tenant, parent=letter.parent or letter)
        .order_by("-version")
        .values_list("version", flat=True)
        .first()
        or letter.version
    ) + 1
    revision = create_draft_letter(
        letter.tenant,
        letter.employee,
        letter.template,
        actor,
        extra_context=letter.extra_context,
        parent=letter.parent or letter,
        version=next_version,
    )
    revision.draft_html = letter.draft_html
    revision.save(update_fields=["draft_html", "updated_at"])
    _log(letter.tenant, actor, "regenerate", revision, f"Revision v{next_version} from letter #{letter.pk}", ip=ip)
    return revision


def email_letter(letter: HRLetter, actor, *, ip=None) -> bool:
    if letter.status != "issued" or not letter.pdf:
        raise ValueError("Issue the letter before emailing.")
    employee = letter.employee
    to_email = employee.official_email or employee.personal_email
    if not to_email:
        return False

    label = dict(LetterTemplate.LETTER_TYPES).get(letter.letter_type, "HR Letter")
    tenant = letter.tenant
    context = {
        "tenant": tenant,
        "employee": employee,
        "letter_type": label,
        "reference_number": letter.reference_number,
    }
    html = render_to_string("emails/hr_letter_issued.html", context)
    subject = f"{label} — {tenant.name}"

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=strip_tags(html),
            from_email=None,
            to=[to_email],
        )
        email.attach_alternative(html, "text/html")
        letter.pdf.open("rb")
        email.attach(
            letter.pdf.name.split("/")[-1],
            letter.pdf.read(),
            "application/pdf",
        )
        letter.pdf.close()
        email.send(fail_silently=False)
        letter.emailed_at = timezone.now()
        letter.save(update_fields=["emailed_at", "updated_at"])
        _log(letter.tenant, actor, "email", letter, f"Emailed to {to_email}", ip=ip)
        return True
    except Exception as exc:
        logger.warning("Letter email failed for %s: %s", letter.pk, exc)
        return False


def soft_delete_letter(letter: HRLetter, actor, *, ip=None) -> None:
    if letter.status == "issued":
        raise ValueError("Issued letters cannot be deleted. Create a revision if needed.")
    letter.is_deleted = True
    letter.save(update_fields=["is_deleted", "updated_at"])
    _log(letter.tenant, actor, "delete", letter, "Draft letter deleted", ip=ip)


def issue_or_submit(letter: HRLetter, actor, *, ip=None) -> HRLetter:
    """Submit for approval or issue directly based on template settings."""
    tpl = letter.template
    if tpl and tpl.requires_approval:
        return submit_for_approval(letter, actor, ip=ip)
    return issue_letter(letter, actor, ip=ip, skip_approval_check=True)
