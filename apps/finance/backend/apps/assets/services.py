"""Depreciation runner — call monthly via Celery beat."""
from datetime import date as _date
from decimal import Decimal

from django.db import transaction

from apps.core.money import to_money
from apps.ledger.posting import Cr, Dr, LedgerService
from apps.masters.models import FiscalYear

from .models import DepreciationEntry, FixedAsset


def _monthly_amount(asset: FixedAsset) -> Decimal:
    """Compute one month's depreciation."""
    if asset.method == FixedAsset.Method.SLM:
        annual = (asset.purchase_cost - asset.salvage_value) / asset.useful_life_years
        return (annual / Decimal("12")).quantize(Decimal("0.0001"))
    # WDV
    annual = asset.current_book_value * asset.wdv_rate / Decimal("100")
    return (annual / Decimal("12")).quantize(Decimal("0.0001"))


@transaction.atomic
def run_depreciation_for_asset(asset: FixedAsset, *, period_end: _date,
                                fiscal_year: FiscalYear, user=None) -> DepreciationEntry:
    if asset.is_disposed:
        raise ValueError("Asset is disposed.")
    if asset.last_depreciated and asset.last_depreciated >= period_end:
        raise ValueError("Already depreciated up to this period.")

    amount = _monthly_amount(asset)
    if amount <= 0:
        return None
    # Don't depreciate below salvage value
    new_book = asset.current_book_value - amount
    if new_book < asset.salvage_value:
        amount = asset.current_book_value - asset.salvage_value
        if amount <= 0:
            return None
        new_book = asset.salvage_value

    je = LedgerService().post_manual(
        company=asset.company, fiscal_year=fiscal_year,
        voucher_no=f"DEP-{asset.code}-{period_end.isoformat()}",
        entry_date=period_end,
        narration=f"Depreciation: {asset.name}",
        lines=[
            Dr(asset.expense_account, amount, description=f"Depr {asset.name}"),
            Cr(asset.accum_depr_account, amount, description=f"Depr {asset.name}"),
        ],
        user=user,
    )
    entry = DepreciationEntry.objects.create(
        asset=asset, period_end=period_end, amount=amount, journal_entry=je,
    )
    asset.current_book_value = new_book
    asset.accumulated_depreciation += amount
    asset.last_depreciated = period_end
    asset.save(update_fields=["current_book_value", "accumulated_depreciation",
                               "last_depreciated", "updated_at"])
    return entry


def run_monthly_depreciation(company_id: int, period_end: _date,
                              fiscal_year: FiscalYear, user=None) -> int:
    count = 0
    for asset in FixedAsset.objects.filter(company_id=company_id, is_disposed=False):
        try:
            run_depreciation_for_asset(asset, period_end=period_end,
                                        fiscal_year=fiscal_year, user=user)
            count += 1
        except ValueError:
            continue
    return count
