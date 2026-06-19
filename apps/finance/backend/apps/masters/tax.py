"""Indirect-tax engine — India GST and GCC VAT.

India GST rule (place-of-supply):
  - Seller state == Buyer state  → CGST + SGST (each half of tax rate)
  - Seller state != Buyer state  → IGST (full tax rate)

GCC VAT rule:
  - Single tax line at the standard rate; zero-rated / exempt supplies carry 0.

This module is intentionally tiny and pure — it does not know about Invoice,
Account or Company models. Callers pass plain numbers and pick the function
matching the company's tax regime.
"""
from dataclasses import dataclass
from decimal import Decimal

from apps.core.money import to_money

# VAT supply types (GCC).
SUPPLY_STANDARD = "STANDARD"
SUPPLY_ZERO_RATED = "ZERO_RATED"
SUPPLY_EXEMPT = "EXEMPT"

SUPPLY_TYPE_CHOICES = [
    (SUPPLY_STANDARD, "Standard-rated"),
    (SUPPLY_ZERO_RATED, "Zero-rated"),
    (SUPPLY_EXEMPT, "Exempt"),
]


@dataclass(frozen=True)
class TaxBreakup:
    taxable: Decimal
    cgst: Decimal
    sgst: Decimal
    igst: Decimal
    vat: Decimal = Decimal("0")  # GCC VAT (mutually exclusive with the GST split)

    @property
    def total_tax(self) -> Decimal:
        return self.cgst + self.sgst + self.igst + self.vat

    @property
    def grand_total(self) -> Decimal:
        return self.taxable + self.total_tax


def compute_gst(
    taxable_amount,
    rate_percent,
    *,
    seller_state_code: str,
    buyer_state_code: str,
) -> TaxBreakup:
    """Split a taxable amount into CGST/SGST or IGST based on place of supply."""
    taxable = to_money(taxable_amount)
    rate = to_money(rate_percent)
    tax = (taxable * rate / Decimal("100")).quantize(Decimal("0.0001"))

    if seller_state_code and buyer_state_code and seller_state_code == buyer_state_code:
        half = (tax / Decimal("2")).quantize(Decimal("0.0001"))
        return TaxBreakup(
            taxable=taxable,
            cgst=half,
            sgst=tax - half,  # avoid rounding loss
            igst=Decimal("0"),
        )
    return TaxBreakup(taxable=taxable, cgst=Decimal("0"), sgst=Decimal("0"), igst=tax)


def compute_vat(taxable_amount, rate_percent, *, supply_type: str = SUPPLY_STANDARD) -> TaxBreakup:
    """GCC VAT: a single tax line at ``rate_percent``.

    Zero-rated and exempt supplies carry 0 VAT regardless of the rate passed.
    """
    taxable = to_money(taxable_amount)
    rate = (
        Decimal("0")
        if supply_type in (SUPPLY_ZERO_RATED, SUPPLY_EXEMPT)
        else to_money(rate_percent)
    )
    tax = (taxable * rate / Decimal("100")).quantize(Decimal("0.0001"))
    return TaxBreakup(
        taxable=taxable, cgst=Decimal("0"), sgst=Decimal("0"), igst=Decimal("0"), vat=tax,
    )
