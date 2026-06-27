"""Sales documents — Tax Invoice + Credit Note. Each line carries its own GST split."""
from decimal import Decimal

from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel
from apps.masters.models import Company, FiscalYear, Item, Party
from apps.masters.tax import SUPPLY_STANDARD, SUPPLY_TYPE_CHOICES


class Invoice(TimeStampedModel):
    """Sales Tax Invoice. Posts a JournalEntry on save (status -> POSTED)."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"
        CANCELLED = "CANCELLED", "Cancelled"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="invoices")
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT, related_name="invoices")
    invoice_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    due_date = models.DateField(null=True, blank=True)

    customer = models.ForeignKey(Party, on_delete=models.PROTECT, related_name="invoices")
    place_of_supply = models.CharField(max_length=2, help_text="Buyer state code")
    currency = models.CharField(max_length=3, default="INR")
    fx_rate = models.DecimalField(max_digits=18, decimal_places=6, default=1,
                                   help_text="1 unit foreign = this many INR. 1 for INR.")
    notes = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)

    # Cached totals (recomputed on save via service)
    taxable_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    vat = models.DecimalField(max_digits=18, decimal_places=4, default=0)  # GCC VAT
    grand_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    amount_paid = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    journal_entry = models.OneToOneField(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+",
    )

    # Automation trackers
    last_reminder_at = models.DateTimeField(null=True, blank=True,
        help_text="Last overdue reminder sent")
    reminder_count = models.IntegerField(default=0)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "invoice_no")
        ordering = ("-date", "-id")

    def __str__(self) -> str:
        return f"{self.invoice_no} ({self.customer.name})"

    @property
    def balance_due(self) -> Decimal:
        return self.grand_total - self.amount_paid

    @property
    def is_paid(self) -> bool:
        return self.balance_due <= Decimal("0")


class InvoiceLine(TimeStampedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(Item, null=True, blank=True, on_delete=models.PROTECT)
    description = models.CharField(max_length=255)
    hsn_code = models.CharField(max_length=10, blank=True)
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    supply_type = models.CharField(
        max_length=12, choices=SUPPLY_TYPE_CHOICES, default=SUPPLY_STANDARD,
        help_text="GCC VAT supply type. Ignored under India GST.",
    )

    # Computed
    taxable_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    vat = models.DecimalField(max_digits=18, decimal_places=4, default=0)  # GCC VAT
    line_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    class Meta:
        ordering = ("id",)


class Quotation(TimeStampedModel):
    """Sales Quotation / Estimate. Non-posting (no JE). Can convert to Sales Order."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SENT = "SENT", "Sent"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        EXPIRED = "EXPIRED", "Expired"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="quotations")
    quote_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    valid_until = models.DateField(null=True, blank=True)
    customer = models.ForeignKey(Party, on_delete=models.PROTECT, related_name="quotations")
    notes = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    grand_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "quote_no")
        ordering = ("-date", "-id")

    def __str__(self) -> str:
        return f"QUO {self.quote_no}"


class QuotationLine(TimeStampedModel):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(Item, null=True, blank=True, on_delete=models.PROTECT)
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)


class SalesOrder(TimeStampedModel):
    """Sales Order. Non-posting. Converts to Invoice."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        CONFIRMED = "CONFIRMED", "Confirmed"
        DELIVERED = "DELIVERED", "Delivered"
        INVOICED = "INVOICED", "Invoiced"
        CANCELLED = "CANCELLED", "Cancelled"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="sales_orders")
    so_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    customer = models.ForeignKey(Party, on_delete=models.PROTECT, related_name="sales_orders")
    quotation = models.ForeignKey(Quotation, null=True, blank=True, on_delete=models.SET_NULL)
    place_of_supply = models.CharField(max_length=2, blank=True)
    notes = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.CONFIRMED)
    grand_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "so_no")
        ordering = ("-date", "-id")

    def __str__(self) -> str:
        return f"SO {self.so_no}"


class SalesOrderLine(TimeStampedModel):
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(Item, null=True, blank=True, on_delete=models.PROTECT)
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)


class RecurringInvoiceTemplate(TimeStampedModel):
    """Recurring invoice template — Celery beat materializes invoices."""

    class Frequency(models.TextChoices):
        WEEKLY = "WEEKLY", "Weekly"
        MONTHLY = "MONTHLY", "Monthly"
        QUARTERLY = "QUARTERLY", "Quarterly"
        YEARLY = "YEARLY", "Yearly"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="recurring_invoices")
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    customer = models.ForeignKey(Party, on_delete=models.PROTECT, related_name="recurring_invoices")
    place_of_supply = models.CharField(max_length=2)
    frequency = models.CharField(max_length=10, choices=Frequency.choices)
    next_run_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    template_json = models.JSONField(help_text="Invoice line template")
    is_active = models.BooleanField(default=True)
    last_invoice = models.ForeignKey("Invoice", null=True, blank=True,
                                     on_delete=models.SET_NULL, related_name="+")
    runs_completed = models.IntegerField(default=0)

    history = HistoricalRecords()

    class Meta:
        ordering = ("next_run_date",)

    def __str__(self) -> str:
        return f"{self.name} ({self.frequency})"


class CreditNote(TimeStampedModel):
    """Reverses a Sales Invoice (return, discount, correction).

    On post, generates a JournalEntry that mirrors the original invoice with
    debits and credits swapped, scaled to the credit amount.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="credit_notes")
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT, related_name="credit_notes")
    note_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="credit_notes")
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)

    # Amount to credit (taxable). Tax is computed using the invoice's rates.
    taxable_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    vat = models.DecimalField(max_digits=18, decimal_places=4, default=0)  # GCC VAT
    grand_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    journal_entry = models.OneToOneField(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+",
    )

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "note_no")
        ordering = ("-date", "-id")

    def __str__(self) -> str:
        return f"CN {self.note_no} (against {self.invoice.invoice_no})"


class ClientDocumentTemplate(TimeStampedModel):
    """Reusable SOW / MSA / NDA HTML templates with client merge fields."""

    class DocType(models.TextChoices):
        SOW = "sow", "Statement of Work (SOW)"
        MSA = "msa", "Master Service Agreement (MSA)"
        NDA = "nda", "Non-Disclosure Agreement (NDA)"
        CUSTOM = "custom", "Custom"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="client_doc_templates")
    doc_type = models.CharField(max_length=20, choices=DocType.choices, default=DocType.SOW)
    name = models.CharField(max_length=255)
    template_html = models.TextField(help_text="Jinja2 HTML. Vars: company, customer, quotation, project_name, milestones, …")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("doc_type", "name")
        unique_together = ("company", "doc_type", "name")

    def __str__(self) -> str:
        return f"{self.get_doc_type_display()} — {self.name}"


class ClientDocument(TimeStampedModel):
    """Generated client contract / SOW document (non-posting)."""

    class DocType(models.TextChoices):
        SOW = "sow", "Statement of Work (SOW)"
        MSA = "msa", "Master Service Agreement (MSA)"
        NDA = "nda", "Non-Disclosure Agreement (NDA)"
        CUSTOM = "custom", "Custom"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FINAL = "FINAL", "Final"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="client_documents")
    template = models.ForeignKey(
        ClientDocumentTemplate, null=True, blank=True, on_delete=models.SET_NULL, related_name="documents"
    )
    doc_type = models.CharField(max_length=20, choices=DocType.choices, default=DocType.SOW)
    doc_no = models.CharField(max_length=40, db_index=True)
    title = models.CharField(max_length=255)
    customer = models.ForeignKey(Party, on_delete=models.PROTECT, related_name="client_documents")
    quotation = models.ForeignKey(
        Quotation, null=True, blank=True, on_delete=models.SET_NULL, related_name="client_documents"
    )
    sales_order = models.ForeignKey(
        SalesOrder, null=True, blank=True, on_delete=models.SET_NULL, related_name="client_documents"
    )
    body_html = models.TextField(blank=True)
    extra_context = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("company", "doc_no")
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.doc_no} — {self.customer.name}"
