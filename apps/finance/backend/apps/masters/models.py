"""Tenant-scoped master data: Company, Branch, FiscalYear, Account (COA), Party."""
from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel


class Company(TimeStampedModel):
    """A legal entity within a tenant. A tenant may have multiple companies."""

    name = models.CharField(max_length=200)
    legal_name = models.CharField(max_length=255, blank=True)
    gstin = models.CharField(max_length=15, blank=True, db_index=True)
    pan = models.CharField(max_length=10, blank=True)
    state_code = models.CharField(max_length=2, blank=True, help_text="Indian state code (GST)")
    base_currency = models.CharField(max_length=3, default="INR")
    books_closed_until = models.DateField(null=True, blank=True)
    # First-run setup gate: the Finance app shows the setup wizard until the
    # admin marks this complete. Set by the setup endpoint, not by signup.
    setup_complete = models.BooleanField(default=False)

    history = HistoricalRecords()

    class Meta:
        verbose_name_plural = "Companies"

    def __str__(self) -> str:
        return self.name


class Branch(TimeStampedModel):
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="branches")
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=15, blank=True)

    class Meta:
        unique_together = ("company", "code")
        verbose_name_plural = "Branches"

    def __str__(self) -> str:
        return f"{self.company.name} / {self.name}"


class FiscalYear(TimeStampedModel):
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="fiscal_years")
    name = models.CharField(max_length=20, help_text="e.g. FY2025-26")
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        unique_together = ("company", "name")
        ordering = ["-start_date"]

    def __str__(self) -> str:
        return f"{self.company.name} {self.name}"


class Account(TimeStampedModel):
    """Chart of Accounts — tree structure. Only leaf accounts are postable."""

    class Type(models.TextChoices):
        ASSET = "ASSET", "Asset"
        LIABILITY = "LIABILITY", "Liability"
        EQUITY = "EQUITY", "Equity"
        INCOME = "INCOME", "Income"
        EXPENSE = "EXPENSE", "Expense"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="accounts")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=Type.choices)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="children"
    )
    is_postable = models.BooleanField(default=True, help_text="False for group/header accounts")
    is_active = models.BooleanField(default=True)
    description = models.CharField(max_length=255, blank=True)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "code")
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class CostCenter(TimeStampedModel):
    """Dimension used for cost allocation on JE lines."""
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="cost_centers")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("company", "code")
        ordering = ("code",)

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class Project(TimeStampedModel):
    """Dimension for project-based costing."""
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="projects")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    customer = models.ForeignKey("masters.Party", null=True, blank=True, on_delete=models.SET_NULL)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("company", "code")
        ordering = ("code",)

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class HSNCode(TimeStampedModel):
    """Harmonized System of Nomenclature code (Indian GST). Optional SAC for services."""

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="hsn_codes")
    code = models.CharField(max_length=10, db_index=True)
    description = models.CharField(max_length=255, blank=True)
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        unique_together = ("company", "code")
        verbose_name = "HSN/SAC code"

    def __str__(self) -> str:
        return f"{self.code} ({self.default_tax_rate}%)"


class Item(TimeStampedModel):
    """Product or service that can be sold/bought. Phase 1: minimal fields."""

    class Kind(models.TextChoices):
        GOODS = "GOODS", "Goods"
        SERVICE = "SERVICE", "Service"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="items")
    sku = models.CharField(max_length=40)
    name = models.CharField(max_length=200)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.GOODS)
    description = models.CharField(max_length=500, blank=True)
    hsn = models.ForeignKey(HSNCode, null=True, blank=True, on_delete=models.SET_NULL)
    unit = models.CharField(max_length=20, default="Nos", help_text="UoM, e.g. Nos, Kg, Hrs")
    sale_price = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    purchase_price = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="GST rate %. If 0, uses HSN default.",
    )
    is_active = models.BooleanField(default=True)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "sku")
        ordering = ("name",)

    def __str__(self) -> str:
        return f"{self.sku} — {self.name}"

    @property
    def effective_tax_rate(self):
        if self.tax_rate and self.tax_rate > 0:
            return self.tax_rate
        if self.hsn:
            return self.hsn.default_tax_rate
        return 0


class Party(TimeStampedModel):
    """Unified Customer / Vendor model."""

    class Kind(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        VENDOR = "VENDOR", "Vendor"
        BOTH = "BOTH", "Both"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="parties")
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.CUSTOMER)
    name = models.CharField(max_length=200)
    legal_name = models.CharField(max_length=255, blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    billing_address = models.TextField(blank=True)
    state_code = models.CharField(max_length=2, blank=True)
    credit_limit = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    is_active = models.BooleanField(default=True)

    # Bank details (used when paying vendors / refunding customers)
    bank_account_name = models.CharField(max_length=200, blank=True,
        help_text="Beneficiary name as per bank records")
    bank_account_number = models.CharField(max_length=40, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_ifsc = models.CharField(max_length=11, blank=True)
    bank_branch = models.CharField(max_length=200, blank=True)
    upi_id = models.CharField(max_length=100, blank=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name_plural = "Parties"

    def __str__(self) -> str:
        return self.name

    @property
    def has_bank_details(self) -> bool:
        return bool(self.bank_account_number and self.bank_ifsc)
