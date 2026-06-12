"""Razorpay payment-gateway adapter.

Real integration:
  - Uses RZP_KEY_ID + RZP_KEY_SECRET from settings
  - Webhook signature: HMAC-SHA256(body, webhook_secret) == X-Razorpay-Signature
"""
import razorpay
from dataclasses import dataclass
from django.conf import settings
from rest_framework.exceptions import ValidationError

@dataclass(frozen=True)
class PaymentLink:
    id: str
    short_url: str
    status: str = "created"

class RealRazorpay:
    def __init__(self, key_id: str, key_secret: str):
        self.key_id = key_id
        self.key_secret = key_secret

    def create_payment_link(self, *, amount: int, currency: str, description: str, reference_id: str, callback_url: str = None) -> PaymentLink:
        try:
            client = razorpay.Client(auth=(self.key_id, self.key_secret))
            payload = {
                "amount": amount,
                "currency": currency,
                "description": description,
                "reference_id": reference_id,
            }
            if callback_url:
                payload["callback_url"] = callback_url
                payload["callback_method"] = "get"
            
            res = client.payment_link.create(payload)
            return PaymentLink(
                id=res["id"],
                short_url=res["short_url"],
                status=res.get("status", "created")
            )
        except Exception as e:
            raise ValidationError(f"Razorpay Payment Link Creation Failed: {str(e)}")

    def verify_webhook(self, payload: bytes, signature: str, secret: str) -> bool:
        client = razorpay.Client(auth=(self.key_id, self.key_secret))
        try:
            payload_str = payload.decode("utf-8") if isinstance(payload, bytes) else payload
            client.utility.verify_webhook_signature(payload_str, signature, secret)
            return True
        except Exception:
            return False

def get_razorpay():
    key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        raise ValueError("Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured in settings.")
    return RealRazorpay(key_id, key_secret)
