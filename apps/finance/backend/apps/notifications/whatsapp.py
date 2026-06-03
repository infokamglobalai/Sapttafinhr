"""WhatsApp notification channel (Twilio / Meta Business API stub).

In dev: prints to logs (no real send).
In production: set WHATSAPP_PROVIDER to 'twilio' or 'meta' and configure credentials.

Usage:
    from apps.notifications.whatsapp import send_whatsapp
    send_whatsapp("+919876543210", "Your invoice INV-001 of ₹5,000 is overdue.")
"""
from __future__ import annotations

import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def send_whatsapp(to: str, message: str, template_name: str | None = None) -> bool:
    """Send a WhatsApp message. Returns True if sent, False if dev/not configured."""
    provider = getattr(settings, "WHATSAPP_PROVIDER", "console")

    if provider == "console":
        logger.info("WhatsApp [console] → %s: %s", to, message[:100])
        return False  # dev mode — not actually sent

    if provider == "twilio":
        return _send_twilio(to, message)

    if provider == "meta":
        return _send_meta(to, message, template_name)

    logger.warning("Unknown WHATSAPP_PROVIDER: %s", provider)
    return False


def _send_twilio(to: str, message: str) -> bool:
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_no = getattr(settings, "TWILIO_WHATSAPP_FROM", "")
    if not all([sid, token, from_no]):
        logger.warning("Twilio WhatsApp not configured (missing SID/token/from)")
        return False
    try:
        from twilio.rest import Client
        client = Client(sid, token)
        client.messages.create(
            body=message,
            from_=f"whatsapp:{from_no}",
            to=f"whatsapp:{to}",
        )
        logger.info("Twilio WhatsApp sent to %s", to)
        return True
    except Exception as e:
        logger.exception("Twilio WhatsApp failed: %s", e)
        return False


def _send_meta(to: str, message: str, template_name: str | None) -> bool:
    token = getattr(settings, "META_WHATSAPP_TOKEN", "")
    phone_id = getattr(settings, "META_WHATSAPP_PHONE_ID", "")
    if not all([token, phone_id]):
        logger.warning("Meta WhatsApp not configured")
        return False
    try:
        import requests
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
        }
        if template_name:
            payload["type"] = "template"
            payload["template"] = {"name": template_name, "language": {"code": "en_IN"}}
        else:
            payload["type"] = "text"
            payload["text"] = {"body": message}

        resp = requests.post(
            f"https://graph.facebook.com/v18.0/{phone_id}/messages",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
            timeout=10,
        )
        resp.raise_for_status()
        logger.info("Meta WhatsApp sent to %s", to)
        return True
    except Exception as e:
        logger.exception("Meta WhatsApp failed: %s", e)
        return False


# ── Notification helpers ────────────────────────────────────────────────

def notify_invoice_overdue(invoice) -> bool:
    phone = getattr(invoice.customer, "phone", "") or ""
    if not phone:
        return False
    balance = invoice.grand_total - invoice.amount_paid
    msg = (f"📢 Payment Reminder from {invoice.company.name}\n"
           f"Invoice: {invoice.invoice_no} | Amount: ₹{balance:,.0f}\n"
           f"Due date was {invoice.due_date}. Please arrange payment. Reply STOP to unsubscribe.")
    return send_whatsapp(phone, msg)


def notify_salary_credited(employee, payslip) -> bool:
    phone = getattr(employee, "personal_phone", "") or ""
    if not phone:
        return False
    msg = (f"✅ Salary Credited\n"
           f"Hi {employee.first_name}, your salary of ₹{payslip.net_pay:,.0f} "
           f"for {payslip.pay_period_start} to {payslip.pay_period_end} has been credited.")
    return send_whatsapp(phone, msg)


def notify_leave_approved(leave_request) -> bool:
    phone = getattr(leave_request.employee, "personal_phone", "") or ""
    if not phone:
        return False
    msg = (f"✅ Leave Approved\n"
           f"Hi {leave_request.employee.first_name}, your {leave_request.leave_type.name} "
           f"from {leave_request.from_date} to {leave_request.to_date} has been approved.")
    return send_whatsapp(phone, msg)
