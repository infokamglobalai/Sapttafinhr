"""Email monthly report PDF pack to HR admins."""
from __future__ import annotations

import logging
from calendar import month_name

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _hr_admins(tenant):
    from apps.accounts.models import User

    return User.objects.filter(
        tenant=tenant,
        is_active=True,
        user_roles__role__name__in=("super_admin", "hr_admin"),
    ).distinct()


def send_monthly_report_pack(tenant, year: int, month: int, *, subject_prefix: str = "") -> int:
    """Build and email ZIP of leave + attendance + payroll PDFs to HR admins."""
    from apps.reports.report_pack import build_monthly_report_pack

    period = f"{month_name[month]} {year}"
    try:
        zip_bytes = build_monthly_report_pack(tenant, year, month)
    except Exception:
        logger.exception("Report pack build failed for %s %s-%s", tenant.subdomain, year, month)
        return 0

    portal = getattr(settings, "HR_PORTAL_URL", "").rstrip("/")
    context = {"tenant": tenant, "period": period, "portal_url": portal}
    html = render_to_string("emails/hr_monthly_report_pack.html", context)
    prefix = subject_prefix or "Monthly HR reports"
    subject = f"[{tenant.name}] {prefix} — {period}"

    sent = 0
    filename = f"hr_reports_{year}_{month:02d}.zip"
    for user in _hr_admins(tenant):
        if not user.email:
            continue
        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=strip_tags(html),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@saptta.local"),
                to=[user.email],
            )
            msg.attach_alternative(html, "text/html")
            msg.attach(filename, zip_bytes, "application/zip")
            msg.send(fail_silently=False)
            sent += 1
        except Exception:
            logger.exception("Monthly report pack email failed for %s", user.email)
    return sent
