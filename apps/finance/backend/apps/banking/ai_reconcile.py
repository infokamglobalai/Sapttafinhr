"""AI-powered bank reconciliation.

The existing `services.auto_reconcile` matches by exact amount + date (±2 days).
This module handles the harder cases that exact matching misses:

  - Bank charges / rounding differences (amount within 1%)
  - Description-based matching (e.g. "NEFT VENDOR XYZ" ↔ JE narration "XYZ payment")
  - Reference number in bank description matches JE narration
  - Consolidated payments (one bank line = sum of multiple JE lines)

Flow:
  1. Collect all UNMATCHED bank statement lines for the account.
  2. Collect recent unreconciled JE lines on the bank's GL account.
  3. Send batches to Claude: bank line description + amount vs candidate JE narrations.
  4. Claude picks the best match (or "no_match").
  5. Update BankStatementLine.status and matched_journal_line.

Exposed via AIReconcileView → POST /api/v1/banking/bank-accounts/<id>/ai-reconcile/
"""
from __future__ import annotations

import json
import logging
from datetime import timedelta
from decimal import Decimal

from django.db import transaction

logger = logging.getLogger(__name__)

AMOUNT_TOLERANCE = Decimal("0.01")   # 1% tolerance for bank charges / rounding
MAX_CANDIDATES = 15                  # JE candidates sent to Claude per bank line
MAX_LINES_PER_RUN = 100             # safety cap on unmatched lines per call


def ai_reconcile(bank_account, *, dry_run: bool = False) -> dict:
    """AI-assisted reconciliation for a bank account.

    Returns {matched, skipped, errors, matches: [{bank_line_id, je_line_id, reason}]}
    """
    from django.conf import settings
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY not configured", "matched": 0}

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
    except Exception:
        return {"error": "Anthropic SDK not available", "matched": 0}

    from .models import BankStatementLine
    from apps.ledger.models import JournalLine, JournalEntry

    unmatched = list(
        BankStatementLine.objects.filter(
            statement__bank_account=bank_account,
            status=BankStatementLine.Status.UNMATCHED,
        ).order_by("date")[:MAX_LINES_PER_RUN]
    )

    if not unmatched:
        return {"matched": 0, "skipped": 0, "errors": 0, "matches": []}

    # Date range covering all unmatched lines (±7 days buffer)
    earliest = min(l.date for l in unmatched)
    latest = max(l.date for l in unmatched)

    # Candidate JE lines: unreconciled lines on the bank's GL account, nearby dates
    candidates = list(
        JournalLine.objects.filter(
            account=bank_account.ledger_account,
            journal_entry__status=JournalEntry.Status.POSTED,
            journal_entry__date__range=(
                earliest - timedelta(days=7),
                latest + timedelta(days=7),
            ),
            bank_matches__isnull=True,
        ).select_related("journal_entry")
        .order_by("journal_entry__date")[:200]
    )

    matched_count = skipped = errors = 0
    matches_log = []

    for stmt_line in unmatched:
        stmt_amount = stmt_line.credit if stmt_line.credit > 0 else stmt_line.debit

        # Filter candidates by date proximity and amount tolerance
        nearby = [
            c for c in candidates
            if abs((c.journal_entry.date - stmt_line.date).days) <= 7
            and _within_tolerance(c, stmt_amount)
            and c.id not in [m.get("je_line_id") for m in matches_log]  # not yet used
        ][:MAX_CANDIDATES]

        if not nearby:
            skipped += 1
            continue

        result = _ask_claude(client, stmt_line, nearby, stmt_amount)
        if not result or result.get("match") == "no_match":
            skipped += 1
            continue

        je_line_id = result.get("je_line_id")
        matched_je = next((c for c in nearby if c.id == je_line_id), None)
        if not matched_je:
            skipped += 1
            continue

        if not dry_run:
            try:
                with transaction.atomic():
                    stmt_line.matched_journal_line = matched_je
                    stmt_line.status = BankStatementLine.Status.MATCHED
                    stmt_line.save(update_fields=["matched_journal_line", "status", "updated_at"])
                    matched_count += 1
            except Exception:
                logger.exception("Failed to save AI reconciliation match")
                errors += 1
                continue
        else:
            matched_count += 1

        matches_log.append({
            "bank_line_id": stmt_line.id,
            "bank_description": stmt_line.description[:80],
            "bank_amount": str(stmt_amount),
            "bank_date": str(stmt_line.date),
            "je_line_id": matched_je.id,
            "je_narration": (matched_je.journal_entry.narration or "")[:80],
            "je_date": str(matched_je.journal_entry.date),
            "reason": result.get("reason", ""),
            "confidence": result.get("confidence", "medium"),
        })

    return {
        "matched": matched_count,
        "skipped": skipped,
        "errors": errors,
        "dry_run": dry_run,
        "matches": matches_log,
    }


def _within_tolerance(je_line, stmt_amount: Decimal) -> bool:
    """True if the JE line amount is within AMOUNT_TOLERANCE % of the bank amount."""
    je_amount = je_line.debit if je_line.debit > 0 else je_line.credit
    if je_amount == 0 or stmt_amount == 0:
        return False
    ratio = abs(je_amount - stmt_amount) / stmt_amount
    return ratio <= AMOUNT_TOLERANCE


def _ask_claude(client, stmt_line, candidates: list, stmt_amount: Decimal) -> dict | None:
    """Ask Claude to pick the best JE match for this bank line. Returns match dict or None."""
    candidate_lines = "\n".join(
        f"  ID={c.id} | Date={c.journal_entry.date} | "
        f"Amount=₹{max(c.debit, c.credit):,.2f} | "
        f"Narration={c.journal_entry.narration or 'N/A'} | "
        f"Ref={c.journal_entry.voucher_no}"
        for c in candidates
    )

    direction = "credit (money received)" if stmt_line.credit > 0 else "debit (money paid out)"

    prompt = f"""You are a bank reconciliation assistant. Match this bank statement line to the best journal entry.

BANK STATEMENT LINE:
  Date: {stmt_line.date}
  Description: {stmt_line.description}
  Reference: {stmt_line.reference or 'N/A'}
  Amount: ₹{stmt_amount:,.2f} ({direction})

CANDIDATE JOURNAL ENTRY LINES (unreconciled):
{candidate_lines}

Return ONLY valid JSON:
{{
  "match": "<je_line_id as integer, or 'no_match'>",
  "je_line_id": <integer or null>,
  "confidence": "<high|medium|low>",
  "reason": "<one sentence explanation>"
}}

Rules:
- Match on: vendor/customer name in description, reference numbers, similar amounts (allow minor bank charges)
- If no candidate is a reasonable match, return "no_match"
- Prefer closer dates and exact amounts; slight amount differences (bank charges) are acceptable
- Output ONLY the JSON, nothing else"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        if data.get("match") == "no_match":
            data["je_line_id"] = None
        elif isinstance(data.get("match"), (int, str)):
            try:
                data["je_line_id"] = int(data["match"])
            except (ValueError, TypeError):
                data["je_line_id"] = None
        return data
    except Exception:
        logger.exception("Claude reconciliation call failed for bank line %s", stmt_line.id)
        return None
