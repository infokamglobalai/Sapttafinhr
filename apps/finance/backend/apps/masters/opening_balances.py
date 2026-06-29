"""Opening-balance import: a trial balance → one balanced opening journal entry.

A migrating customer pastes their closing trial balance (per-account debit/credit)
as a CSV. We validate each line against the chart of accounts, confirm the whole
thing balances (ΣDr == ΣCr — the non-negotiable double-entry invariant), and, on
commit, post a *single* opening journal entry dated at the fiscal-year start via
the ledger's one true posting path (LedgerService.post_manual). Dry-run by
default, idempotent on the opening voucher so it can't be posted twice.

Ledger imports are done lazily inside functions: masters is imported *by* the
ledger (posting.py → masters.models), so importing the ledger at module top
here would create a cycle.
"""
from __future__ import annotations

import csv
import io
from decimal import Decimal, InvalidOperation

OPENING_COLUMNS = ["account_code", "debit", "credit", "description"]

OPENING_EXAMPLE_ROWS = [
    {"account_code": "1110", "debit": "500000", "credit": "", "description": "Cash & bank brought forward"},
    {"account_code": "2110", "debit": "", "credit": "500000", "description": "Capital brought forward"},
]


def opening_template_csv() -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=OPENING_COLUMNS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(OPENING_EXAMPLE_ROWS)
    return buf.getvalue()


def _money(raw: str) -> Decimal:
    """Parse a money cell (commas tolerated). Blank → 0. Raises on garbage."""
    s = (raw or "").strip().replace(",", "")
    if not s:
        return Decimal("0")
    return Decimal(s)


def opening_voucher_no(fiscal_year) -> str:
    return f"OPENING-{fiscal_year.name}"


def run_opening_balances(*, company, fiscal_year, rows: list[dict], commit: bool = False, user=None) -> dict:
    """Validate a trial-balance CSV and (optionally) post the opening JE.

    Returns a report: per-row status, ΣDr/ΣCr totals, a ``balanced`` flag, and
    ``posted_voucher`` when committed. Commit is all-or-nothing: it posts only if
    every row is valid, the totals balance, and no opening entry exists yet.
    """
    from .models import Account  # local: avoid import cycle at load time

    code_to_account = {a.code: a for a in Account.objects.filter(company=company)}

    report_rows: list[dict] = []
    line_specs: list[tuple] = []   # (account, debit, credit, description)
    total_debit = Decimal("0")
    total_credit = Decimal("0")

    for line_no, raw in enumerate(rows, start=2):  # row 1 is the header
        code = (raw.get("account_code") or "").strip()
        label = code or "(blank)"
        messages: list[str] = []

        if not code:
            report_rows.append({"row": line_no, "status": "error", "messages": ["account_code is required"], "label": label})
            continue

        account = code_to_account.get(code)
        try:
            debit = _money(raw.get("debit", ""))
            credit = _money(raw.get("credit", ""))
        except (InvalidOperation, ValueError):
            report_rows.append({"row": line_no, "status": "error", "messages": ["debit/credit must be numbers"], "label": label})
            continue

        if account is None:
            messages.append(f"account_code '{code}' not found in the chart of accounts")
        elif not account.is_postable:
            messages.append(f"account '{code}' is a group/header account — only postable accounts take balances")
        if debit < 0 or credit < 0:
            messages.append("debit/credit cannot be negative")
        if debit > 0 and credit > 0:
            messages.append("a line cannot have both a debit and a credit")
        if debit == 0 and credit == 0:
            messages.append("enter a debit or a credit")

        if messages:
            report_rows.append({"row": line_no, "status": "error", "messages": messages, "label": label})
            continue

        total_debit += debit
        total_credit += credit
        line_specs.append((account, debit, credit, (raw.get("description") or "").strip()))
        report_rows.append({"row": line_no, "status": "ok", "messages": [], "label": label})

    errors = sum(1 for r in report_rows if r["status"] == "error")
    balanced = errors == 0 and total_debit == total_credit and total_debit > 0
    difference = total_debit - total_credit

    report = {
        "kind": "opening-balances",
        "company": company.pk,
        "fiscal_year": fiscal_year.name,
        "commit": commit,
        "total_rows": len(rows),
        "ok": sum(1 for r in report_rows if r["status"] == "ok"),
        "errors": errors,
        "total_debit": str(total_debit),
        "total_credit": str(total_credit),
        "difference": str(difference),
        "balanced": balanced,
        "posted_voucher": None,
        "rows": report_rows,
    }

    if not commit:
        return report

    # ── Commit path ──────────────────────────────────────────────────────────
    from apps.ledger.models import JournalEntry
    from apps.ledger.posting import Cr, Dr, LedgerService

    voucher = opening_voucher_no(fiscal_year)
    if JournalEntry.objects.filter(company=company, voucher_no=voucher).exists():
        report["error"] = f"An opening entry ({voucher}) already exists for this fiscal year."
        return report
    if not balanced:
        report["error"] = (
            "Cannot post: the trial balance does not balance "
            f"(ΣDr {total_debit} vs ΣCr {total_credit}, difference {difference})."
            if errors == 0 else "Cannot post while rows have errors."
        )
        return report

    lines = []
    for account, debit, credit, desc in line_specs:
        lines.append(Dr(account, debit, desc) if debit > 0 else Cr(account, credit, desc))

    je = LedgerService().post_manual(
        company=company,
        fiscal_year=fiscal_year,
        voucher_no=voucher,
        entry_date=fiscal_year.start_date,
        narration="Opening balances (imported trial balance)",
        lines=lines,
        user=user,
    )
    report["posted_voucher"] = je.voucher_no
    return report
