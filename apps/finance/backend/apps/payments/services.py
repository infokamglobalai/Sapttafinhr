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
from apps.masters.coa_template import CODE_AR, account_by_code

from .models import Receipt, ReceiptAllocation


def _auto_allocate_fifo(receipt: Receipt, remaining: Decimal) -> list[dict]:
    """Yield additional allocations against oldest open invoices of the same customer."""
    open_invoices = (
        Invoice.objects
        .filter(
            company=receipt.company,
            customer_id=receipt.customer_id,
            status=Invoice.Status.POSTED,
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

        total_alloc = Decimal("0")
        for alloc in allocations:
            invoice = alloc["invoice"]
            amount = to_money(alloc["amount"])
            if invoice.customer_id != receipt.customer_id:
                raise ValidationError(
                    f"Invoice {invoice.invoice_no} belongs to another customer."
                )
            if amount > invoice.balance_due:
                raise ValidationError(
                    f"Allocation {amount} exceeds invoice {invoice.invoice_no} balance ({invoice.balance_due})."
                )
            ReceiptAllocation.objects.create(receipt=receipt, invoice=invoice, amount=amount)
            invoice.amount_paid = invoice.amount_paid + amount
            invoice.save(update_fields=["amount_paid", "updated_at"])
            total_alloc += amount

        if total_alloc > to_money(receipt.amount):
            raise ValidationError("Allocations exceed receipt amount.")

        # Auto-fill any remaining receipt amount against next-oldest open invoices.
        remaining = to_money(receipt.amount) - total_alloc
        if remaining > 0:
            for extra in _auto_allocate_fifo(receipt, remaining):
                inv = extra["invoice"]
                amt = extra["amount"]
                ReceiptAllocation.objects.create(receipt=receipt, invoice=inv, amount=amt)
                inv.amount_paid = inv.amount_paid + amt
                inv.save(update_fields=["amount_paid", "updated_at"])
                total_alloc += amt

        # Post: Dr Cash/Bank, Cr AR
        ar = account_by_code(company, CODE_AR)
        je = LedgerService().post_manual(
            company=company,
            fiscal_year=receipt.fiscal_year,
            voucher_no=receipt.receipt_no,
            entry_date=receipt.date,
            narration=f"Receipt from {receipt.customer.name}",
            lines=[
                Dr(receipt.deposit_account, receipt.amount,
                   description=f"Receipt {receipt.receipt_no}"),
                Cr(ar, receipt.amount,
                   description=f"Receipt {receipt.receipt_no}",
                   party_id=receipt.customer_id),
            ],
            user=user,
        )
        receipt.journal_entry = je
        receipt.status = Receipt.Status.POSTED
        receipt.save(update_fields=["journal_entry", "status", "updated_at"])
        return receipt
