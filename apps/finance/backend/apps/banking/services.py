"""Bank statement import + auto-reconciliation."""
import csv
import io
from datetime import date as _date, datetime
from decimal import Decimal

from django.db import transaction

from apps.core.money import to_money
from apps.ledger.models import JournalEntry, JournalLine

from .models import BankAccount, BankStatement, BankStatementLine


def parse_csv_statement(file_bytes: bytes) -> list[dict]:
    """Expected CSV columns: date, description, reference, debit, credit, balance.
    Date format DD-MM-YYYY or YYYY-MM-DD.
    """
    text = file_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for r in reader:
        date_str = (r.get("date") or "").strip()
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
            try:
                d = datetime.strptime(date_str, fmt).date()
                break
            except ValueError:
                continue
        else:
            continue
        rows.append({
            "date": d,
            "description": (r.get("description") or "").strip(),
            "reference": (r.get("reference") or "").strip(),
            "debit": to_money(r.get("debit") or "0"),
            "credit": to_money(r.get("credit") or "0"),
            "balance": to_money(r.get("balance") or "0"),
        })
    return rows


@transaction.atomic
def import_statement(*, bank_account: BankAccount, file_bytes: bytes,
                     period_start: _date, period_end: _date,
                     opening: Decimal, closing: Decimal) -> BankStatement:
    stmt = BankStatement.objects.create(
        bank_account=bank_account, period_start=period_start, period_end=period_end,
        opening_balance=to_money(opening), closing_balance=to_money(closing),
    )
    rows = parse_csv_statement(file_bytes)
    for r in rows:
        BankStatementLine.objects.create(statement=stmt, **r)
    return stmt


def auto_reconcile(bank_account: BankAccount) -> dict:
    """Match unmatched statement lines against unreconciled JE lines on the
    bank's ledger account, by (date ±2 days) + (amount)."""
    matched = 0
    unmatched_lines = BankStatementLine.objects.filter(
        statement__bank_account=bank_account,
        status=BankStatementLine.Status.UNMATCHED,
    )
    for stmt_line in unmatched_lines:
        # Statement: credit on stmt means money IN (Dr in our ledger)
        target_amount = stmt_line.credit if stmt_line.credit > 0 else stmt_line.debit
        target_side = "debit" if stmt_line.credit > 0 else "credit"

        candidates = JournalLine.objects.filter(
            account=bank_account.ledger_account,
            journal_entry__status=JournalEntry.Status.POSTED,
            journal_entry__date__range=(stmt_line.date.replace(day=max(1, stmt_line.date.day - 2))
                                        if stmt_line.date.day > 2 else stmt_line.date,
                                        stmt_line.date),
            bank_matches__isnull=True,
        )
        for c in candidates:
            amount = c.debit if target_side == "debit" else c.credit
            if amount == target_amount and amount > 0:
                stmt_line.matched_journal_line = c
                stmt_line.status = BankStatementLine.Status.MATCHED
                stmt_line.save(update_fields=["matched_journal_line", "status", "updated_at"])
                matched += 1
                break

    return {"matched": matched, "total_unmatched": unmatched_lines.count() - matched}
