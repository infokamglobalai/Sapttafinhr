"""Receipts (cash in from customers) + allocation against open invoices.

A Receipt posts:
  Dr Cash/Bank
  Cr AR (customer)

Each ReceiptAllocation reduces an Invoice's amount_paid; over-allocation
(advance) leaves the residual on the AR account against the party.
"""
from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel
from apps.masters.models import Account, Company, FiscalYear, Party

from apps.billing.models import Invoice


class Receipt(TimeStampedModel):
    """Money received from a customer."""

    class Mode(models.TextChoices):
        CASH = "CASH", "Cash"
        BANK = "BANK", "Bank Transfer"
        UPI = "UPI", "UPI"
        CHEQUE = "CHEQUE", "Cheque"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="receipts")
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT, related_name="receipts")
    receipt_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    customer = models.ForeignKey(Party, on_delete=models.PROTECT, related_name="receipts")
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.BANK)
    reference = models.CharField(max_length=80, blank=True, help_text="UTR / cheque #")
    amount = models.DecimalField(max_digits=18, decimal_places=4)
    # Transaction currency of the receipt. Allocations settle invoices of the
    # same currency; the GL is posted in base currency using fx_rate, and any
    # difference vs the invoice's own fx_rate is realized as FX gain/loss.
    currency = models.CharField(max_length=3, default="INR")
    fx_rate = models.DecimalField(
        max_digits=18, decimal_places=6, default=1,
        help_text="1 unit of `currency` = this many base-currency units. 1 when currency == base.")
    notes = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)

    deposit_account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="receipts",
        help_text="Cash or Bank account to debit",
    )
    journal_entry = models.OneToOneField(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+",
    )

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "receipt_no")
        ordering = ("-date", "-id")

    def __str__(self) -> str:
        return f"{self.receipt_no} ({self.customer.name})"


class ReceiptAllocation(TimeStampedModel):
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name="allocations")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="allocations")
    amount = models.DecimalField(max_digits=18, decimal_places=4)

    class Meta:
        ordering = ("id",)
