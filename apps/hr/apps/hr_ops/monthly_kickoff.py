"""1st-of-month payroll kickoff reminders for HR admins."""
from __future__ import annotations

import datetime
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

from apps.hr_ops.services import notify

logger = logging.getLogger(__name__)


def _hr_admins(tenant):
    from apps.accounts.models import User

    return User.objects.filter(
        tenant=tenant,
        is_active=True,
        user_roles__role__name__in=("super_admin", "hr_admin"),
    ).distinct()


def send_monthly_payroll_kickoff(tenant, today: datetime.date | None = None, *, force: bool = False) -> int:
    """
    On the 1st of each month: remind HR to run pre-payroll review for the new month
    and close last month's attendance.
    """
    from apps.payroll.models import PayrollRun

    today = today or timezone.localdate()
    if not force and today.day != 1:
        return 0

    year, month = today.year, today.month

    # Previous month for closing
    if month == 1:
        prev_year, prev_month = year - 1, 12
    else:
        prev_year, prev_month = year, month - 1

    prev_run = PayrollRun.objects.filter(tenant=tenant, year=prev_year, month=prev_month).first()
    prev_status = prev_run.get_status_display() if prev_run else "Not started"

    portal = getattr(settings, "HR_PORTAL_URL", "").rstrip("/")
    period = today.strftime("%B %Y")
    prev_period = datetime.date(prev_year, prev_month, 1).strftime("%B %Y")

    context = {
        "tenant": tenant,
        "period": period,
        "prev_period": prev_period,
        "prev_payroll_status": prev_status,
        "review_url": f"{portal}/payroll/review/?year={prev_year}&month={prev_month}",
        "portal_url": portal,
    }
    html = render_to_string("emails/monthly_payroll_kickoff.html", context)
    subject = f"[{tenant.name}] New month — start payroll for {prev_period}"

    sent = 0
    for user in _hr_admins(tenant):
        notify(
            user,
            "general",
            f"New month — review payroll for {prev_period}",
            message=(
                f"Today is the 1st of {period}. "
                f"Close {prev_period} attendance, run pre-payroll review, and process payroll. "
                f"Last month payroll: {prev_status}."
            ),
            action_url=f"/payroll/review/?year={prev_year}&month={prev_month}",
            send_email=False,
        )
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
            msg.send(fail_silently=False)
            sent += 1
        except Exception:
            logger.exception("Monthly kickoff email failed for %s", user.email)
    return sent
