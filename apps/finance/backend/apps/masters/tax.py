"""GST tax engine — place-of-supply → CGST+SGST (intra-state) or IGST (inter-state).

Indian GST rule:
  - Seller state == Buyer state  → CGST + SGST (each half of tax rate)
  - Seller state != Buyer state  → IGST (full tax rate)

This module is intentionally tiny and pure — it does not know about
Invoice or Account models. Callers pass plain numbers and a place-of-supply.
"""
from dataclasses import dataclass
from decimal import Decimal

from apps.core.money import to_money


@dataclass(frozen=True)
class TaxBreakup:
    taxable: Decimal
    cgst: Decimal
    sgst: Decimal
    igst: Decimal

    @property
    def total_tax(self) -> Decimal:
        return self.cgst + self.sgst + self.igst

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
