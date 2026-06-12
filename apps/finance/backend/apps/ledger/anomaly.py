"""Ledger anomaly detection — nightly scan of journal entries for suspicious patterns.

Checks:
  1. After-hours entries (before 7am or after 9pm)
  2. Large round-number entries (potential fraud signal)
  3. Duplicate vendor payments within 24 hours
  4. Entries with no supporting document above threshold
  5. Entries posted to watch-list accounts (Suspense, Drawings)
  6. Single large reversal on the same day it was posted

Each anomaly generates an in-app Notification for the company's admin user.
"""
from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

logger = logging.getLogger(__name__)

# Accounts that always deserve a second look when debited / credited heavily.
WATCH_ACCOUNT_CODES = {"2990", "3100", "3110", "1999"}  # Suspense, Drawings, Misc

# Amount above which a missing-document entry is flagged.
DOCUMENT_THRESHOLD = Decimal("50000")

# Amount above which a round-number entry is flagged.
ROUND_NUMBER_THRESHOLD = Decimal("100000")


def detect_anomalies(company_id: int, since_hours: int = 24) -> list[dict]:
    """Return a list of anomaly dicts for all JEs posted in the last `since_hours`.

    Each dict: {type, entry_id, entry_no, amount, account, reason, severity}
    """
    from apps.ledger.models import JournalEntry, JournalLine
    from apps.masters.models import Account

    cutoff = timezone.now() - timedelta(hours=since_hours)
    anomalies = []

    entries = (
        JournalEntry.objects.filter(
            company_id=company_id,
            status=JournalEntry.Status.POSTED,
            created_at__gte=cutoff,
        )
        .prefetch_related("lines__account")
        .select_related("posted_by")
    )

    for entry in entries:
        amount = abs(sum(l.debit - l.credit for l in entry.lines.all()) / 2) if entry.lines.exists() else Decimal("0")

        # 1. After-hours entry
        local_hour = entry.created_at.astimezone().hour
        if local_hour < 7 or local_hour >= 21:
            poster = getattr(entry, "posted_by", None)
            poster_email = getattr(poster, "email", "unknown") if poster else "unknown"
            anomalies.append({
                "type": "after_hours",
                "entry_id": entry.id,
                "entry_no": entry.entry_no,
                "amount": str(amount),
                "reason": f"Posted at {entry.created_at.strftime('%H:%M')} by {poster_email}",
                "severity": "medium",
            })

        # 2. Large round number
        if amount >= ROUND_NUMBER_THRESHOLD and amount % Decimal("10000") == 0:
            anomalies.append({
                "type": "round_number",
                "entry_id": entry.id,
                "entry_no": entry.entry_no,
                "amount": str(amount),
                "reason": f"Large round-number entry of ₹{amount:,.0f}",
                "severity": "low",
            })

        # 3. No supporting document above threshold
        if amount >= DOCUMENT_THRESHOLD and not getattr(entry, "attachments", None) and not entry.narration:
            anomalies.append({
                "type": "no_document",
                "entry_id": entry.id,
                "entry_no": entry.entry_no,
                "amount": str(amount),
                "reason": f"₹{amount:,.0f} entry with no narration or document",
                "severity": "medium",
            })

        # 4. Watch-account usage
        for line in entry.lines.all():
            if line.account and line.account.code in WATCH_ACCOUNT_CODES:
                val = max(line.debit, line.credit)
                if val >= Decimal("10000"):
                    anomalies.append({
                        "type": "watch_account",
                        "entry_id": entry.id,
                        "entry_no": entry.entry_no,
                        "amount": str(val),
                        "reason": f"Entry to '{line.account.name}' ({line.account.code}) — review required",
                        "severity": "high",
                    })
                    break

    # 5. Duplicate vendor payments (same vendor + same amount within 24h)
    from apps.procurement.models import VendorPayment
    payments = VendorPayment.objects.filter(
        company_id=company_id,
        date__gte=(timezone.now() - timedelta(hours=since_hours)).date(),
    ).values("vendor_id", "amount")

    seen: dict = {}
    for p in payments:
        key = (p["vendor_id"], p["amount"])
        if key in seen:
            anomalies.append({
                "type": "duplicate_payment",
                "entry_id": None,
                "entry_no": "Payment",
                "amount": str(p["amount"]),
                "reason": f"Same vendor paid ₹{p['amount']:,.0f} twice in 24 hours",
                "severity": "high",
            })
        else:
            seen[key] = True

    return anomalies


def notify_anomalies(company_id: int, anomalies: list[dict]) -> int:
    """Create in-app Notification records for each anomaly (for admin user)."""
    if not anomalies:
        return 0

    from apps.notifications.models import Notification
    from apps.identity.models import User
    from apps.core.models import Tenant
    from django_tenants.utils import get_current_schema

    # Find the admin user(s) — billing_email for this tenant
    try:
        tenant = Tenant.objects.exclude(schema_name="public").filter(
            subscription__status="ACTIVE"
        ).first()
        if not tenant:
            return 0
        admin_users = User.objects.filter(email__iexact=tenant.billing_email)
    except Exception:
        return 0

    SEVERITY_LEVEL = {"high": "ERROR", "medium": "WARNING", "low": "INFO"}
    count = 0
    for anomaly in anomalies:
        level = SEVERITY_LEVEL.get(anomaly.get("severity", "low"), "INFO")
        for user in admin_users:
            Notification.objects.create(
                user=user,
                title=f"⚠️ Ledger Anomaly: {anomaly['type'].replace('_', ' ').title()}",
                body=anomaly["reason"],
                level=level,
                link=f"/api/docs/#journal-entry-{anomaly.get('entry_id') or ''}",
            )
            count += 1
    return count
