"""Invoice + Credit Note services: compute totals, post JE via Posting Engine."""
from decimal import Decimal

from django.db import transaction

from apps.core.money import to_money
from apps.ledger.posting import Cr, Dr, LedgerService
from apps.masters.coa_template import (
    CODE_AR,
    CODE_GST_OUTPUT_CGST,
    CODE_GST_OUTPUT_IGST,
    CODE_GST_OUTPUT_SGST,
    CODE_SALES,
    CODE_VAT_OUTPUT,
    account_by_code,
    ensure_account,
)
from apps.masters.models import Company
from apps.masters.tax import compute_gst, compute_vat

from .models import CreditNote, Invoice, InvoiceLine

# VAT Output is created on demand for companies that predate GCC localization.
_VAT_OUTPUT = (CODE_VAT_OUTPUT, "VAT Output", "LIABILITY", "2100")


def _recompute_line(line: InvoiceLine, *, regime: str, seller_state: str,
                    buyer_state: str, vat_rate) -> None:
    """Compute taxable + tax (GST split or VAT) for a single line, in-place."""
    qty = to_money(line.quantity)
    price = to_money(line.unit_price)
    gross = qty * price
    discount = (gross * to_money(line.discount_percent) / Decimal("100"))
    taxable = (gross - discount).quantize(Decimal("0.0001"))

    if regime == Company.TaxRegime.GCC_VAT:
        rate = line.tax_rate if line.tax_rate else vat_rate
        breakup = compute_vat(taxable, rate, supply_type=line.supply_type)
    elif regime == Company.TaxRegime.NONE:
        breakup = compute_vat(taxable, Decimal("0"))
    else:  # INDIA_GST
        breakup = compute_gst(
            taxable, line.tax_rate,
            seller_state_code=seller_state,
            buyer_state_code=buyer_state,
        )

    line.taxable_amount = taxable
    line.cgst = breakup.cgst
    line.sgst = breakup.sgst
    line.igst = breakup.igst
    line.vat = breakup.vat
    line.line_total = breakup.grand_total


def _aggregate_invoice(invoice: Invoice) -> None:
    """Roll line totals up to invoice header."""
    lines = list(invoice.lines.all())
    invoice.taxable_amount = sum((l.taxable_amount for l in lines), Decimal("0"))
    invoice.cgst = sum((l.cgst for l in lines), Decimal("0"))
    invoice.sgst = sum((l.sgst for l in lines), Decimal("0"))
    invoice.igst = sum((l.igst for l in lines), Decimal("0"))
    invoice.vat = sum((l.vat for l in lines), Decimal("0"))
    invoice.grand_total = (
        invoice.taxable_amount + invoice.cgst + invoice.sgst + invoice.igst + invoice.vat
    )


class InvoiceService:
    @transaction.atomic
    def create_and_post(self, *, invoice: Invoice, lines_data: list[dict], user=None) -> Invoice:
        """Create invoice + lines, compute tax per the company's regime, post to ledger."""
        company = invoice.company
        regime = company.tax_regime
        seller_state = company.state_code
        buyer_state = invoice.place_of_supply or invoice.customer.state_code
        vat_rate = company.standard_vat_rate

        invoice.save()

        for ld in lines_data:
            line = InvoiceLine(invoice=invoice, **ld)
            _recompute_line(line, regime=regime, seller_state=seller_state,
                            buyer_state=buyer_state, vat_rate=vat_rate)
            line.save()

        _aggregate_invoice(invoice)
        invoice.save()

        je = self._post_je(invoice, user=user)
        invoice.journal_entry = je
        invoice.status = Invoice.Status.POSTED
        invoice.save(update_fields=["journal_entry", "status", "updated_at"])
        return invoice

    def _post_je(self, invoice: Invoice, *, user=None):
        company = invoice.company
        ar = account_by_code(company, CODE_AR)
        sales = account_by_code(company, CODE_SALES)

        lines = [
            Dr(ar, invoice.grand_total, description=f"Inv {invoice.invoice_no}",
               party_id=invoice.customer_id),
            Cr(sales, invoice.taxable_amount, description=f"Inv {invoice.invoice_no}"),
        ]
        # GST split (India) and VAT (GCC) are mutually exclusive per regime.
        if invoice.cgst:
            lines.append(Cr(account_by_code(company, CODE_GST_OUTPUT_CGST), invoice.cgst, description="CGST output"))
        if invoice.sgst:
            lines.append(Cr(account_by_code(company, CODE_GST_OUTPUT_SGST), invoice.sgst, description="SGST output"))
        if invoice.igst:
            lines.append(Cr(account_by_code(company, CODE_GST_OUTPUT_IGST), invoice.igst, description="IGST output"))
        if invoice.vat:
            lines.append(Cr(ensure_account(company, *_VAT_OUTPUT), invoice.vat, description="VAT output"))

        return LedgerService().post_manual(
            company=company,
            fiscal_year=invoice.fiscal_year,
            voucher_no=invoice.invoice_no,
            entry_date=invoice.date,
            narration=f"Sales: {invoice.customer.name}",
            lines=lines,
            user=user,
        )


class CreditNoteService:
    @transaction.atomic
    def create_and_post(
        self,
        *,
        company,
        fiscal_year,
        note_no: str,
        date,
        invoice: Invoice,
        taxable_amount,
        reason: str = "",
        user=None,
    ) -> CreditNote:
        """Create CN against an invoice, mirror the invoice's GST split."""
        if invoice.taxable_amount <= 0:
            raise ValueError("Source invoice has zero taxable amount.")

        ratio = to_money(taxable_amount) / invoice.taxable_amount
        cgst = (invoice.cgst * ratio).quantize(Decimal("0.0001"))
        sgst = (invoice.sgst * ratio).quantize(Decimal("0.0001"))
        igst = (invoice.igst * ratio).quantize(Decimal("0.0001"))
        vat = (invoice.vat * ratio).quantize(Decimal("0.0001"))
        grand_total = to_money(taxable_amount) + cgst + sgst + igst + vat

        cn = CreditNote.objects.create(
            company=company,
            fiscal_year=fiscal_year,
            note_no=note_no,
            date=date,
            invoice=invoice,
            reason=reason,
            taxable_amount=to_money(taxable_amount),
            cgst=cgst, sgst=sgst, igst=igst, vat=vat,
            grand_total=grand_total,
        )

        # Reversal posting: swap Dr/Cr of the invoice's JE
        ar = account_by_code(company, CODE_AR)
        sales = account_by_code(company, CODE_SALES)

        lines = [
            Dr(sales, cn.taxable_amount, description=f"CN {note_no}"),
            Cr(ar, cn.grand_total, description=f"CN {note_no}",
               party_id=invoice.customer_id),
        ]
        if cn.cgst:
            lines.append(Dr(account_by_code(company, CODE_GST_OUTPUT_CGST), cn.cgst, description="CGST reversal"))
        if cn.sgst:
            lines.append(Dr(account_by_code(company, CODE_GST_OUTPUT_SGST), cn.sgst, description="SGST reversal"))
        if cn.igst:
            lines.append(Dr(account_by_code(company, CODE_GST_OUTPUT_IGST), cn.igst, description="IGST reversal"))
        if cn.vat:
            lines.append(Dr(ensure_account(company, *_VAT_OUTPUT), cn.vat, description="VAT reversal"))

        je = LedgerService().post_manual(
            company=company,
            fiscal_year=fiscal_year,
            voucher_no=note_no,
            entry_date=date,
            narration=f"Credit Note against {invoice.invoice_no}: {reason}",
            lines=lines,
            user=user,
        )
        cn.journal_entry = je
        cn.status = CreditNote.Status.POSTED
        cn.save(update_fields=["journal_entry", "status", "updated_at"])

        # Reduce invoice balance (cap at original grand_total to be safe)
        invoice.amount_paid = min(invoice.grand_total, invoice.amount_paid + cn.grand_total)
        invoice.save(update_fields=["amount_paid", "updated_at"])

        return cn
