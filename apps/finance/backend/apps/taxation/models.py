"""E-Invoice IRN cache + E-Way Bill cache + GSTR-2B reconciliation records.

Real NIC IRP / EWB API calls are stubbed behind a feature flag — these models
store IRNs/EWB numbers once obtained (sandbox or live).
"""
from django.db import models

from apps.core.models import TimeStampedModel
from apps.masters.models import Company


class EInvoiceIRN(TimeStampedModel):
    """One-to-one with Invoice — IRN + signed QR returned by NIC IRP."""
    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    invoice = models.OneToOneField("billing.Invoice", on_delete=models.CASCADE, related_name="einvoice")
    irn = models.CharField(max_length=64, db_index=True)
    ack_no = models.CharField(max_length=40, blank=True)
    ack_date = models.DateTimeField(null=True, blank=True)
    signed_qr = models.TextField()
    signed_invoice = models.TextField(blank=True)
    status = models.CharField(max_length=20, default="ACTIVE")

    def __str__(self):
        return f"IRN {self.irn}"


class GccEInvoice(TimeStampedModel):
    """GCC e-invoice document — KSA ZATCA Fatoora or UAE Peppol PINT AE.

    Stores the generated UBL XML, invoice hash + PIH chain, and (for ZATCA) the
    base64 TLV QR. Real clearance/delivery needs CSID certificates (ZATCA) or an
    Accredited Service Provider (Peppol); those run behind feature flags.
    """

    class Scheme(models.TextChoices):
        ZATCA = "ZATCA", "KSA ZATCA Fatoora"
        PEPPOL_PINT_AE = "PEPPOL_PINT_AE", "UAE Peppol PINT AE"

    class Status(models.TextChoices):
        GENERATED = "GENERATED", "Generated"
        SIGNED = "SIGNED", "Signed"
        CLEARED = "CLEARED", "Cleared"
        REPORTED = "REPORTED", "Reported"
        FAILED = "FAILED", "Failed"

    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    invoice = models.OneToOneField("billing.Invoice", on_delete=models.CASCADE, related_name="gcc_einvoice")
    scheme = models.CharField(max_length=16, choices=Scheme.choices)
    uuid = models.CharField(max_length=64, db_index=True)
    invoice_hash = models.CharField(max_length=128, blank=True)
    previous_hash = models.CharField(max_length=128, blank=True,
                                     help_text="PIH — previous invoice hash (ZATCA chain)")
    xml = models.TextField(blank=True)
    qr = models.TextField(blank=True, help_text="ZATCA base64 TLV QR payload")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.GENERATED)
    cleared_at = models.DateTimeField(null=True, blank=True)
    response = models.TextField(blank=True, help_text="Gateway / ASP response")

    def __str__(self):
        return f"{self.scheme} {self.uuid}"


class EWayBill(TimeStampedModel):
    """E-Way Bill against an invoice."""
    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    invoice = models.ForeignKey("billing.Invoice", on_delete=models.CASCADE, related_name="eway_bills")
    eway_no = models.CharField(max_length=40, db_index=True)
    generated_on = models.DateTimeField()
    valid_until = models.DateTimeField()
    distance_km = models.IntegerField()
    vehicle_no = models.CharField(max_length=20, blank=True)
    transporter_id = models.CharField(max_length=20, blank=True)
    transporter_name = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, default="ACTIVE")

    def __str__(self):
        return f"EWB {self.eway_no}"


class GSTR2BLine(TimeStampedModel):
    """One row per vendor invoice as fetched from GST portal GSTR-2B JSON.
    Used for ITC reconciliation against locally booked Vendor Bills.
    """
    class MatchStatus(models.TextChoices):
        UNMATCHED = "UNMATCHED", "Unmatched"
        MATCHED = "MATCHED", "Matched"
        DISPUTED = "DISPUTED", "Disputed"

    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    return_period = models.CharField(max_length=7, db_index=True, help_text="MMYYYY")
    supplier_gstin = models.CharField(max_length=15, db_index=True)
    supplier_name = models.CharField(max_length=255)
    invoice_no = models.CharField(max_length=40)
    invoice_date = models.DateField()
    taxable = models.DecimalField(max_digits=18, decimal_places=4)
    cgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    matched_bill = models.ForeignKey(
        "procurement.VendorBill", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="gstr2b_matches",
    )
    match_status = models.CharField(max_length=10, choices=MatchStatus.choices,
                                     default=MatchStatus.UNMATCHED)

    class Meta:
        unique_together = ("company", "return_period", "supplier_gstin", "invoice_no")


# ── TDS ────────────────────────────────────────────────────────────────────

TDS_SECTIONS = [
    ("194C", "194C – Contractor / Sub-contractor (1% individual, 2% others)"),
    ("194J", "194J – Professional / Technical Services (10%)"),
    ("194H", "194H – Commission / Brokerage (5%)"),
    ("194I", "194I – Rent (10% plant/machinery, 10% land/building)"),
    ("194A", "194A – Interest other than securities (10%)"),
    ("194B", "194B – Lottery / Puzzle (30%)"),
    ("194D", "194D – Insurance Commission (5%)"),
    ("194Q", "194Q – Purchase of Goods above ₹50L (0.1%)"),
    ("194R", "194R – Perquisite / Benefit to Resident (10%)"),
    ("195",  "195 – Payment to Non-Resident (rates vary)"),
    ("OTHER", "Other Section"),
]

TDS_DEFAULT_RATES = {
    "194C": "2.00", "194J": "10.00", "194H": "5.00",
    "194I": "10.00", "194A": "10.00", "194B": "30.00",
    "194D": "5.00", "194Q": "0.10", "194R": "10.00",
    "195": "20.00", "OTHER": "0.00",
}


class TDSDeduction(TimeStampedModel):
    """TDS deducted on a vendor bill or payment."""

    class Quarter(models.TextChoices):
        Q1 = "Q1", "Q1 (Apr–Jun)"
        Q2 = "Q2", "Q2 (Jul–Sep)"
        Q3 = "Q3", "Q3 (Oct–Dec)"
        Q4 = "Q4", "Q4 (Jan–Mar)"

    company     = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="tds_deductions")
    vendor_bill = models.ForeignKey(
        "procurement.VendorBill", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="tds_deductions",
    )
    section     = models.CharField(max_length=10, choices=TDS_SECTIONS)
    rate        = models.DecimalField(max_digits=6, decimal_places=2)
    base_amount = models.DecimalField(max_digits=18, decimal_places=4)
    tds_amount  = models.DecimalField(max_digits=18, decimal_places=4)
    deduction_date = models.DateField()
    pan         = models.CharField(max_length=10, blank=True, help_text="Vendor PAN")
    fy          = models.CharField(max_length=7, help_text="e.g. 2025-26")
    quarter     = models.CharField(max_length=2, choices=Quarter.choices)
    challan_no  = models.CharField(max_length=40, blank=True)
    deposited_date = models.DateField(null=True, blank=True)
    is_deposited = models.BooleanField(default=False)
    notes       = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("-deduction_date",)

    def __str__(self):
        return f"TDS {self.section} ₹{self.tds_amount} on {self.deduction_date}"
