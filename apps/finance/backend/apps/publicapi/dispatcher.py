"""Webhook dispatcher — fire events to subscribers."""
import hashlib
import hmac
import json

import requests
from celery import shared_task

from .models import WebhookDelivery, WebhookSubscription


def fire(event: str, company_id: int, payload: dict) -> None:
    """Synchronous fanout (small payloads). For high-volume, switch to Celery task."""
    subs = WebhookSubscription.objects.filter(company_id=company_id, is_active=True)
    for sub in subs:
        if event not in sub.events.split(","):
            continue
        deliver_webhook.delay(sub.id, event, payload)


@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def deliver_webhook(self, subscription_id: int, event: str, payload: dict):
    try:
        sub = WebhookSubscription.objects.get(pk=subscription_id, is_active=True)
    except WebhookSubscription.DoesNotExist:
        return

    body = json.dumps({"event": event, "data": payload}, default=str).encode()
    signature = hmac.new(sub.secret.encode(), body, hashlib.sha256).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-FinSaptta-Event": event,
        "X-FinSaptta-Signature": signature,
    }
    delivery = WebhookDelivery.objects.create(
        subscription=sub, event=event, payload=payload,
    )

    # SSRF guard: a subscriber URL pointing at an internal/metadata address must
    # never be fetched. Fail the delivery without retrying (retry can't help).
    from apps.core.net import UnsafeURLError, validate_outbound_url
    try:
        validate_outbound_url(sub.url)
    except UnsafeURLError as exc:
        delivery.error = f"blocked unsafe URL: {exc}"[:255]
        delivery.save(update_fields=["error"])
        return

    try:
        r = requests.post(sub.url, data=body, headers=headers, timeout=10)
        delivery.response_status = r.status_code
        delivery.response_body = r.text[:5000]
        delivery.success = 200 <= r.status_code < 300
        delivery.save(update_fields=["response_status", "response_body", "success"])
        if not delivery.success:
            raise self.retry(countdown=60 * (2 ** self.request.retries))
    except Exception as e:
        delivery.error = str(e)[:255]
        delivery.save(update_fields=["error"])
        raise self.retry(exc=e)
