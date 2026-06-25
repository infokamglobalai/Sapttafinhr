"""PO / GRN / Vendor Bill / Vendor Payment services with double-entry posting."""
from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.core.money import to_money
from apps.ledger.posting import Cr, Dr, LedgerService
from apps.masters.coa_template import (
    CODE_AP,
    CODE_FX_GAINLOSS,
    CODE_GST_INPUT_CGST,
    CODE_GST_INPUT_IGST,
    CODE_GST_INPUT_SGST,
    CODE_VAT_INPUT,
    CODE_VAT_OUTPUT,
    account_by_code,
    ensure_account,
)
from apps.masters.models import Company
from apps.masters.tax import compute_gst, compute_vat

# VAT accounts are created on demand for companies that predate GCC localization.
_VAT_INPUT = (CODE_VAT_INPUT, "VAT Input", "ASSET", "1100")
_VAT_OUTPUT = (CODE_VAT_OUTPUT, "VAT Output", "LIABILITY", "2100")
# Realized FX gain/loss on settling foreign-currency bills (created on demand).
_FX_GAINLOSS = (CODE_FX_GAINLOSS, "Foreign Exchange Gain/Loss", "INCOME", "4000")

from .models import (
    GRN,
    GRNLine,
    PurchaseOrder,
    PurchaseOrderLine,
    VendorBill,
    VendorBillLine,
    VendorPayment,
    VendorPaymentAllocation,
)

TDS_PAYABLE_CODE = "2160"


def _po_recompute_line(line: PurchaseOrderLine, seller_state: str, buyer_state: str) -> None:
    qty = to_money(line.quantity)
    price = to_money(line.unit_price)
    taxable = (qty * price).quantize(Decimal("0.0001"))
    breakup = compute_gst(taxable, line.tax_rate,
                          seller_state_code=seller_state, buyer_state_code=buyer_state)
    line.taxable_amount = taxable
    line.cgst = breakup.cgst
    line.sgst = breakup.sgst
    line.igst = breakup.igst
    line.line_total = breakup.grand_total


def _po_aggregate(po: PurchaseOrder) -> None:
    lines = list(po.lines.all())
    po.taxable_amount = sum((l.taxable_amount for l in lines), Decimal("0"))
    po.cgst = sum((l.cgst for l in lines), Decimal("0"))
    po.sgst = sum((l.sgst for l in lines), Decimal("0"))
    po.igst = sum((l.igst for l in lines), Decimal("0"))
    po.grand_total = po.taxable_amount + po.cgst + po.sgst + po.igst


class PurchaseOrderService:
    @transaction.atomic
    def create(self, *, po: PurchaseOrder, lines_data: list[dict]) -> PurchaseOrder:
        # PO uses vendor's state as buyer for tax calc preview; actual taxes
        # are recomputed at bill posting based on bill's place of supply.
        seller_state = po.vendor.state_code
        buyer_state = po.company.state_code
        po.save()
        for ld in lines_data:
            line = PurchaseOrderLine(purchase_order=po, **ld)
            _po_recompute_line(line, seller_state, buyer_state)
            line.save()
        _po_aggregate(po)
        po.save()
        return po


class GRNService:
    @transaction.atomic
    def create(self, *, grn: GRN, receipts: list[dict]) -> GRN:
        """receipts = [{'po_line': PurchaseOrderLine, 'received_qty': '...'}, ...]"""
        grn.save()
        for r in receipts:
            po_line: PurchaseOrderLine = r["po_line"]
            qty = to_money(r["received_qty"])
            if qty <= 0:
                continue
            remaining = po_line.quantity - po_line.received_qty
            if qty > remaining:
                raise ValidationError(
                    f"Receipt {qty} exceeds open qty {remaining} on PO line {po_line.id}"
                )
            GRNLine.objects.create(grn=grn, po_line=po_line, received_qty=qty)
            po_line.received_qty += qty
            po_line.save(update_fields=["received_qty", "updated_at"])
        return grn


class VendorBillService:
    """Posts:
        Dr Expense/Inventory     (per line)
        Dr GST Input CGST/SGST/IGST (claim ITC)
        Cr AP                    (grand_total - tds)
        Cr TDS Payable           (tds_amount)
    """

    @transaction.atomic
    def create_and_post(self, *, bill: VendorBill, lines_data: list[dict], user=None) -> VendorBill:
        company = bill.company
        regime = company.tax_regime
        seller_state = bill.vendor.state_code
        buyer_state = bill.place_of_supply or company.state_code
        vat_rate = company.standard_vat_rate

        bill.save()

        for ld in lines_data:
            line = VendorBillLine(bill=bill, **ld)
            qty = to_money(line.quantity)
            price = to_money(line.unit_price)
            taxable = (qty * price).quantize(Decimal("0.0001"))
            if regime == Company.TaxRegime.GCC_VAT:
                rate = line.tax_rate if line.tax_rate else vat_rate
                breakup = compute_vat(taxable, rate, supply_type=line.supply_type)
            elif regime == Company.TaxRegime.NONE:
                breakup = compute_vat(taxable, Decimal("0"))
            else:  # INDIA_GST
                breakup = compute_gst(taxable, line.tax_rate,
                                      seller_state_code=seller_state, buyer_state_code=buyer_state)
            line.taxable_amount = taxable
            line.cgst = breakup.cgst
            line.sgst = breakup.sgst
            line.igst = breakup.igst
            line.vat = breakup.vat
            # TDS computed on taxable (not on tax) per IT Act
            line.tds_amount = (taxable * to_money(line.tds_rate) / Decimal("100")).quantize(Decimal("0.0001"))
            line.line_total = breakup.grand_total
            line.save()

        all_lines = list(bill.lines.all())
        bill.taxable_amount = sum((l.taxable_amount for l in all_lines), Decimal("0"))
        bill.cgst = sum((l.cgst for l in all_lines), Decimal("0"))
        bill.sgst = sum((l.sgst for l in all_lines), Decimal("0"))
        bill.igst = sum((l.igst for l in all_lines), Decimal("0"))
        bill.vat = sum((l.vat for l in all_lines), Decimal("0"))
        bill.tds_amount = sum((l.tds_amount for l in all_lines), Decimal("0"))
        # Under GCC reverse charge the vendor does not charge VAT, so it is
        # excluded from the amount payable (self-assessed in the posting below).
        rcm = bill.rcm_applicable and regime == Company.TaxRegime.GCC_VAT
        charged_vat = Decimal("0") if rcm else bill.vat
        bill.grand_total = (
            bill.taxable_amount + bill.cgst + bill.sgst + bill.igst + charged_vat
        )
        bill.save()

        je = self._post_je(bill, all_lines, user=user)
        bill.journal_entry = je
        bill.status = VendorBill.Status.POSTED
        bill.save(update_fields=["journal_entry", "status", "updated_at"])

        if bill.tds_amount:
            self._create_tds_deductions(bill, all_lines)

        return bill

    def _create_tds_deductions(self, bill: VendorBill, lines: list[VendorBillLine]) -> None:
        from apps.taxation.models import TDSDeduction

        d = bill.date
        if d.month >= 4:
            fy = f"{d.year}-{str(d.year + 1)[2:]}"
        else:
            fy = f"{d.year - 1}-{str(d.year)[2:]}"
        quarter = (
            "Q1" if d.month in (4, 5, 6) else
            "Q2" if d.month in (7, 8, 9) else
            "Q3" if d.month in (10, 11, 12) else
            "Q4"
        )

        section_totals: dict[str, dict] = defaultdict(
            lambda: {"base": Decimal("0"), "tds": Decimal("0"), "rate": Decimal("0")}
        )
        for line in lines:
            if line.tds_amount and line.tds_section:
                section_totals[line.tds_section]["base"] += line.taxable_amount
                section_totals[line.tds_section]["tds"] += line.tds_amount
                section_totals[line.tds_section]["rate"] = to_money(line.tds_rate)

        for section, totals in section_totals.items():
            TDSDeduction.objects.create(
                company=bill.company,
                vendor_bill=bill,
                section=section,
                rate=totals["rate"],
                base_amount=totals["base"],
                tds_amount=totals["tds"],
                deduction_date=bill.date,
                pan=bill.vendor.pan,
                fy=fy,
                quarter=quarter,
            )

    def _post_je(self, bill: VendorBill, lines: list[VendorBillLine], *, user=None):
        company = bill.company
        ap = account_by_code(company, CODE_AP)

        # The ledger is kept in the company's base currency. Bill amounts are
        # stored in the transaction currency, so convert each leg by fx_rate
        # (1 for base-currency bills, leaving those untouched). The AP credit is
        # the exact sum of the debit legs minus the other credits so the JE always
        # balances after per-leg rounding (mirror of InvoiceService._post_je).
        fx = Decimal(bill.fx_rate or 1)

        def base(amount) -> Decimal:
            return to_money(Decimal(amount) * fx)

        debits = []
        for l in lines:
            debits.append(Dr(
                l.expense_account, base(l.taxable_amount),
                description=l.description, party_id=bill.vendor_id,
            ))

        # India GST input credit (ITC). RCM not modelled for GST — simple path.
        if bill.cgst:
            debits.append(Dr(account_by_code(company, CODE_GST_INPUT_CGST), base(bill.cgst), description="CGST input"))
        if bill.sgst:
            debits.append(Dr(account_by_code(company, CODE_GST_INPUT_SGST), base(bill.sgst), description="SGST input"))
        if bill.igst:
            debits.append(Dr(account_by_code(company, CODE_GST_INPUT_IGST), base(bill.igst), description="IGST input"))

        # GCC VAT: input VAT is recoverable. Under reverse charge the buyer also
        # self-assesses output VAT (Dr input / Cr output nets to zero cash).
        other_credits = []
        if bill.vat:
            debits.append(Dr(ensure_account(company, *_VAT_INPUT), base(bill.vat), description="VAT input"))
            if bill.rcm_applicable:
                other_credits.append(Cr(ensure_account(company, *_VAT_OUTPUT), base(bill.vat), description="VAT output (RCM)"))

        if bill.tds_amount:
            other_credits.append(Cr(account_by_code(company, TDS_PAYABLE_CODE), base(bill.tds_amount),
                                    description=f"TDS on bill {bill.bill_no}"))

        ap_amount = sum((d.debit for d in debits), Decimal("0")) - sum((c.credit for c in other_credits), Decimal("0"))
        je_lines = [
            *debits,
            *other_credits,
            Cr(ap, ap_amount, description=f"Bill {bill.bill_no}", party_id=bill.vendor_id),
        ]

        return LedgerService().post_manual(
            company=company,
            fiscal_year=bill.fiscal_year,
            voucher_no=f"BILL-{bill.id}-{bill.bill_no}",
            entry_date=bill.date,
            narration=f"Vendor bill from {bill.vendor.name}",
            lines=je_lines,
            user=user,
        )


class VendorPaymentService:
    @transaction.atomic
    def create_and_post(
        self,
        *,
        payment: VendorPayment,
        allocations: list[dict],
        user=None,
    ) -> VendorPayment:
        company = payment.company
        payment.save()

        # AP is cleared in base currency at each bill's own fx_rate, so a payment
        # at a different rate realizes an FX gain/loss. Track the transaction-
        # currency total (for the advance residual) and the base-currency AP
        # cleared separately (mirror of ReceiptService).
        total_alloc = Decimal("0")          # transaction currency
        ap_base_cleared = Decimal("0")      # base currency
        for a in allocations:
            bill: VendorBill = a["bill"]
            amount = to_money(a["amount"])
            if bill.vendor_id != payment.vendor_id:
                raise ValidationError("Bill belongs to another vendor.")
            if bill.currency != payment.currency:
                raise ValidationError(
                    f"Bill {bill.bill_no} is in {bill.currency}; "
                    f"this payment is in {payment.currency}. "
                    "Settle with a payment in the bill's currency."
                )
            if amount > bill.balance_due:
                raise ValidationError(
                    f"Allocation {amount} exceeds bill {bill.bill_no} balance ({bill.balance_due})."
                )
            VendorPaymentAllocation.objects.create(payment=payment, bill=bill, amount=amount)
            bill.amount_paid += amount
            bill.save(update_fields=["amount_paid", "updated_at"])
            total_alloc += amount
            ap_base_cleared += to_money(amount * Decimal(bill.fx_rate or 1))

        if total_alloc > to_money(payment.amount):
            raise ValidationError("Allocations exceed payment amount.")

        fx = Decimal(payment.fx_rate or 1)
        # Cash actually paid, valued in base currency at the payment rate.
        cash_base = to_money(Decimal(payment.amount) * fx)
        # Any unallocated residual (advance to the vendor) sits on AP at the
        # payment rate — no FX is realized until it's later applied to a bill.
        advance_txn = to_money(payment.amount) - total_alloc
        ap_base_advance = to_money(advance_txn * fx)
        ap_debit = ap_base_cleared + ap_base_advance
        # Difference between cash paid and AP cleared is realized FX.
        fx_diff = cash_base - ap_debit

        ap = account_by_code(company, CODE_AP)
        lines = [
            Dr(ap, ap_debit, description=f"Pmt {payment.payment_no}",
               party_id=payment.vendor_id),
            Cr(payment.paid_from_account, cash_base,
               description=f"Pmt {payment.payment_no}"),
        ]
        # Paid more base than AP cleared → loss; less → gain.
        if fx_diff > 0:
            lines.append(Dr(ensure_account(company, *_FX_GAINLOSS), fx_diff, description="FX loss on payment"))
        elif fx_diff < 0:
            lines.append(Cr(ensure_account(company, *_FX_GAINLOSS), -fx_diff, description="FX gain on payment"))

        je = LedgerService().post_manual(
            company=company,
            fiscal_year=payment.fiscal_year,
            voucher_no=payment.payment_no,
            entry_date=payment.date,
            narration=f"Payment to {payment.vendor.name}",
            lines=lines,
            user=user,
        )
        payment.journal_entry = je
        payment.status = VendorPayment.Status.POSTED
        payment.save(update_fields=["journal_entry", "status", "updated_at"])
        return payment
