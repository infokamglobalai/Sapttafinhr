"""WhatsApp delivery for HR notifications (console / Twilio / Meta)."""
from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def send_whatsapp(to: str, message: str, template_name: str | None = None) -> bool:
    provider = getattr(settings, "WHATSAPP_PROVIDER", "console")
    to = (to or "").strip()
    if not to:
        return False

    if provider == "console":
        logger.info("WhatsApp [console] → %s: %s", to, message[:120])
        return False

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
        logger.warning("Twilio WhatsApp not configured")
        return False
    try:
        from twilio.rest import Client

        client = Client(sid, token)
        client.messages.create(
            body=message,
            from_=f"whatsapp:{from_no}",
            to=f"whatsapp:{to}",
        )
        return True
    except Exception:
        logger.exception("Twilio WhatsApp failed")
        return False


def _send_meta(to: str, message: str, template_name: str | None) -> bool:
    token = getattr(settings, "META_WHATSAPP_TOKEN", "")
    phone_id = getattr(settings, "META_WHATSAPP_PHONE_ID", "")
    if not all([token, phone_id]):
        logger.warning("Meta WhatsApp not configured")
        return False
    try:
        import requests

        payload = {"messaging_product": "whatsapp", "to": to}
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
        return True
    except Exception:
        logger.exception("Meta WhatsApp failed")
        return False
