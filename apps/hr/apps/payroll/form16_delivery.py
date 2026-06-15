"""Form 16 issue + email delivery to employees."""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def issue_form16(form16, *, issued_by=None, send_email: bool = True) -> bool:
    """Mark Form 16 as issued, notify employee in-app, optionally email PDF."""
    from apps.hr_ops.services import notify

    if not form16.part_b_pdf:
        return False

    form16.is_issued = True
    form16.issued_at = timezone.now()
    form16.save(update_fields=["is_issued", "issued_at"])

    employee = form16.employee
    user = employee.user
    if user:
        notify(
            user,
            "general",
            f"Form 16 for FY {form16.financial_year} is ready",
            message="Your annual tax certificate (Form 16 Part B) is available. Download from My Form 16 or check your email.",
            action_url="/payroll/my-form16/",
            send_email=False,
        )

    if send_email:
        return _email_form16(employee, form16)
    return True


def issue_all_form16_for_fy(tenant, fy: str) -> tuple[int, int]:
    from apps.payroll.models import Form16

    issued = 0
    failed = 0
    qs = Form16.objects.filter(
        tenant=tenant, financial_year=fy, part_b_pdf__isnull=False,
    ).exclude(part_b_pdf="").select_related("employee")

    for form16 in qs:
        if form16.is_issued:
            continue
        if issue_form16(form16, send_email=True):
            issued += 1
        else:
            failed += 1
    return issued, failed


def _email_form16(employee, form16) -> bool:
    to_email = employee.official_email or employee.personal_email
    if not to_email or not form16.part_b_pdf:
        return False

    tenant = form16.tenant
    portal = getattr(settings, "HR_PORTAL_URL", "").rstrip("/")
    context = {
        "tenant": tenant,
        "employee": employee,
        "fy": form16.financial_year,
        "assessment_year": form16.assessment_year,
        "tds_deducted": form16.tds_deducted,
        "taxable_income": form16.taxable_income,
        "portal_url": portal,
    }
    html = render_to_string("emails/form16_issued.html", context)
    subject = f"Form 16 for FY {form16.financial_year} — {tenant.name}"

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=strip_tags(html),
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@saptta.local"),
            to=[to_email],
        )
        msg.attach_alternative(html, "text/html")
        form16.part_b_pdf.open("rb")
        try:
            msg.attach(
                f"Form16_{employee.employee_code}_{form16.financial_year}.pdf",
                form16.part_b_pdf.read(),
                "application/pdf",
            )
        finally:
            form16.part_b_pdf.close()
        msg.send(fail_silently=False)
        return True
    except Exception:
        logger.exception("Form 16 email failed for employee %s", employee.pk)
        return False
