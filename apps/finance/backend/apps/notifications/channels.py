"""Notification channels — email (Django built-in), WhatsApp & SMS with live API integrations."""
import os
import requests
from django.conf import settings
from django.core.mail import send_mail
from twilio.rest import Client

from .models import OutboundMessage


def send_email(to: str, subject: str, body: str, *, from_email: str = "") -> OutboundMessage:
    from_email = from_email or settings.DEFAULT_FROM_EMAIL
    msg = OutboundMessage.objects.create(
        channel=OutboundMessage.Channel.EMAIL, to=to,
        subject=subject, body=body, status=OutboundMessage.Status.QUEUED,
    )
    try:
        from django.core.mail import get_connection, EmailMessage
        from .models import SMTPSettings

        smtp = SMTPSettings.objects.filter(is_active=True).first()
        if smtp:
            connection = get_connection(
                backend="django.core.mail.backends.smtp.EmailBackend",
                host=smtp.host,
                port=smtp.port,
                username=smtp.username,
                password=smtp.password,
                use_tls=smtp.use_tls,
                use_ssl=smtp.use_ssl,
            )
            final_from_email = smtp.from_email or from_email
            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=final_from_email,
                to=[to],
                connection=connection,
            )
            email.send(fail_silently=False)
        else:
            send_mail(subject, body, from_email, [to], fail_silently=False)
        msg.status = OutboundMessage.Status.SENT
    except Exception as e:
        msg.status = OutboundMessage.Status.FAILED
        msg.error = str(e)[:255]
    msg.save(update_fields=["status", "error", "updated_at"])
    return msg


def send_whatsapp(to: str, body: str, *, template: str = "") -> OutboundMessage:
    """Real WhatsApp sending using configured WhatsApp provider (Meta or Twilio)."""
    msg = OutboundMessage.objects.create(
        channel=OutboundMessage.Channel.WHATSAPP, to=to, body=body,
        status=OutboundMessage.Status.QUEUED,
    )
    provider = getattr(settings, "WHATSAPP_PROVIDER", "meta").lower()

    if provider == "twilio":
        sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        from_no = getattr(settings, "TWILIO_WHATSAPP_FROM", "")
        if not all([sid, token, from_no]):
            msg.status = OutboundMessage.Status.FAILED
            msg.error = "Twilio WhatsApp credentials not configured"
            msg.save(update_fields=["status", "error", "updated_at"])
            return msg
        try:
            client = Client(sid, token)
            res = client.messages.create(
                body=body,
                from_=f"whatsapp:{from_no}",
                to=f"whatsapp:{to}",
            )
            msg.status = OutboundMessage.Status.SENT
            msg.provider_id = res.sid
        except Exception as e:
            msg.status = OutboundMessage.Status.FAILED
            msg.error = str(e)[:255]

    elif provider == "meta":
        token = getattr(settings, "META_WHATSAPP_TOKEN", "")
        phone_id = getattr(settings, "META_WHATSAPP_PHONE_ID", "")
        if not all([token, phone_id]):
            msg.status = OutboundMessage.Status.FAILED
            msg.error = "Meta WhatsApp credentials not configured"
            msg.save(update_fields=["status", "error", "updated_at"])
            return msg
        try:
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
            }
            if template:
                payload["type"] = "template"
                payload["template"] = {"name": template, "language": {"code": "en_IN"}}
            else:
                payload["type"] = "text"
                payload["text"] = {"body": body}

            resp = requests.post(
                f"https://graph.facebook.com/v18.0/{phone_id}/messages",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=payload,
                timeout=10,
            )
            resp.raise_for_status()
            res_data = resp.json()
            msg.status = OutboundMessage.Status.SENT
            msg.provider_id = res_data.get("messages", [{}])[0].get("id", f"meta.{msg.id}")
        except Exception as e:
            msg.status = OutboundMessage.Status.FAILED
            msg.error = str(e)[:255]
    else:
        msg.status = OutboundMessage.Status.FAILED
        msg.error = f"Unsupported WhatsApp provider: {provider}"

    msg.save(update_fields=["status", "provider_id", "error", "updated_at"])
    return msg


def send_sms(to: str, body: str) -> OutboundMessage:
    """Real SMS sending using Twilio client."""
    msg = OutboundMessage.objects.create(
        channel=OutboundMessage.Channel.SMS, to=to, body=body,
        status=OutboundMessage.Status.QUEUED,
    )
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_no = getattr(settings, "TWILIO_SMS_FROM", "")
    if not all([sid, token, from_no]):
        msg.status = OutboundMessage.Status.FAILED
        msg.error = "Twilio SMS credentials not configured"
        msg.save(update_fields=["status", "error", "updated_at"])
        return msg
    try:
        client = Client(sid, token)
        res = client.messages.create(
            body=body,
            from_=from_no,
            to=to,
        )
        msg.status = OutboundMessage.Status.SENT
        msg.provider_id = res.sid
    except Exception as e:
        msg.status = OutboundMessage.Status.FAILED
        msg.error = str(e)[:255]
    msg.save(update_fields=["status", "provider_id", "error", "updated_at"])
    return msg
