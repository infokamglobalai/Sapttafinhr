"""Expense Claims, Petty Cash, Budgets."""
from decimal import Decimal

from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel
from apps.masters.models import Account, Company, CostCenter, FiscalYear, Project


class ExpenseClaim(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        REIMBURSED = "REIMBURSED", "Reimbursed"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="expense_claims")
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT)
    claim_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    employee = models.ForeignKey("identity.User", on_delete=models.PROTECT,
                                  related_name="expense_claims")
    description = models.CharField(max_length=500)
    total = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    approved_by = models.ForeignKey("identity.User", null=True, blank=True,
                                     on_delete=models.SET_NULL,
                                     related_name="approved_claims")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=500, blank=True)
    journal_entry = models.OneToOneField(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL, related_name="+",
    )

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "claim_no")
        ordering = ("-date", "-id")


class ExpenseClaimLine(TimeStampedModel):
    claim = models.ForeignKey(ExpenseClaim, on_delete=models.CASCADE, related_name="lines")
    date = models.DateField()
    expense_account = models.ForeignKey(Account, on_delete=models.PROTECT)
    cost_center = models.ForeignKey(CostCenter, null=True, blank=True, on_delete=models.SET_NULL)
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=18, decimal_places=4)
    receipt = models.FileField(upload_to="expenses/receipts/", null=True, blank=True)


class PettyCashFloat(TimeStampedModel):
    """A petty cash fund held by an employee, replenished periodically."""
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="petty_floats")
    name = models.CharField(max_length=100)
    custodian = models.ForeignKey("identity.User", on_delete=models.PROTECT,
                                   related_name="petty_floats")
    cash_account = models.ForeignKey(Account, on_delete=models.PROTECT)
    float_limit = models.DecimalField(max_digits=18, decimal_places=4)
    current_balance = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    is_active = models.BooleanField(default=True)


class PettyCashTransaction(TimeStampedModel):
    class Kind(models.TextChoices):
        REPLENISH = "REPLENISH", "Replenish"
        EXPENSE = "EXPENSE", "Expense"

    float_account = models.ForeignKey(PettyCashFloat, on_delete=models.CASCADE,
                                       related_name="transactions")
    date = models.DateField()
    kind = models.CharField(max_length=10, choices=Kind.choices)
    expense_account = models.ForeignKey(Account, null=True, blank=True,
                                         on_delete=models.SET_NULL)
    amount = models.DecimalField(max_digits=18, decimal_places=4)
    description = models.CharField(max_length=255, blank=True)
    journal_entry = models.OneToOneField(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL, related_name="+",
    )


class Budget(TimeStampedModel):
    """Per-account budget for a period. Compared against actuals in reports."""
    class Period(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        QUARTERLY = "QUARTERLY", "Quarterly"
        ANNUAL = "ANNUAL", "Annual"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="budgets")
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT)
    account = models.ForeignKey(Account, on_delete=models.PROTECT)
    cost_center = models.ForeignKey(CostCenter, null=True, blank=True, on_delete=models.SET_NULL)
    period = models.CharField(max_length=10, choices=Period.choices, default=Period.MONTHLY)
    period_start = models.DateField()
    period_end = models.DateField()
    amount = models.DecimalField(max_digits=18, decimal_places=4)

    class Meta:
        unique_together = ("company", "fiscal_year", "account", "cost_center", "period_start")
