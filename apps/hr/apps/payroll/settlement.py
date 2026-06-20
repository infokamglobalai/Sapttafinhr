"""End-of-service settlement estimates by jurisdiction."""
from __future__ import annotations

import datetime

from apps.tenants.jurisdiction import is_india_payroll, normalise_jurisdiction


def settlement_estimate(employee, exit_date: datetime.date | None = None, *, tenant=None) -> dict:
    """Unified FnF / gratuity / indemnity estimate for exit workflow."""
    tenant = tenant or employee.tenant
    exit_date = exit_date or datetime.date.today()
    jurisdiction = normalise_jurisdiction(getattr(tenant, "payroll_jurisdiction", "IN"))
    currency = getattr(tenant, "currency", "INR") or "INR"

    if is_india_payroll(jurisdiction):
        from apps.payroll.gratuity import calculate_gratuity_settlement
        result = calculate_gratuity_settlement(employee, exit_date)
        result["label"] = "Gratuity"
        result["currency"] = "INR"
        return result

    if jurisdiction == "KW":
        from apps.payroll.kuwait import calculate_indemnity_settlement
        result = calculate_indemnity_settlement(employee, exit_date, currency=currency)
        result["label"] = "Indemnity (EOS)"
        result["currency"] = currency
        return result

    if jurisdiction == "AE":
        from apps.payroll.uae import calculate_uae_gratuity_settlement
        result = calculate_uae_gratuity_settlement(employee, exit_date, currency=currency)
        result["label"] = "Gratuity (EOS)"
        result["currency"] = currency
        return result

    if jurisdiction == "SA":
        from apps.payroll.ksa import calculate_ksa_gratuity_settlement
        result = calculate_ksa_gratuity_settlement(employee, exit_date, currency=currency)
        result["label"] = "Gratuity (EOS)"
        result["currency"] = currency
        return result

    return {
        "eligible": False,
        "years": 0.0,
        "amount": 0,
        "note": "Settlement calculator not configured for this region.",
        "label": "Settlement",
        "currency": currency,
    }
