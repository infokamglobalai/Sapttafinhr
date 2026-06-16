"""Double-entry ledger: JournalEntry + JournalLine.

This is the spine of the entire system. Every business document (invoice,
payment, bill, stock movement, depreciation run) ultimately produces a
JournalEntry through the Posting Engine.

INVARIANT — enforced in JournalEntry.full_clean()/save():
    Σ(lines.debit) == Σ(lines.credit)  for every posted JournalEntry.

Period lock — enforced in save():
    If entry.date <= company.books_closed_until, the entry cannot be
    created, modified, or deleted.
"""
from decimal import Decimal

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models, transaction
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel
from apps.masters.models import Account, Company, FiscalYear


class JournalEntry(TimeStampedModel):
    """A single accounting transaction. Always balanced."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"
        REVERSED = "REVERSED", "Reversed"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="journal_entries")
    fiscal_year = models.ForeignKey(
        FiscalYear, on_delete=models.PROTECT, related_name="journal_entries"
    )
    voucher_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    narration = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)

    class Category(models.TextChoices):
        SALES = "sales", "Sales Invoice"
        PURCHASE = "purchase", "Vendor Bill"
        RECEIPT = "receipt", "Customer Receipt"
        PAYMENT = "payment", "Vendor Payment"
        UNCATEGORIZED = "uncategorized", "Uncategorized"

    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.UNCATEGORIZED,
    )

    # Polymorphic link to the source document (Invoice, Payment, Bill, ...).
    # Null for manual entries.
    source_content_type = models.ForeignKey(
        ContentType, null=True, blank=True, on_delete=models.SET_NULL
    )
    source_object_id = models.BigIntegerField(null=True, blank=True)
    source = GenericForeignKey("source_content_type", "source_object_id")

    reversed_by = models.OneToOneField(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reverses",
    )
    posted_at = models.DateTimeField(null=True, blank=True)
    posted_by = models.ForeignKey(
        "identity.User", null=True, blank=True, on_delete=models.SET_NULL
    )

    history = HistoricalRecords()

    class Meta:
        ordering = ["-date", "-id"]
        unique_together = ("company", "voucher_no")
        indexes = [
            models.Index(fields=["company", "date"]),
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.voucher_no} ({self.date})"

    # ----- Invariant enforcement -----

    def _sum_lines(self) -> tuple[Decimal, Decimal]:
        agg = self.lines.aggregate(
            d=models.Sum("debit"),
            c=models.Sum("credit"),
        )
        return (agg["d"] or Decimal("0")), (agg["c"] or Decimal("0"))

    def assert_balanced(self) -> None:
        d, c = self._sum_lines()
        if d != c:
            raise ValidationError(
                f"Journal entry not balanced: debits={d} credits={c}"
            )
        if d == 0:
            raise ValidationError("Journal entry has zero total — at least one line required.")

    def _assert_period_open(self) -> None:
        closed_until = self.company.books_closed_until
        if closed_until and self.date <= closed_until:
            raise ValidationError(
                f"Books are closed until {closed_until}; cannot modify entry dated {self.date}."
            )

    def clean(self):
        super().clean()
        self._assert_period_open()

    def delete(self, *args, **kwargs):
        if self.status == self.Status.POSTED:
            raise ValidationError("Cannot delete a posted journal entry — reverse it instead.")
        self._assert_period_open()
        return super().delete(*args, **kwargs)

    def classify(self) -> str:
        if self.source_content_type:
            model_name = self.source_content_type.model
            if model_name == "invoice":
                return self.Category.SALES
            elif model_name == "vendorbill":
                return self.Category.PURCHASE
            elif model_name == "receipt":
                return self.Category.RECEIPT
            elif model_name == "vendorpayment":
                return self.Category.PAYMENT

        lines = list(self.lines.all())
        if not lines:
            return self.Category.UNCATEGORIZED

        debit_codes = {l.account.code for l in lines if l.debit > 0}
        credit_codes = {l.account.code for l in lines if l.credit > 0}
        debit_types = {l.account.type for l in lines if l.debit > 0}
        credit_types = {l.account.type for l in lines if l.credit > 0}

        CASH_BANK = {"1110", "1121"}
        AR_CODE = "1130"
        AP_CODE = "2110"
        SUSPENSE_CODES = {"2990", "1999"}

        if (debit_codes & SUSPENSE_CODES) or (credit_codes & SUSPENSE_CODES):
            return self.Category.UNCATEGORIZED

        # 1. Customer Receipt: Debits Cash/Bank and Credits Accounts Receivable
        if (debit_codes & CASH_BANK) and (AR_CODE in credit_codes):
            return self.Category.RECEIPT

        # 2. Vendor Payment: Debits Accounts Payable and Credits Cash/Bank
        if (AP_CODE in debit_codes) and (credit_codes & CASH_BANK):
            return self.Category.PAYMENT

        # 3. Sales Invoice: Debits Accounts Receivable and Credits Revenue (INCOME)
        if (AR_CODE in debit_codes) and ("INCOME" in credit_types):
            return self.Category.SALES

        # 4. Vendor Bill: Debits Expense and Credits Accounts Payable
        if ("EXPENSE" in debit_types) and (AP_CODE in credit_codes):
            return self.Category.PURCHASE

        return self.Category.UNCATEGORIZED

    @transaction.atomic
    def post(self, user=None) -> "JournalEntry":
        """Move from DRAFT to POSTED. Validates D=C."""
        from django.utils import timezone

        if self.status == self.Status.POSTED:
            return self
        if self.status == self.Status.REVERSED:
            raise ValidationError("Cannot post a reversed entry.")
        self._assert_period_open()
        self.assert_balanced()
        self.status = self.Status.POSTED
        self.posted_at = timezone.now()
        self.posted_by = user
        self.category = self.classify()
        self.save(update_fields=["status", "posted_at", "posted_by", "category", "updated_at"])

        # Create alert notification if uncategorized
        if self.category == self.Category.UNCATEGORIZED:
            try:
                from apps.notifications.models import Notification
                notify_user = user
                if not notify_user:
                    from apps.identity.models import User
                    notify_user = User.objects.filter(is_active=True).first()
                if notify_user:
                    Notification.objects.create(
                        user=notify_user,
                        title="⚠️ Uncategorized Entry Saved",
                        body=f"Journal entry {self.voucher_no} was saved as uncategorized. Please review it.",
                        level=Notification.Level.WARNING,
                        link="#/uncategorized",
                    )
            except Exception:
                pass
        return self


class JournalLine(TimeStampedModel):
    """A single side of a JournalEntry. Either debit OR credit is non-zero."""

    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.CASCADE, related_name="lines"
    )
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="journal_lines")
    debit = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    credit = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    description = models.CharField(max_length=255, blank=True)

    # Dimensions for cost allocation (added in Phase 2 — kept nullable for now)
    cost_center = models.CharField(max_length=80, blank=True)
    project = models.CharField(max_length=80, blank=True)
    party_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["account", "journal_entry"]),
        ]

    def clean(self):
        super().clean()
        if self.debit < 0 or self.credit < 0:
            raise ValidationError("Debit and credit must be non-negative.")
        if self.debit > 0 and self.credit > 0:
            raise ValidationError("A line cannot have both debit and credit.")
        if self.debit == 0 and self.credit == 0:
            raise ValidationError("A line must have either debit or credit > 0.")
        if not self.account.is_postable:
            raise ValidationError(
                f"Account {self.account.code} is a group account — not postable."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
