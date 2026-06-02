"""Notification channels — email (Django built-in), WhatsApp & SMS as stubs."""
import os

from django.conf import settings
from django.core.mail import send_mail

from .models import OutboundMessage


def send_email(to: str, subject: str, body: str, *, from_email: str = "") -> OutboundMessage:
    from_email = from_email or settings.DEFAULT_FROM_EMAIL
    msg = OutboundMessage.objects.create(
        channel=OutboundMessage.Channel.EMAIL, to=to,
        subject=subject, body=body, status=OutboundMessage.Status.QUEUED,
    )
    try:
        send_mail(subject, body, from_email, [to], fail_silently=False)
        msg.status = OutboundMessage.Status.SENT
    except Exception as e:
        msg.status = OutboundMessage.Status.FAILED
        msg.error = str(e)[:255]
    msg.save(update_fields=["status", "error", "updated_at"])
    return msg


def send_whatsapp(to: str, body: str, *, template: str = "") -> OutboundMessage:
    """Stub — real impl uses WhatsApp Business Cloud API.
    Requires WHATSAPP_PHONE_ID + WHATSAPP_TOKEN."""
    msg = OutboundMessage.objects.create(
        channel=OutboundMessage.Channel.WHATSAPP, to=to, body=body,
        status=OutboundMessage.Status.QUEUED,
    )
    if os.environ.get("WHATSAPP_MODE", "STUB").upper() == "STUB":
        # Pretend it went out.
        msg.status = OutboundMessage.Status.SENT
        msg.provider_id = f"wamid.STUB.{msg.id}"
        msg.save(update_fields=["status", "provider_id", "updated_at"])
        return msg
    raise NotImplementedError("Real WhatsApp Cloud client not configured")


def send_sms(to: str, body: str) -> OutboundMessage:
    msg = OutboundMessage.objects.create(
        channel=OutboundMessage.Channel.SMS, to=to, body=body,
        status=OutboundMessage.Status.SENT, provider_id=f"sms.STUB",
    )
    return msg
