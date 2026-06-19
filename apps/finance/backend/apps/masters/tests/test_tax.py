"""Tax-engine tests — India GST split vs GCC VAT. Pure functions, no DB."""
from decimal import Decimal

from apps.masters.tax import (
    SUPPLY_EXEMPT,
    SUPPLY_ZERO_RATED,
    compute_gst,
    compute_vat,
)


# ── GCC VAT ──────────────────────────────────────────────────────────────────

def test_vat_standard_rate():
    b = compute_vat(Decimal("1000"), Decimal("5"))
    assert b.vat == Decimal("50.0000")
    assert b.cgst == b.sgst == b.igst == Decimal("0")
    assert b.total_tax == Decimal("50.0000")
    assert b.grand_total == Decimal("1050.0000")


def test_vat_ksa_fifteen_percent():
    assert compute_vat(Decimal("1000"), Decimal("15")).vat == Decimal("150.0000")


def test_vat_zero_rated_and_exempt_carry_no_tax():
    assert compute_vat(Decimal("1000"), Decimal("5"), supply_type=SUPPLY_ZERO_RATED).vat == Decimal("0.0000")
    assert compute_vat(Decimal("1000"), Decimal("5"), supply_type=SUPPLY_EXEMPT).vat == Decimal("0.0000")


# ── India GST (regression — must be unchanged by the VAT additions) ───────────

def test_gst_intra_state_splits_cgst_sgst():
    b = compute_gst(Decimal("1000"), Decimal("18"), seller_state_code="27", buyer_state_code="27")
    assert b.cgst == Decimal("90.0000")
    assert b.sgst == Decimal("90.0000")
    assert b.igst == Decimal("0")
    assert b.vat == Decimal("0")
    assert b.grand_total == Decimal("1180.0000")


def test_gst_inter_state_uses_igst():
    b = compute_gst(Decimal("1000"), Decimal("18"), seller_state_code="27", buyer_state_code="29")
    assert b.igst == Decimal("180.0000")
    assert b.cgst == b.sgst == Decimal("0")
    assert b.vat == Decimal("0")
