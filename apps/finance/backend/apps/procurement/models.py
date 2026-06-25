"""Purchase Order → Goods Receipt Note → Vendor Bill → Vendor Payment.

3-way match: bill quantities/amounts must reconcile against PO (commitment)
and GRN (actual receipt) before posting.
"""
from decimal import Decimal

from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel
from apps.masters.models import Company, FiscalYear, Item, Party
from apps.masters.tax import SUPPLY_STANDARD, SUPPLY_TYPE_CHOICES


# ---------- Purchase Order ----------

class PurchaseOrder(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"
        CANCELLED = "CANCELLED", "Cancelled"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="purchase_orders")
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT)
    po_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    delivery_date = models.DateField(null=True, blank=True)
    vendor = models.ForeignKey(Party, on_delete=models.PROTECT, related_name="purchase_orders")
    notes = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)

    taxable_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    grand_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "po_no")
        ordering = ("-date", "-id")

    def __str__(self) -> str:
        return f"PO {self.po_no} ({self.vendor.name})"


class PurchaseOrderLine(TimeStampedModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(Item, null=True, blank=True, on_delete=models.PROTECT)
    description = models.CharField(max_length=255)
    hsn_code = models.CharField(max_length=10, blank=True)
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    taxable_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    line_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    received_qty = models.DecimalField(max_digits=18, decimal_places=4, default=0)


# ---------- Goods Receipt Note ----------

class GRN(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        RECEIVED = "RECEIVED", "Received"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="grns")
    grn_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name="grns")
    notes = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.RECEIVED)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "grn_no")
        ordering = ("-date", "-id")

    def __str__(self) -> str:
        return f"GRN {self.grn_no}"


class GRNLine(TimeStampedModel):
    grn = models.ForeignKey(GRN, on_delete=models.CASCADE, related_name="lines")
    po_line = models.ForeignKey(PurchaseOrderLine, on_delete=models.PROTECT, related_name="grn_lines")
    received_qty = models.DecimalField(max_digits=18, decimal_places=4)


# ---------- Vendor Bill ----------

class VendorBill(TimeStampedModel):
    """Bill from vendor. Posts: Dr Expense/Inventory + Dr GST Input, Cr AP."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"
        PAID = "PAID", "Paid"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="vendor_bills")
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT)
    bill_no = models.CharField(max_length=40, db_index=True,
                               help_text="Vendor's bill number")
    date = models.DateField(db_index=True)
    due_date = models.DateField(null=True, blank=True)
    vendor = models.ForeignKey(Party, on_delete=models.PROTECT, related_name="vendor_bills")
    purchase_order = models.ForeignKey(
        PurchaseOrder, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="bills",
    )
    place_of_supply = models.CharField(max_length=2, blank=True)
    rcm_applicable = models.BooleanField(default=False, help_text="Reverse charge")
    notes = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    # Transaction currency. Line amounts/totals are stored in this currency; the
    # GL is posted in the company's base currency using fx_rate (see services).
    currency = models.CharField(max_length=3, default="INR")
    fx_rate = models.DecimalField(
        max_digits=18, decimal_places=6, default=1,
        help_text="1 unit of `currency` = this many base-currency units. 1 when currency == base.")

    taxable_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    vat = models.DecimalField(max_digits=18, decimal_places=4, default=0)  # GCC VAT (input)
    tds_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    grand_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    amount_paid = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    journal_entry = models.OneToOneField(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+",
    )

    # Automation trackers
    last_reminder_at = models.DateTimeField(null=True, blank=True)
    reminder_count = models.IntegerField(default=0)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "vendor", "bill_no")
        ordering = ("-date", "-id")

    def __str__(self) -> str:
        return f"Bill {self.bill_no} from {self.vendor.name}"

    @property
    def balance_due(self) -> Decimal:
        return self.grand_total - self.tds_amount - self.amount_paid


class VendorBillLine(TimeStampedModel):
    bill = models.ForeignKey(VendorBill, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(Item, null=True, blank=True, on_delete=models.PROTECT)
    expense_account = models.ForeignKey(
        "masters.Account", on_delete=models.PROTECT, related_name="vendor_bill_lines",
        help_text="Account to debit (usually an expense or inventory account)",
    )
    po_line = models.ForeignKey(
        PurchaseOrderLine, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="bill_lines",
    )
    description = models.CharField(max_length=255)
    hsn_code = models.CharField(max_length=10, blank=True)
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    supply_type = models.CharField(
        max_length=12, choices=SUPPLY_TYPE_CHOICES, default=SUPPLY_STANDARD,
        help_text="GCC VAT supply type. Ignored under India GST.",
    )
    tds_section = models.CharField(max_length=10, blank=True,
                                   help_text="e.g. 194C, 194J")
    tds_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    taxable_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    vat = models.DecimalField(max_digits=18, decimal_places=4, default=0)  # GCC VAT (input)
    tds_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    line_total = models.DecimalField(max_digits=18, decimal_places=4, default=0)


# ---------- Vendor Payment ----------

class VendorPayment(TimeStampedModel):
    class Mode(models.TextChoices):
        CASH = "CASH", "Cash"
        BANK = "BANK", "Bank"
        UPI = "UPI", "UPI"
        CHEQUE = "CHEQUE", "Cheque"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="vendor_payments")
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT)
    payment_no = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    vendor = models.ForeignKey(Party, on_delete=models.PROTECT, related_name="vendor_payments")
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.BANK)
    reference = models.CharField(max_length=80, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=4)
    # Transaction currency of the payment. Allocations settle bills of the same
    # currency; the GL is posted in base currency using fx_rate, and any
    # difference vs the bill's own fx_rate is realized as FX gain/loss.
    currency = models.CharField(max_length=3, default="INR")
    fx_rate = models.DecimalField(
        max_digits=18, decimal_places=6, default=1,
        help_text="1 unit of `currency` = this many base-currency units. 1 when currency == base.")
    notes = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)

    paid_from_account = models.ForeignKey(
        "masters.Account", on_delete=models.PROTECT, related_name="vendor_payments_from",
    )
    journal_entry = models.OneToOneField(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+",
    )

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "payment_no")
        ordering = ("-date", "-id")

    def __str__(self) -> str:
        return f"{self.payment_no} → {self.vendor.name}"


class VendorPaymentAllocation(TimeStampedModel):
    payment = models.ForeignKey(VendorPayment, on_delete=models.CASCADE, related_name="allocations")
    bill = models.ForeignKey(VendorBill, on_delete=models.PROTECT, related_name="payment_allocations")
    amount = models.DecimalField(max_digits=18, decimal_places=4)
