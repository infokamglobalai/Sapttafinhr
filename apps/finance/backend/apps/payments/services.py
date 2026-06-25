"""Receipt service: create receipt, allocate to invoices, post JE.

Auto-allocation: when `allocations` is empty (or partial), remaining receipt amount
is distributed FIFO across the customer's open invoices (oldest first).
"""
from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.billing.models import Invoice
from apps.core.money import to_money
from apps.ledger.posting import Cr, Dr, LedgerService
from apps.masters.coa_template import (
    CODE_AR, CODE_FX_GAINLOSS, account_by_code, ensure_account,
)

from .models import Receipt, ReceiptAllocation

# FX gain/loss is realized on demand for companies that predate multi-currency.
_FX_GAINLOSS = (CODE_FX_GAINLOSS, "Foreign Exchange Gain/Loss", "INCOME", "4000")


def _auto_allocate_fifo(receipt: Receipt, remaining: Decimal) -> list[dict]:
    """Yield additional allocations against oldest open invoices of the same customer.

    Only invoices in the receipt's currency are eligible — a receipt settles
    same-currency invoices so the per-invoice balance stays coherent.
    """
    open_invoices = (
        Invoice.objects
        .filter(
            company=receipt.company,
            customer_id=receipt.customer_id,
            status=Invoice.Status.POSTED,
            currency=receipt.currency,
        )
        .order_by("date", "id")
    )
    extras: list[dict] = []
    for inv in open_invoices:
        if remaining <= 0:
            break
        due = inv.balance_due
        if due <= 0:
            continue
        take = min(due, remaining)
        extras.append({"invoice": inv, "amount": take})
        remaining -= take
    return extras


class ReceiptService:
    @transaction.atomic
    def create_and_post(
        self,
        *,
        receipt: Receipt,
        allocations: list[dict],
        user=None,
    ) -> Receipt:
        company = receipt.company
        receipt.save()

        # If nothing manually allocated, default to FIFO against open invoices.
        if not allocations:
            allocations = _auto_allocate_fifo(receipt, to_money(receipt.amount))

        # AR is cleared in base currency at each invoice's own fx_rate, so a
        # receipt at a different rate realizes an FX gain/loss. Track the
        # transaction-currency total (for the advance residual) and the
        # base-currency AR cleared separately.
        total_alloc = Decimal("0")          # transaction currency
        ar_base_cleared = Decimal("0")      # base currency

        def settle(invoice, amount):
            nonlocal total_alloc, ar_base_cleared
            if invoice.customer_id != receipt.customer_id:
                raise ValidationError(
                    f"Invoice {invoice.invoice_no} belongs to another customer."
                )
            if invoice.currency != receipt.currency:
                raise ValidationError(
                    f"Invoice {invoice.invoice_no} is in {invoice.currency}; "
                    f"this receipt is in {receipt.currency}. "
                    "Settle with a receipt in the invoice's currency."
                )
            if amount > invoice.balance_due:
                raise ValidationError(
                    f"Allocation {amount} exceeds invoice {invoice.invoice_no} balance ({invoice.balance_due})."
                )
            ReceiptAllocation.objects.create(receipt=receipt, invoice=invoice, amount=amount)
            invoice.amount_paid = invoice.amount_paid + amount
            invoice.save(update_fields=["amount_paid", "updated_at"])
            total_alloc += amount
            ar_base_cleared += to_money(amount * Decimal(invoice.fx_rate or 1))

        for alloc in allocations:
            settle(alloc["invoice"], to_money(alloc["amount"]))

        if total_alloc > to_money(receipt.amount):
            raise ValidationError("Allocations exceed receipt amount.")

        # Auto-fill any remaining receipt amount against next-oldest open invoices.
        remaining = to_money(receipt.amount) - total_alloc
        if remaining > 0:
            for extra in _auto_allocate_fifo(receipt, remaining):
                settle(extra["invoice"], extra["amount"])

        fx = Decimal(receipt.fx_rate or 1)
        # Cash actually received, valued in base currency at the receipt rate.
        cash_base = to_money(Decimal(receipt.amount) * fx)
        # Any unallocated residual (customer advance) sits on AR at the receipt
        # rate — no FX is realized until it's later applied to an invoice.
        advance_txn = to_money(receipt.amount) - total_alloc
        ar_base_advance = to_money(advance_txn * fx)
        ar_credit = ar_base_cleared + ar_base_advance
        # Difference between cash received and AR cleared is realized FX.
        fx_diff = cash_base - ar_credit

        # Post: Dr Cash/Bank, Cr AR, +/- FX gain/loss to balance.
        ar = account_by_code(company, CODE_AR)
        lines = [
            Dr(receipt.deposit_account, cash_base,
               description=f"Receipt {receipt.receipt_no}"),
            Cr(ar, ar_credit,
               description=f"Receipt {receipt.receipt_no}",
               party_id=receipt.customer_id),
        ]
        if fx_diff > 0:
            lines.append(Cr(ensure_account(company, *_FX_GAINLOSS), fx_diff, description="FX gain on settlement"))
        elif fx_diff < 0:
            lines.append(Dr(ensure_account(company, *_FX_GAINLOSS), -fx_diff, description="FX loss on settlement"))

        je = LedgerService().post_manual(
            company=company,
            fiscal_year=receipt.fiscal_year,
            voucher_no=receipt.receipt_no,
            entry_date=receipt.date,
            narration=f"Receipt from {receipt.customer.name}",
            lines=lines,
            user=user,
        )
        receipt.journal_entry = je
        receipt.status = Receipt.Status.POSTED
        receipt.save(update_fields=["journal_entry", "status", "updated_at"])
        return receipt
