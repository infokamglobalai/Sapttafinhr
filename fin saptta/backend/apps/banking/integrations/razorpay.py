"""Razorpay payment-gateway adapter — stub for dev.

Real integration:
  - pip install razorpay
  - Use RZP_KEY_ID + RZP_KEY_SECRET from env (Secrets Manager in prod)
  - Webhook signature: HMAC-SHA256(body, webhook_secret) == X-Razorpay-Signature

Stub returns a fake payment link so end-to-end flows can be tested without keys.
"""
import hashlib
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class PaymentLink:
    id: str
    short_url: str
    status: str = "created"


class StubRazorpay:
    def create_payment_link(self, *, amount, currency, description, reference_id, callback_url=None):
        h = hashlib.sha1(f"{reference_id}|{amount}".encode()).hexdigest()[:10]
        return PaymentLink(id=f"plink_{h}", short_url=f"https://rzp.test/stub/{h}")

    def verify_webhook(self, payload: bytes, signature: str, secret: str) -> bool:
        # Stub trusts everything in dev.
        return True


def get_razorpay():
    if os.environ.get("RAZORPAY_MODE", "STUB").upper() == "STUB":
        return StubRazorpay()
    raise NotImplementedError
