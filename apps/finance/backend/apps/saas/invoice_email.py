"""Email SaaS subscription invoices after successful payment."""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .invoice_docs import render_invoice_html, render_invoice_pdf

logger = logging.getLogger(__name__)


def _recipient_for_invoice(invoice) -> str:
    tenant = invoice.subscription.tenant
    email = (tenant.billing_email or "").strip()
    if email:
        return email
    return ""


def send_subscription_invoice_email(invoice) -> bool:
    """Send GST invoice HTML + PDF attachment to the tenant billing contact."""
    to = _recipient_for_invoice(invoice)
    if not to:
        logger.info("No billing email for invoice %s — skip email", invoice.number)
        return False

    subject = f"Your Saptta invoice {invoice.number}"
    html = render_invoice_html(invoice)
    plain = (
        f"Thank you for your payment.\n\n"
        f"Invoice: {invoice.number}\n"
        f"Amount: ₹{invoice.amount}\n"
        f"Period: {invoice.period_start} to {invoice.period_end}\n"
    )
    msg = EmailMultiAlternatives(
        subject,
        plain,
        settings.DEFAULT_FROM_EMAIL,
        [to],
    )
    msg.attach_alternative(html, "text/html")
    pdf = render_invoice_pdf(invoice)
    if pdf[:4] == b"%PDF":
        msg.attach(f"{invoice.number}.pdf", pdf, "application/pdf")
    msg.send(fail_silently=False)
    logger.info("Sent SaaS invoice email %s to %s", invoice.number, to)
    return True
