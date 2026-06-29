"""Tenant-scoped master data: Company, Branch, FiscalYear, Account (COA), Party."""
from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel

SUPPORTED_CURRENCIES = [
    ("INR", "Indian Rupee"), ("USD", "US Dollar"), ("EUR", "Euro"),
    ("GBP", "British Pound"), ("AED", "UAE Dirham"), ("SGD", "Singapore Dollar"),
    ("AUD", "Australian Dollar"), ("CAD", "Canadian Dollar"), ("JPY", "Japanese Yen"),
    ("CNY", "Chinese Yuan"),
    # GCC currencies (tax-jurisdiction localization)
    ("SAR", "Saudi Riyal"), ("QAR", "Qatari Riyal"), ("KWD", "Kuwaiti Dinar"),
    ("BHD", "Bahraini Dinar"), ("OMR", "Omani Rial"),
]


class Company(TimeStampedModel):
    """A legal entity within a tenant. A tenant may have multiple companies."""

    class TaxRegime(models.TextChoices):
        INDIA_GST = "INDIA_GST", "India — GST"
        GCC_VAT = "GCC_VAT", "GCC — VAT"
        NONE = "NONE", "No indirect tax"

    name = models.CharField(max_length=200)
    legal_name = models.CharField(max_length=255, blank=True)
    gstin = models.CharField(max_length=15, blank=True, db_index=True)
    pan = models.CharField(max_length=10, blank=True)
    state_code = models.CharField(max_length=2, blank=True, help_text="Indian state code (GST)")
    base_currency = models.CharField(max_length=3, default="INR")

    # Tax jurisdiction (Region setting). Defaults keep existing companies on the
    # India/GST path so behaviour is unchanged until a country is chosen.
    country = models.CharField(max_length=2, default="IN", help_text="ISO country code")
    tax_regime = models.CharField(
        max_length=12, choices=TaxRegime.choices, default=TaxRegime.INDIA_GST
    )
    tax_id = models.CharField(
        max_length=20, blank=True,
        help_text="VAT registration number (TRN) for GCC. GSTIN stays in its own field for India.",
    )
    standard_vat_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Standard VAT rate for the jurisdiction (GCC). Unused for India GST.",
    )

    # Document branding — applied to generated invoices, receipts and reports.
    # The logo is stored as a small base64 data URL so it embeds straight into
    # the client-side PDF/print pipeline without per-tenant media storage.
    class DocTemplate(models.TextChoices):
        CLASSIC = "CLASSIC", "Classic"
        MODERN = "MODERN", "Modern"

    logo = models.TextField(blank=True, help_text="Company logo as a base64 data URL (PNG/JPG/SVG).")
    document_header = models.CharField(
        max_length=120, blank=True,
        help_text="Short note shown under the company name on documents (e.g. tagline).",
    )
    document_footer = models.CharField(
        max_length=240, blank=True,
        help_text="Footer note shown at the bottom of documents (terms, thanks, etc.).",
    )
    brand_color = models.CharField(
        max_length=7, blank=True,
        help_text="Accent colour as hex (e.g. #4f46e5) for document headings and table headers.",
    )
    document_template = models.CharField(
        max_length=8, choices=DocTemplate.choices, default=DocTemplate.CLASSIC,
        help_text="Layout style applied to generated documents.",
    )

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


class SalesLead(TimeStampedModel):
    """CRM lite — sales opportunity tied to an optional Finance Party (customer)."""

    class Stage(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        PROPOSAL = "proposal", "Proposal sent"
        NEGOTIATION = "negotiation", "Negotiation"
        WON = "won", "Won"
        LOST = "lost", "Lost"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="sales_leads")
    party = models.ForeignKey(
        Party, null=True, blank=True, on_delete=models.SET_NULL, related_name="sales_leads",
        help_text="Linked customer/vendor master record when the prospect is in Parties.",
    )
    title = models.CharField(max_length=255, help_text="Deal or opportunity name")
    contact_name = models.CharField(max_length=200, blank=True)
    organization = models.CharField(max_length=255, blank=True, help_text="Prospect company name")
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.NEW, db_index=True)
    expected_value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    next_follow_up = models.DateField(null=True, blank=True, db_index=True)
    source = models.CharField(max_length=80, blank=True, help_text="e.g. referral, inbound, event")
    notes = models.TextField(blank=True)
    lost_reason = models.CharField(max_length=255, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-updated_at",)
        indexes = [
            models.Index(fields=["company", "stage"]),
            models.Index(fields=["company", "next_follow_up"]),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def display_name(self) -> str:
        return self.organization or self.contact_name or self.title


class LeadActivity(TimeStampedModel):
    """Follow-up log on a sales lead."""

    class ActivityType(models.TextChoices):
        NOTE = "note", "Note"
        CALL = "call", "Call"
        EMAIL = "email", "Email"
        MEETING = "meeting", "Meeting"

    lead = models.ForeignKey(SalesLead, on_delete=models.CASCADE, related_name="activities")
    activity_type = models.CharField(max_length=20, choices=ActivityType.choices, default=ActivityType.NOTE)
    summary = models.TextField()
    activity_at = models.DateTimeField()
    created_by = models.ForeignKey(
        "identity.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ("-activity_at",)

    def __str__(self) -> str:
        return f"{self.get_activity_type_display()} — {self.lead_id}"


class NumberSeries(TimeStampedModel):
    """Per-company document numbering format (prefix + zero-padded running number).

    The next number is *derived* from the highest existing document of that type
    for the company (see masters.numbering.peek_next), so it stays correct without
    a stored counter to drift — and needs no changes to the document create flows.
    """

    class DocType(models.TextChoices):
        INVOICE = "invoice", "Tax Invoice"
        CREDIT_NOTE = "credit_note", "Credit Note"
        QUOTATION = "quotation", "Quotation"
        SALES_ORDER = "sales_order", "Sales Order"
        PURCHASE_ORDER = "purchase_order", "Purchase Order"
        VENDOR_BILL = "vendor_bill", "Vendor Bill"
        RECEIPT = "receipt", "Customer Receipt"
        VENDOR_PAYMENT = "vendor_payment", "Vendor Payment"
        CLIENT_DOCUMENT = "client_document", "Client Document"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="number_series")
    doc_type = models.CharField(max_length=20, choices=DocType.choices)
    prefix = models.CharField(max_length=20, blank=True, default="", help_text="e.g. INV- or INV/2025/")
    padding = models.PositiveSmallIntegerField(default=4, help_text="Zero-pad the running number to this width")
    start_number = models.PositiveIntegerField(default=1, help_text="First number to use when none exist yet")
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("company", "doc_type")
        verbose_name_plural = "Number series"

    def __str__(self) -> str:
        return f"{self.company.name} · {self.get_doc_type_display()} ({self.prefix})"

    def format(self, n: int) -> str:
        return f"{self.prefix}{str(n).zfill(self.padding)}"


class ExchangeRate(TimeStampedModel):
    """Daily exchange rate: 1 unit of `currency` = `rate` INR."""

    company  = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="exchange_rates")
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    rate     = models.DecimalField(max_digits=18, decimal_places=6, help_text="1 unit = X INR")
    date     = models.DateField(db_index=True)
    source   = models.CharField(max_length=40, default="manual",
                                 help_text="manual | rbi | fixer")

    class Meta:
        unique_together = ("company", "currency", "date")
        ordering = ("-date",)

    def __str__(self):
        return f"1 {self.currency} = {self.rate} INR on {self.date}"
