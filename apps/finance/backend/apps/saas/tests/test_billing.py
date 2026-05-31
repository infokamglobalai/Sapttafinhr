"""Tests for billing webhook security (the security-critical path).

Runs without any gateway credentials — exercises HMAC signature verification.
The subscription activation state machine is verified live (expired trial ->
PAST_DUE -> tenant API 403 -> reactivate -> 200); a DB test for it needs the
django-tenants shared-schema test harness, so it's covered by the live check.
"""
import hashlib
import hmac

from apps.saas.billing import verify_webhook_signature

SECRET = "whsec_test_123"


def _sign(body: bytes, secret: str = SECRET) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


class TestVerifyWebhookSignature:
    def test_valid_signature_accepted(self):
        body = b'{"event":"payment.captured"}'
        assert verify_webhook_signature(body, _sign(body), SECRET) is True

    def test_tampered_body_rejected(self):
        body = b'{"event":"payment.captured"}'
        sig = _sign(body)
        tampered = b'{"event":"payment.captured","amount":1}'
        assert verify_webhook_signature(tampered, sig, SECRET) is False

    def test_wrong_secret_rejected(self):
        body = b'{"event":"x"}'
        assert verify_webhook_signature(body, _sign(body, "other"), SECRET) is False

    def test_empty_signature_or_secret_rejected(self):
        body = b"{}"
        assert verify_webhook_signature(body, "", SECRET) is False
        assert verify_webhook_signature(body, _sign(body), "") is False
