"""Inbound payment-webhook replay guard (idempotency).

A validly-signed event can be re-delivered by the gateway; the view must process
it once and treat re-deliveries as no-ops so a captured payment can't be replayed
to repeatedly drive the subscription state machine.
"""
import hashlib
import hmac
import json

import pytest
from django.test import override_settings
from rest_framework.test import APIRequestFactory

from apps.saas import billing
from apps.saas.billing import WebhookView

SECRET = "whsec_test_123"


def _sign(body: bytes) -> str:
    return hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()


@pytest.mark.django_db
@override_settings(RAZORPAY_WEBHOOK_SECRET=SECRET)
def test_duplicate_webhook_is_deduped(monkeypatch):
    calls = []
    monkeypatch.setattr(
        billing, "activate_subscription_for_tenant",
        lambda schema_name, **kw: calls.append(schema_name) or True,
    )

    body = json.dumps({
        "event": "payment.captured",
        "payload": {"payment": {"entity": {"notes": {"schema": "acme"}}}},
    }).encode()
    headers = {
        "HTTP_X_RAZORPAY_SIGNATURE": _sign(body),
        "HTTP_X_RAZORPAY_EVENT_ID": "evt_dedupe_1",
    }
    factory = APIRequestFactory()
    view = WebhookView.as_view()

    resp1 = view(factory.post("/saas/billing/webhook/", data=body, content_type="application/json", **headers))
    resp2 = view(factory.post("/saas/billing/webhook/", data=body, content_type="application/json", **headers))

    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp2.data.get("duplicate") is True
    # Activation ran exactly once despite two identical deliveries.
    assert calls == ["acme"]


@pytest.mark.django_db
@override_settings(RAZORPAY_WEBHOOK_SECRET=SECRET)
def test_bad_signature_still_rejected(monkeypatch):
    monkeypatch.setattr(billing, "activate_subscription_for_tenant", lambda *a, **k: True)
    body = b'{"event":"payment.captured"}'
    factory = APIRequestFactory()
    view = WebhookView.as_view()
    resp = view(factory.post(
        "/saas/billing/webhook/", data=body, content_type="application/json",
        HTTP_X_RAZORPAY_SIGNATURE="deadbeef", HTTP_X_RAZORPAY_EVENT_ID="evt_bad",
    ))
    assert resp.status_code == 400
