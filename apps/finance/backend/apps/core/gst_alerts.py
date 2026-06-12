"""Proactive GST compliance alerts.

Checks run on demand or nightly:
  1. GSTR-1 deadline approaching (11th of following month) — B2B invoice filing
  2. GSTR-3B deadline approaching (20th of following month) — monthly return
  3. Invoices issued to B2B parties without GSTIN captured
  4. Input Tax Credit anomaly — purchase GST unusually low vs sales GST
  5. Unreconciled advance receipts older than 180 days (liable to GST)

Each alert: {type, severity, title, message, action}
"""
from __future__ import annotations

import logging
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)

# How many days before the deadline to start alerting
GSTR1_WARN_DAYS = 5
GSTR3B_WARN_DAYS = 7
ITC_RATIO_FLOOR = Decimal("0.20")   # if purchase_gst < 20% of output_gst → flag
ADVANCE_AGE_DAYS = 180


def generate_gst_alerts(company_id: int) -> list[dict]:
    """Return list of GST compliance alert dicts for the given company."""
    today = date.today()
    alerts: list[dict] = []

    alerts.extend(_deadline_alerts(today))
    alerts.extend(_missing_gstin_alerts(company_id, today))
    alerts.extend(_itc_mismatch_alerts(company_id, today))
    alerts.extend(_old_advance_alerts(company_id, today))

    return alerts


# ── 1 & 2. Filing deadline alerts ────────────────────────────────────────────
def _deadline_alerts(today: date) -> list[dict]:
    alerts = []

    # Current period = previous month (for which returns are now due)
    if today.month == 1:
        period_month, period_year = 12, today.year - 1
    else:
        period_month, period_year = today.month - 1, today.year

    period_label = date(period_year, period_month, 1).strftime("%B %Y")

    # GSTR-1 due on 11th of current month
    gstr1_due = date(today.year, today.month, 11)
    days_to_gstr1 = (gstr1_due - today).days
    if 0 < days_to_gstr1 <= GSTR1_WARN_DAYS:
        alerts.append({
            "type": "gstr1_deadline",
            "severity": "high" if days_to_gstr1 <= 2 else "medium",
            "title": f"GSTR-1 Due in {days_to_gstr1} day(s)",
            "message": (
                f"GSTR-1 for {period_label} must be filed by {gstr1_due.strftime('%d %b %Y')}. "
                f"Ensure all B2B invoices are uploaded on the GST portal."
            ),
            "action": "Review outward supplies on GST portal",
            "due_date": gstr1_due.isoformat(),
        })
    elif days_to_gstr1 == 0:
        alerts.append({
            "type": "gstr1_deadline",
            "severity": "high",
            "title": "GSTR-1 Due TODAY",
            "message": f"GSTR-1 for {period_label} is due today. File immediately to avoid late fees.",
            "action": "File GSTR-1 on GST portal now",
            "due_date": gstr1_due.isoformat(),
        })

    # GSTR-3B due on 20th of current month
    gstr3b_due = date(today.year, today.month, 20)
    days_to_3b = (gstr3b_due - today).days
    if 0 < days_to_3b <= GSTR3B_WARN_DAYS:
        alerts.append({
            "type": "gstr3b_deadline",
            "severity": "high" if days_to_3b <= 3 else "medium",
            "title": f"GSTR-3B Due in {days_to_3b} day(s)",
            "message": (
                f"GSTR-3B for {period_label} must be filed by {gstr3b_due.strftime('%d %b %Y')}. "
                f"Verify ITC, output tax and pay any balance before filing."
            ),
            "action": "Compute and file GSTR-3B",
            "due_date": gstr3b_due.isoformat(),
        })
    elif days_to_3b == 0:
        alerts.append({
            "type": "gstr3b_deadline",
            "severity": "high",
            "title": "GSTR-3B Due TODAY",
            "message": f"GSTR-3B for {period_label} is due today. File with payment immediately.",
            "action": "File GSTR-3B on GST portal now",
            "due_date": gstr3b_due.isoformat(),
        })

    return alerts


# ── 3. Invoices without GSTIN for B2B parties ────────────────────────────────
def _missing_gstin_alerts(company_id: int, today: date) -> list[dict]:
    try:
        from apps.billing.models import Invoice
        from apps.masters.models import Party
        from django.db.models import Q

        # B2B parties are those that have a GSTIN or are businesses (not individuals)
        thirty_ago = today - timedelta(days=30)
        problem_invoices = Invoice.objects.filter(
            company_id=company_id,
            status=Invoice.Status.POSTED,
            date__gte=thirty_ago,
            customer__gstin="",          # no GSTIN on party
        ).select_related("customer").exclude(
            customer__party_type="individual"  # skip individuals if field exists
        )[:20]

        if not problem_invoices:
            return []

        names = list({i.customer.name for i in problem_invoices})[:5]
        return [{
            "type": "missing_gstin",
            "severity": "medium",
            "title": f"{problem_invoices.count()} B2B Invoices Missing Customer GSTIN",
            "message": (
                f"Invoices in the last 30 days have customers without GSTIN. "
                f"Examples: {', '.join(names)}. "
                f"Missing GSTIN prevents correct GSTR-1 B2B reporting."
            ),
            "action": "Update customer GSTIN in Masters → Parties",
            "count": problem_invoices.count(),
        }]
    except Exception:
        logger.exception("GST missing GSTIN check failed")
        return []


# ── 4. ITC mismatch — purchase GST vs output GST ─────────────────────────────
def _itc_mismatch_alerts(company_id: int, today: date) -> list[dict]:
    try:
        from apps.billing.models import Invoice
        from apps.procurement.models import VendorBill
        from django.db.models import Sum

        if today.month == 1:
            m, y = 12, today.year - 1
        else:
            m, y = today.month - 1, today.year
        start = date(y, m, 1)
        end = date(y, m, monthrange(y, m)[1])

        out = Invoice.objects.filter(
            company_id=company_id,
            status=Invoice.Status.POSTED,
            date__range=(start, end),
        ).aggregate(
            cgst=Sum("cgst"), sgst=Sum("sgst"), igst=Sum("igst")
        )
        output_gst = (out["cgst"] or 0) + (out["sgst"] or 0) + (out["igst"] or 0)

        inp = VendorBill.objects.filter(
            company_id=company_id,
            status__in=["POSTED", "PARTIAL", "PAID"],
            date__range=(start, end),
        ).aggregate(
            cgst=Sum("cgst"), sgst=Sum("sgst"), igst=Sum("igst")
        )
        input_gst = (inp["cgst"] or 0) + (inp["sgst"] or 0) + (inp["igst"] or 0)

        if output_gst <= 0:
            return []

        ratio = Decimal(str(input_gst)) / Decimal(str(output_gst))
        period_label = start.strftime("%B %Y")

        if ratio < ITC_RATIO_FLOOR and input_gst > 0:
            return [{
                "type": "itc_mismatch",
                "severity": "medium",
                "title": f"Low ITC vs Output GST — {period_label}",
                "message": (
                    f"Purchase GST (₹{input_gst:,.0f}) is only {ratio * 100:.1f}% of "
                    f"output GST (₹{output_gst:,.0f}) for {period_label}. "
                    f"Verify all purchase bills have been entered with correct GST amounts."
                ),
                "action": "Check unrecorded vendor bills and GST entries",
                "output_gst": str(output_gst),
                "input_gst": str(input_gst),
            }]
        elif input_gst == 0 and output_gst > 0:
            return [{
                "type": "itc_mismatch",
                "severity": "low",
                "title": f"No ITC Recorded — {period_label}",
                "message": (
                    f"No purchase GST recorded for {period_label} despite "
                    f"₹{output_gst:,.0f} in output GST. If you have vendor bills, ensure they are entered."
                ),
                "action": "Enter vendor bills with GST amounts",
                "output_gst": str(output_gst),
                "input_gst": "0",
            }]
        return []
    except Exception:
        logger.exception("GST ITC mismatch check failed")
        return []


# ── 5. Old unreconciled advances (reverse charge risk) ───────────────────────
def _old_advance_alerts(company_id: int, today: date) -> list[dict]:
    try:
        from apps.banking.models import Advance
        cutoff = today - timedelta(days=ADVANCE_AGE_DAYS)
        old_advances = Advance.objects.filter(
            company_id=company_id,
            balance__gt=0,
            date__lte=cutoff,
        )
        count = old_advances.count()
        if count == 0:
            return []
        total = sum(a.balance for a in old_advances)
        return [{
            "type": "old_advance",
            "severity": "low",
            "title": f"{count} Advance(s) Unadjusted for Over {ADVANCE_AGE_DAYS} Days",
            "message": (
                f"₹{total:,.0f} in advance receipts/payments older than {ADVANCE_AGE_DAYS} days "
                f"remain unadjusted. Under GST, advances received for supply attract GST liability. "
                f"Adjust against invoices or issue receipt vouchers."
            ),
            "action": "Adjust old advances against invoices",
            "count": count,
            "total": str(total),
        }]
    except Exception:
        logger.exception("GST old advance check failed")
        return []
