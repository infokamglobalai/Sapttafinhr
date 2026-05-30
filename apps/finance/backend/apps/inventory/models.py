"""Inventory: Warehouse + Bin + Batch + Serial + Movement + StockLevel.

Movement is the only source of truth for on-hand qty — every Stock In / Out /
Transfer creates a Movement record. StockLevel is denormalized for fast reads.

Valuation: FIFO or Weighted Average, chosen per company.
"""
from decimal import Decimal

from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel
from apps.masters.models import Company, Item


class Warehouse(TimeStampedModel):
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="warehouses")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("company", "code")

    def __str__(self):
        return f"{self.code} — {self.name}"


class Bin(TimeStampedModel):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="bins")
    code = models.CharField(max_length=20)

    class Meta:
        unique_together = ("warehouse", "code")


class Batch(TimeStampedModel):
    """Batch (for FMCG/pharma) + optional expiry."""
    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="batches")
    batch_no = models.CharField(max_length=40, db_index=True)
    expiry_date = models.DateField(null=True, blank=True, db_index=True)
    manufactured_date = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("item", "batch_no")


class SerialNumber(TimeStampedModel):
    """Serial number (for electronics, machinery)."""
    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="serials")
    serial_no = models.CharField(max_length=64, db_index=True)
    warehouse = models.ForeignKey(Warehouse, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, default="IN_STOCK",
                               help_text="IN_STOCK / SOLD / SCRAPPED")

    class Meta:
        unique_together = ("item", "serial_no")


class StockMovement(TimeStampedModel):
    """Append-only ledger of stock changes. Quantity sign convention:
        +ve = stock IN (purchase, return, transfer-in, adjustment up)
        -ve = stock OUT (sale, transfer-out, adjustment down, scrap)
    """

    class Kind(models.TextChoices):
        OPENING = "OPENING", "Opening Balance"
        PURCHASE = "PURCHASE", "Purchase"
        SALE = "SALE", "Sale"
        TRANSFER_OUT = "XFER_OUT", "Transfer Out"
        TRANSFER_IN = "XFER_IN", "Transfer In"
        ADJUSTMENT = "ADJUST", "Adjustment"
        SCRAP = "SCRAP", "Scrap"
        RETURN_IN = "RTN_IN", "Sales Return In"
        RETURN_OUT = "RTN_OUT", "Purchase Return Out"

    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    date = models.DateField(db_index=True)
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="movements")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name="movements")
    bin = models.ForeignKey(Bin, null=True, blank=True, on_delete=models.SET_NULL)
    batch = models.ForeignKey(Batch, null=True, blank=True, on_delete=models.SET_NULL)
    serial = models.ForeignKey(SerialNumber, null=True, blank=True, on_delete=models.SET_NULL)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    quantity = models.DecimalField(max_digits=18, decimal_places=4)
    unit_cost = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    reference = models.CharField(max_length=80, blank=True,
                                  help_text="Linked voucher (Invoice, Bill, etc.)")
    journal_entry = models.ForeignKey(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+",
    )
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("-date", "-id")
        indexes = [
            models.Index(fields=["item", "warehouse"]),
            models.Index(fields=["date", "kind"]),
        ]


class StockLevel(TimeStampedModel):
    """Denormalized on-hand qty per item × warehouse. Updated by movements."""
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="stock_levels")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    on_hand = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    avg_cost = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    reorder_level = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    class Meta:
        unique_together = ("item", "warehouse")
