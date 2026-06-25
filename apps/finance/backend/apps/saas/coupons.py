"""Coupon validation and discount application for SaaS checkout."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import NamedTuple

from django.utils import timezone

from .models import CouponCode, CouponRedemption, SaasInvoice


class CouponError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class DiscountResult(NamedTuple):
    coupon: CouponCode
    original_amount: Decimal
    discount_amount: Decimal
    final_amount: Decimal


def _normalize_code(code: str) -> str:
    return (code or "").strip().upper()


def get_coupon(code: str) -> CouponCode | None:
    return CouponCode.objects.filter(code=_normalize_code(code), is_active=True).first()


def validate_coupon(
    coupon: CouponCode,
    *,
    plan_code: str,
    billing_cycle: str,
    tenant,
) -> None:
    today = timezone.now().date()
    if coupon.valid_from and today < coupon.valid_from:
        raise CouponError("This coupon is not active yet.")
    if coupon.valid_until and today > coupon.valid_until:
        raise CouponError("This coupon has expired.")
    if coupon.max_redemptions is not None and coupon.redemptions_used >= coupon.max_redemptions:
        raise CouponError("This coupon has reached its redemption limit.")

    allowed_plans = coupon.applies_to_plans or []
    if allowed_plans and plan_code not in allowed_plans:
        raise CouponError("This coupon does not apply to the selected plan.")

    allowed_cycles = coupon.applies_to_cycles or []
    if allowed_cycles and billing_cycle not in allowed_cycles:
        raise CouponError("This coupon does not apply to the selected billing cycle.")

    if coupon.first_time_only and tenant:
        if CouponRedemption.objects.filter(tenant=tenant).exists():
            raise CouponError("This coupon is for first-time customers only.")
        if SaasInvoice.objects.filter(
            subscription__tenant=tenant, status=SaasInvoice.Status.PAID,
        ).exists():
            raise CouponError("This coupon is for first-time customers only.")


def compute_discount(coupon: CouponCode, amount_inr: Decimal) -> DiscountResult:
    amount = Decimal(str(amount_inr)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    if coupon.discount_type == CouponCode.DiscountType.PERCENT:
        pct = min(Decimal(str(coupon.discount_value)), Decimal("100"))
        discount = (amount * pct / Decimal("100")).quantize(Decimal("0.01"), ROUND_HALF_UP)
    else:
        discount = min(Decimal(str(coupon.discount_value)), amount)
    final = max(amount - discount, Decimal("0")).quantize(Decimal("0.01"), ROUND_HALF_UP)
    return DiscountResult(coupon=coupon, original_amount=amount, discount_amount=discount, final_amount=final)


def apply_coupon(
    code: str,
    *,
    plan_code: str,
    billing_cycle: str,
    amount_inr: Decimal,
    tenant,
) -> DiscountResult:
    coupon = get_coupon(code)
    if not coupon:
        raise CouponError("Invalid or inactive coupon code.")
    validate_coupon(coupon, plan_code=plan_code, billing_cycle=billing_cycle, tenant=tenant)
    return compute_discount(coupon, amount_inr)


def record_redemption(
    coupon: CouponCode,
    *,
    tenant,
    subscription,
    plan_code: str,
    billing_cycle: str,
    original_amount: Decimal,
    discount_amount: Decimal,
    final_amount: Decimal,
    redeemed_by_email: str = "",
    razorpay_order_id: str = "",
    razorpay_payment_id: str = "",
) -> CouponRedemption:
    redemption = CouponRedemption.objects.create(
        coupon=coupon,
        tenant=tenant,
        subscription=subscription,
        plan_code=plan_code,
        billing_cycle=billing_cycle,
        original_amount=original_amount,
        discount_amount=discount_amount,
        final_amount=final_amount,
        redeemed_by_email=redeemed_by_email,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
    )
    CouponCode.objects.filter(pk=coupon.pk).update(redemptions_used=coupon.redemptions_used + 1)
    return redemption
