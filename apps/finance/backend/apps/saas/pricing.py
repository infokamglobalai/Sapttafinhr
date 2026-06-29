"""Saptta SaaS pricing — mirrors apps/web/src/types/index.ts (ex-GST INR)."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

INCLUDED_EMPLOYEES = 30
EXTRA_EMPLOYEE_PRICE = Decimal("111")

HRMS_PRICE = Decimal("4999")
FINANCE_PRICE = Decimal("4999")
COMPLETE_PRICE = Decimal("7999")

GST_RATE_PERCENT = Decimal("18")

# Discount applied when billing annually instead of monthly (mirrors web ANNUAL_DISCOUNT_RATE).
ANNUAL_DISCOUNT_RATE = Decimal("0.20")

HR_PLANS = frozenset({"hrms", "saptta-hrms", "saptta-complete", "complete"})
COMPLETE_PLANS = frozenset({"saptta-complete", "complete"})


def _money(amount) -> Decimal:
    return Decimal(str(amount)).quantize(Decimal("0.01"), ROUND_HALF_UP)


def annual_from_monthly(monthly) -> Decimal:
    """Annual (ex-GST) total for a monthly rate, with the annual discount applied.

    Rounded to whole rupees to match the web `annualFromMonthly` (Math.round).
    """
    m = _money(monthly)
    return (m * 12 * (Decimal("1") - ANNUAL_DISCOUNT_RATE)).quantize(Decimal("1"), ROUND_HALF_UP)


def gst_on_excluding(amount_ex: Decimal) -> Decimal:
    """18% GST on an ex-GST taxable value."""
    ex = _money(amount_ex)
    return (ex * GST_RATE_PERCENT / Decimal("100")).quantize(Decimal("0.01"), ROUND_HALF_UP)


def with_gst(amount_ex: Decimal) -> Decimal:
    """Ex-GST plan price + 18% GST (amount charged at Razorpay checkout)."""
    ex = _money(amount_ex)
    return (ex + gst_on_excluding(ex)).quantize(Decimal("0.01"), ROUND_HALF_UP)


def split_gst_inclusive(
    gross: Decimal,
    *,
    place_of_supply: str = "",
    vendor_state: str = "27",
) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal]:
    """Back out taxable + CGST/SGST or IGST from a GST-inclusive total."""
    rate = GST_RATE_PERCENT
    g = _money(gross)
    taxable = (g / (Decimal("1") + rate / Decimal("100"))).quantize(Decimal("0.01"), ROUND_HALF_UP)
    tax = (g - taxable).quantize(Decimal("0.01"), ROUND_HALF_UP)
    pos = (place_of_supply or "").strip()
    intra = bool(pos) and pos == vendor_state
    cgst = sgst = igst = Decimal("0")
    if not pos or intra:
        cgst = (tax / 2).quantize(Decimal("0.01"), ROUND_HALF_UP)
        sgst = tax - cgst
    else:
        igst = tax
    return taxable, tax, cgst, sgst, igst


def plan_monthly_inr(plan_code: str, employees: int = INCLUDED_EMPLOYEES) -> Decimal:
    code = (plan_code or "").strip().lower()
    if code in COMPLETE_PLANS or code == "saptta-complete":
        base = COMPLETE_PRICE
    elif code in {"finance", "saptta-finance"}:
        base = FINANCE_PRICE
    else:
        base = HRMS_PRICE

    extra = max(0, int(employees) - INCLUDED_EMPLOYEES)
    if code in {"finance", "saptta-finance"}:
        extra = 0
    return base + (EXTRA_EMPLOYEE_PRICE * extra)


def max_employees_for_plan(plan_code: str, employees: int | None = None) -> int:
    """Paid headcount cap pushed to HR — finance-only plans leave HR at default."""
    code = (plan_code or "").strip().lower()
    if code in {"finance", "saptta-finance"}:
        return INCLUDED_EMPLOYEES
    headcount = int(employees or INCLUDED_EMPLOYEES)
    return max(headcount, INCLUDED_EMPLOYEES)
