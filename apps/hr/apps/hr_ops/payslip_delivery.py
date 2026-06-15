"""Email + WhatsApp delivery when payroll is published."""
from __future__ import annotations

import logging
from calendar import month_name

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from apps.hr_ops.whatsapp import send_whatsapp

logger = logging.getLogger(__name__)


def deliver_payslips_for_run(payroll_run) -> dict:
    """Send payslip PDF by email and WhatsApp summary for each published payslip."""
    from apps.payroll.models import Payslip

    tenant = payroll_run.tenant
    period = f"{month_name[payroll_run.month]} {payroll_run.year}"
    sent_email = 0
    sent_whatsapp = 0
    skipped = 0

    payslips = (
        Payslip.objects.filter(
            payroll_record__payroll_run=payroll_run,
            is_published=True,
            pdf__isnull=False,
        )
        .exclude(pdf="")
        .select_related("employee", "payroll_record")
    )

    for slip in payslips:
        employee = slip.employee
        record = slip.payroll_record
        net_pay = record.net_payable

        if _send_payslip_email(employee, slip, period, net_pay, tenant):
            sent_email += 1

        if _send_payslip_whatsapp(employee, slip, period, net_pay, tenant):
            sent_whatsapp += 1

        if not employee.personal_email and not employee.official_email and not employee.phone_primary:
            skipped += 1

    return {
        "period": period,
        "sent_email": sent_email,
        "sent_whatsapp": sent_whatsapp,
        "skipped": skipped,
        "total": payslips.count(),
    }


def _send_payslip_email(employee, payslip, period: str, net_pay, tenant) -> bool:
    to_email = employee.official_email or employee.personal_email
    if not to_email:
        return False

    record = payslip.payroll_record
    portal = getattr(settings, "HR_PORTAL_URL", "").rstrip("/")
    context = {
        "tenant": tenant,
        "period": period,
        "first_name": employee.first_name,
        "employee_code": employee.employee_code,
        "net_pay": net_pay,
        "gross": record.gross_earnings,
        "deductions": record.total_deductions,
        "portal_url": portal,
    }
    html = render_to_string("emails/payslip_published.html", context)
    subject = f"Your salary for {period} — {tenant.name}"

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=strip_tags(html),
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@saptta.local"),
            to=[to_email],
        )
        msg.attach_alternative(html, "text/html")
        payslip.pdf.open("rb")
        try:
            msg.attach(
                f"payslip_{employee.employee_code}_{payslip.year}_{payslip.month:02d}.pdf",
                payslip.pdf.read(),
                "application/pdf",
            )
        finally:
            payslip.pdf.close()
        msg.send(fail_silently=False)
        return True
    except Exception:
        logger.exception("Payslip email failed for employee %s", employee.pk)
        return False


def _send_payslip_whatsapp(employee, payslip, period: str, net_pay, tenant) -> bool:
    phone = employee.phone_primary or employee.phone_alternate
    if not phone:
        return False

    portal = getattr(settings, "HR_PORTAL_URL", "").rstrip("/")
    portal_line = f"\n\nView payslip: {portal}/payroll/my-payslips/" if portal else ""

    message = (
        f"*{tenant.name}* — Salary credited\n"
        f"Hi {employee.first_name}, your net pay for *{period}* is *₹{net_pay:,.2f}*.\n"
        f"Your payslip PDF has been sent to your email.{portal_line}"
    )
    return send_whatsapp(phone, message, template_name="payslip_published")
