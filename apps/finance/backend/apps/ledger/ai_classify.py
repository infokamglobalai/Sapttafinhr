"""Smart ledger account classification — AI suggests accounts from narration.

Given a transaction description (narration) and optional amount, Claude picks
the top 3 most likely accounts from the company's Chart of Accounts and returns
a confidence score + reasoning for each suggestion.

Usage:
    from apps.ledger.ai_classify import suggest_account
    suggestions = suggest_account("Office internet bill BSNL", company_id=1, amount=2360)
"""
from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)

MAX_ACCOUNTS_IN_PROMPT = 120  # trim COA to keep prompt manageable


def suggest_account(narration: str, company_id: int, amount=None) -> list[dict]:
    """Return up to 3 account suggestions for the given narration.

    Each suggestion: {account_id, code, name, type, confidence, reasoning}
    Returns empty list on failure.
    """
    from django.conf import settings
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return []

    narration = (narration or "").strip()
    if not narration:
        return []

    coa = _get_coa(company_id)
    if not coa:
        return []

    prompt = _build_prompt(narration, coa, amount)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=(
                "You are an accounting assistant that classifies transactions into the correct "
                "ledger accounts. You ONLY output valid JSON. Never add explanations outside JSON."
            ),
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        suggestions = json.loads(raw)
        if not isinstance(suggestions, list):
            suggestions = suggestions.get("suggestions", [])

        # Enrich with account_id and type from our COA lookup
        coa_by_code = {a["code"]: a for a in coa}
        enriched = []
        for s in suggestions[:3]:
            code = str(s.get("code", "")).strip()
            acc = coa_by_code.get(code)
            if acc:
                enriched.append({
                    "account_id": acc["id"],
                    "code": acc["code"],
                    "name": acc["name"],
                    "type": acc["type"],
                    "confidence": s.get("confidence", "medium"),
                    "reasoning": s.get("reasoning", ""),
                })
        return enriched
    except Exception:
        logger.exception("AI account classification failed for: %s", narration)
        return []


def _get_coa(company_id: int) -> list[dict]:
    """Fetch postable accounts for the company as a slim list."""
    try:
        from apps.masters.models import Account
        accounts = Account.objects.filter(
            company_id=company_id,
            is_postable=True,
            is_active=True,
        ).values("id", "code", "name", "type").order_by("code")[:MAX_ACCOUNTS_IN_PROMPT]
        return list(accounts)
    except Exception:
        logger.exception("Could not load COA for company %s", company_id)
        return []


def _build_prompt(narration: str, coa: list[dict], amount) -> str:
    coa_lines = "\n".join(
        f"{a['code']} | {a['name']} | {a['type']}"
        for a in coa
    )
    amount_line = f"\nAmount: ₹{amount:,.2f}" if amount else ""
    return f"""A bookkeeper entered this transaction description:
"{narration}"{amount_line}

Below is the Chart of Accounts (code | name | type):
{coa_lines}

Return the top 3 most suitable accounts as a JSON array:
[
  {{"code": "<account code>", "confidence": "<high|medium|low>", "reasoning": "<one sentence>"}},
  {{"code": "<account code>", "confidence": "<high|medium|low>", "reasoning": "<one sentence>"}},
  {{"code": "<account code>", "confidence": "<high|medium|low>", "reasoning": "<one sentence>"}}
]

Rules:
- Only choose accounts from the list above
- Prefer EXPENSE accounts for costs, INCOME for revenue, ASSET for purchases of lasting items
- For GST-related descriptions, suggest the appropriate GST Input/Output account if present
- Output ONLY the JSON array, nothing else"""
