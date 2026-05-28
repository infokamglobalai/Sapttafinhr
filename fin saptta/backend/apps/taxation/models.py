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
