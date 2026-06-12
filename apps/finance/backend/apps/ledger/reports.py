"""Read-only report builders. All reports derive from JournalLine — never recomputed.

Phase 0 ships Trial Balance only. P&L, Balance Sheet, Cash Flow come in Phase 1.
"""
from decimal import Decimal

from django.db.models import Sum

from apps.masters.models import Account

from .models import JournalEntry, JournalLine


def trial_balance(company_id: int, as_of=None) -> list[dict]:
    """Sum debits and credits per account up to a given date.

    Returns one row per postable account with a non-zero balance.
    """
    qs = JournalLine.objects.filter(
        journal_entry__company_id=company_id,
        journal_entry__status=JournalEntry.Status.POSTED,
        account__is_postable=True,
    )
    if as_of is not None:
        qs = qs.filter(journal_entry__date__lte=as_of)

    grouped = (
        qs.values("account_id", "account__code", "account__name", "account__type")
        .annotate(total_debit=Sum("debit"), total_credit=Sum("credit"))
        .order_by("account__code")
    )

    out = []
    for row in grouped:
        d = row["total_debit"] or Decimal("0")
        c = row["total_credit"] or Decimal("0")
        balance = d - c
        if balance == 0:
            continue
        out.append(
            {
                "account_id": row["account_id"],
                "code": row["account__code"],
                "name": row["account__name"],
                "type": row["account__type"],
                "debit": d,
                "credit": c,
                "balance": balance,
            }
        )
    return out


def all_accounts_with_zero(company_id: int) -> list[dict]:
    """Helper for the COA tree UI — every account including zero-balance ones."""
    accounts = Account.objects.filter(company_id=company_id, is_active=True).order_by("code")
    return [
        {"id": a.id, "code": a.code, "name": a.name, "type": a.type, "is_postable": a.is_postable}
        for a in accounts
    ]
