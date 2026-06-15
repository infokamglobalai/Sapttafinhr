"""Email HR admins when monthly payroll is published."""

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





def notify_hr_payroll_published(payroll_run, *, payslip_count: int) -> int:

    """Send monthly payroll summary email + report pack ZIP to HR admins."""

    from apps.reports.report_pack import build_monthly_report_pack



    tenant = payroll_run.tenant

    period = f"{month_name[payroll_run.month]} {payroll_run.year}"

    portal = getattr(settings, "HR_PORTAL_URL", "").rstrip("/")



    hr_users = _hr_admins(tenant)

    if not hr_users.exists():

        return 0



    context = {

        "tenant": tenant,

        "period": period,

        "employee_count": payroll_run.total_employees,

        "total_gross": payroll_run.total_gross,

        "total_net": payroll_run.total_net,

        "payslip_count": payslip_count,

        "run_id": payroll_run.pk,

        "portal_url": portal,

    }

    html = render_to_string("emails/hr_monthly_payroll_report.html", context)

    subject = f"[{tenant.name}] Payroll published — {period}"



    zip_bytes = None

    try:

        zip_bytes = build_monthly_report_pack(tenant, payroll_run.year, payroll_run.month)

    except Exception:

        logger.exception("Report pack attach failed for payroll publish")



    sent = 0

    zip_name = f"hr_reports_{payroll_run.year}_{payroll_run.month:02d}.zip"

    for user in hr_users:

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

            if zip_bytes:

                msg.attach(zip_name, zip_bytes, "application/zip")

            msg.send(fail_silently=False)

            sent += 1

        except Exception:

            logger.exception("HR payroll report email failed for %s", user.email)

    return sent

