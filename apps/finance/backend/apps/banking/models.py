"""Bank accounts + statement import + reconciliation + PDC tracking + FX rates."""
from decimal import Decimal

from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel
from apps.masters.models import Account, Company


class BankAccount(TimeStampedModel):
    """A real-world bank account. Linked to a GL Account (typically 1121.x)."""

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="bank_accounts")
    name = models.CharField(max_length=200)
    bank_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=40)
    ifsc = models.CharField(max_length=11, blank=True)
    branch = models.CharField(max_length=200, blank=True)
    currency = models.CharField(max_length=3, default="INR")
    ledger_account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="bank_accounts",
        help_text="The GL account this bank account posts to (e.g. 1121)",
    )
    is_active = models.BooleanField(default=True)
    opening_balance = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "account_number")

    def __str__(self):
        return f"{self.name} ({self.bank_name})"


class BankStatement(TimeStampedModel):
    """One imported statement (a CSV upload, MT940 file, or bank-feed batch)."""

    bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name="statements")
    period_start = models.DateField()
    period_end = models.DateField()
    opening_balance = models.DecimalField(max_digits=18, decimal_places=4)
    closing_balance = models.DecimalField(max_digits=18, decimal_places=4)
    source = models.CharField(max_length=40, default="CSV")

    def __str__(self):
        return f"Stmt {self.bank_account.name} {self.period_start}–{self.period_end}"


class BankStatementLine(TimeStampedModel):
    """A single transaction line from a bank statement, awaiting reconciliation."""

    class Status(models.TextChoices):
        UNMATCHED = "UNMATCHED", "Unmatched"
        MATCHED = "MATCHED", "Matched"
        IGNORED = "IGNORED", "Ignored"

    statement = models.ForeignKey(BankStatement, on_delete=models.CASCADE, related_name="lines")
    date = models.DateField(db_index=True)
    value_date = models.DateField(null=True, blank=True)
    description = models.CharField(max_length=500)
    reference = models.CharField(max_length=100, blank=True)
    debit = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    credit = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    balance = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.UNMATCHED)
    matched_journal_line = models.ForeignKey(
        "ledger.JournalLine", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="bank_matches",
    )

    class Meta:
        indexes = [models.Index(fields=["status", "date"])]


class PostDatedCheque(TimeStampedModel):
    """PDC tracker — cheque issued to/received from a party for a future date."""

    class Direction(models.TextChoices):
        ISSUED = "ISSUED", "Issued to vendor"
        RECEIVED = "RECEIVED", "Received from customer"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        DEPOSITED = "DEPOSITED", "Deposited"
        CLEARED = "CLEARED", "Cleared"
        BOUNCED = "BOUNCED", "Bounced"
        CANCELLED = "CANCELLED", "Cancelled"

    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    direction = models.CharField(max_length=10, choices=Direction.choices)
    party = models.ForeignKey("masters.Party", on_delete=models.PROTECT)
    cheque_no = models.CharField(max_length=20)
    cheque_date = models.DateField(db_index=True)
    bank_name = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=4)
    bank_account = models.ForeignKey(BankAccount, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    notes = models.CharField(max_length=500, blank=True)

    last_reminder_at = models.DateTimeField(null=True, blank=True)


class Advance(TimeStampedModel):
    """Advance receipt or payment, sits on AR/AP until adjusted against an invoice/bill."""

    class Kind(models.TextChoices):
        RECEIVED = "RECEIVED", "Received from customer"
        PAID = "PAID", "Paid to vendor"

    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    date = models.DateField()
    party = models.ForeignKey("masters.Party", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=18, decimal_places=4)
    balance = models.DecimalField(max_digits=18, decimal_places=4,
                                  help_text="Unadjusted portion")
    notes = models.CharField(max_length=500, blank=True)
    journal_entry = models.OneToOneField(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL, related_name="+",
    )


class FXRate(TimeStampedModel):
    """Foreign-exchange rate (from_currency -> INR) for a given date."""
    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    currency = models.CharField(max_length=3)
    date = models.DateField()
    rate = models.DecimalField(max_digits=18, decimal_places=6,
                                help_text="1 unit of currency = this many INR")

    class Meta:
        unique_together = ("company", "currency", "date")
        ordering = ("-date",)


class BankCredential(TimeStampedModel):
    """Securely stores encrypted API credentials for Connected Banking."""
    bank_account = models.OneToOneField(BankAccount, on_delete=models.CASCADE, related_name="credential")
    encrypted_data = models.TextField(help_text="Fernet encrypted JSON client keys")
    
    # OTP verification state for viewing/editing
    otp_code = models.CharField(max_length=6, blank=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Credentials for {self.bank_account.name}"
