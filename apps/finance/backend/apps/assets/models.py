"""Fixed Asset register + Depreciation entries.

Methods supported:
  - SLM (Straight Line) — Cost / useful_life_years
  - WDV (Written Down Value) — opening_value * rate_pct
"""
from decimal import Decimal

from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel
from apps.masters.models import Account, Company


class FixedAsset(TimeStampedModel):
    class Method(models.TextChoices):
        SLM = "SLM", "Straight Line"
        WDV = "WDV", "Written Down Value"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="fixed_assets")
    code = models.CharField(max_length=40, db_index=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=80, blank=True)
    asset_account = models.ForeignKey(Account, on_delete=models.PROTECT,
                                       related_name="fixed_assets",
                                       help_text="Asset GL account (1210, etc.)")
    accum_depr_account = models.ForeignKey(Account, on_delete=models.PROTECT,
                                            related_name="accum_depr_for",
                                            help_text="Accumulated Depreciation account")
    expense_account = models.ForeignKey(Account, on_delete=models.PROTECT,
                                         related_name="depr_expense_for",
                                         help_text="Depreciation expense account")
    purchase_date = models.DateField()
    purchase_cost = models.DecimalField(max_digits=18, decimal_places=4)
    salvage_value = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.SLM)
    useful_life_years = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    wdv_rate = models.DecimalField(max_digits=5, decimal_places=2, default=15)
    current_book_value = models.DecimalField(max_digits=18, decimal_places=4)
    accumulated_depreciation = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    last_depreciated = models.DateField(null=True, blank=True)
    is_disposed = models.BooleanField(default=False)

    history = HistoricalRecords()

    class Meta:
        unique_together = ("company", "code")

    def __str__(self):
        return f"{self.code} {self.name}"


class DepreciationEntry(TimeStampedModel):
    asset = models.ForeignKey(FixedAsset, on_delete=models.CASCADE, related_name="depreciations")
    period_end = models.DateField()
    amount = models.DecimalField(max_digits=18, decimal_places=4)
    journal_entry = models.OneToOneField(
        "ledger.JournalEntry", null=True, blank=True, on_delete=models.SET_NULL, related_name="+",
    )

    class Meta:
        unique_together = ("asset", "period_end")
        ordering = ("period_end",)
