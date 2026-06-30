"""Fetch platform billing (subscription + invoices) from the finance backend."""
from __future__ import annotations

import logging
from datetime import date, datetime
from decimal import Decimal

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

BILLING_SNAPSHOT_CACHE_SECONDS = 120


def _finance_headers() -> dict:
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    return {
        "Authorization": f"Bearer {secret}",
        "Host": "localhost",
        "Accept": "application/json",
    }


def _finance_base() -> str:
    return getattr(settings, "FIN_INTERNAL_BASE_URL", "").rstrip("/")


def fetch_platform_billing(tenant) -> dict | None:
    """Return live subscription + invoices from finance, or None if unavailable."""
    base = _finance_base()
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not base or not secret or not tenant:
        return None

    cache_key = f"platform_billing:{tenant.subdomain}"
    cached = cache.get(cache_key)
    if cached is not None:
        return None if cached == "__none__" else cached

    try:
        import requests

        resp = requests.get(
            f"{base}/api/v1/saas/internal/billing-snapshot/",
            params={"workspace": tenant.subdomain},
            headers=_finance_headers(),
            timeout=5,
        )
        if resp.status_code == 404:
            cache.set(cache_key, "__none__", BILLING_SNAPSHOT_CACHE_SECONDS)
            return None
        resp.raise_for_status()
        data = resp.json()
        cache.set(cache_key, data, BILLING_SNAPSHOT_CACHE_SECONDS)
        return data
    except Exception:
        logger.exception("Platform billing fetch failed for %s", tenant.subdomain)
        cache.set(cache_key, "__none__", 30)
        return None


def fetch_invoice_detail(tenant, invoice_id: int) -> dict | None:
    base = _finance_base()
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not base or not secret or not tenant:
        return None

    try:
        import requests

        resp = requests.get(
            f"{base}/api/v1/saas/internal/invoices/{invoice_id}/",
            params={"workspace": tenant.subdomain},
            headers=_finance_headers(),
            timeout=12,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception("Invoice fetch failed for %s invoice %s", tenant.subdomain, invoice_id)
        return None


def _parse_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def renewal_context(period_end) -> dict:
    """Human-friendly renewal banner for the billing tab."""
    end = _parse_date(period_end)
    if not end:
        return {
            "has_end_date": False,
            "period_end": None,
            "days_remaining": None,
            "tone": "neutral",
            "label": "Renewal date not set",
            "message": "Your subscription renewal date will appear here after the first payment.",
        }

    today = date.today()
    days = (end - today).days
    if days < 0:
        return {
            "has_end_date": True,
            "period_end": end,
            "days_remaining": days,
            "tone": "danger",
            "label": "Subscription ended",
            "message": f"Your plan ended on {end.strftime('%d %b %Y')}. Renew to keep access.",
        }
    if days == 0:
        return {
            "has_end_date": True,
            "period_end": end,
            "days_remaining": 0,
            "tone": "warning",
            "label": "Renews today",
            "message": "Your current billing period ends today.",
        }
    if days <= 14:
        return {
            "has_end_date": True,
            "period_end": end,
            "days_remaining": days,
            "tone": "warning",
            "label": "Renewal coming soon",
            "message": f"Renews in {days} day{'s' if days != 1 else ''} — on {end.strftime('%d %b %Y')}.",
        }
    return {
        "has_end_date": True,
        "period_end": end,
        "days_remaining": days,
        "tone": "success",
        "label": "Active until",
        "message": f"Current period ends {end.strftime('%d %b %Y')} ({days} days remaining).",
    }


def merge_billing_snapshot(local: dict, platform: dict | None) -> dict:
    """Combine HR entitlement snapshot with live finance data when available."""
    merged = dict(local)
    merged["platform_connected"] = platform is not None
    merged["invoices"] = []
    merged["products"] = []

    period_end = local.get("period_end")
    period_start = local.get("period_start")

    if platform:
        merged["plan"] = platform.get("plan", {}).get("name") or merged["plan"]
        merged["plan_code"] = platform.get("plan", {}).get("code", "")
        merged["status"] = _friendly_status(platform.get("status") or merged["status"])
        merged["is_active"] = platform.get("is_active", merged.get("has_entitlement"))
        merged["products"] = platform.get("products") or []
        merged["invoices"] = _normalize_invoices(platform.get("invoices") or [])
        merged["company_name"] = platform.get("company") or ""
        if platform.get("current_period_start"):
            period_start = _parse_date(platform["current_period_start"])
        if platform.get("current_period_end"):
            period_end = _parse_date(platform["current_period_end"])
        merged["period_start"] = period_start
        merged["period_end"] = period_end
        merged["monthly_price"] = platform.get("plan", {}).get("monthly_price")
        merged["annual_price"] = platform.get("plan", {}).get("annual_price")
    else:
        merged["plan_code"] = ""
        merged["is_active"] = merged.get("has_entitlement")
        merged["company_name"] = ""

    merged["renewal"] = renewal_context(period_end)
    return merged


def _friendly_status(raw: str) -> str:
    labels = {
        "ACTIVE": "Active",
        "TRIAL": "Trial",
        "PENDING": "Pending payment",
        "PAST_DUE": "Past due",
        "CANCELLED": "Cancelled",
        "active": "Active",
        "trial": "Trial",
        "suspended": "Suspended",
        "cancelled": "Cancelled",
    }
    return labels.get(raw, str(raw).replace("_", " ").title())


def _normalize_invoices(rows: list) -> list[dict]:
    out = []
    for row in rows:
        out.append({
            "id": row["id"],
            "number": row.get("number") or f"INV-{row['id']}",
            "period_start": _parse_date(row.get("period_start")),
            "period_end": _parse_date(row.get("period_end")),
            "amount": Decimal(str(row.get("amount") or "0")),
            "status": row.get("status") or "PAID",
            "paid_at": _parse_datetime(row.get("paid_at")),
            "due_date": _parse_date(row.get("due_date")),
        })
    return out


def _parse_datetime(value) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def invoice_render_context(detail: dict) -> dict:
    """Template context for HTML/PDF invoice view."""
    inv = detail.get("invoice") or {}
    vendor = detail.get("vendor") or {}
    return {
        "company_name": detail.get("company") or "",
        "plan_name": detail.get("plan_name") or "",
        "vendor": vendor,
        "invoice": {
            "number": inv.get("number") or "",
            "period_start": _parse_date(inv.get("period_start")),
            "period_end": _parse_date(inv.get("period_end")),
            "due_date": _parse_date(inv.get("due_date")),
            "paid_at": _parse_datetime(inv.get("paid_at")),
            "status": inv.get("status") or "PAID",
            "amount": Decimal(str(inv.get("amount") or "0")),
            "taxable_amount": Decimal(str(inv.get("taxable_amount") or "0")),
            "cgst": Decimal(str(inv.get("cgst") or "0")),
            "sgst": Decimal(str(inv.get("sgst") or "0")),
            "igst": Decimal(str(inv.get("igst") or "0")),
            "tax_rate": Decimal(str(inv.get("tax_rate") or "18")),
            "sac_code": inv.get("sac_code") or "9983",
            "place_of_supply": inv.get("place_of_supply") or "",
            "customer_gstin": inv.get("customer_gstin") or "",
        },
    }
