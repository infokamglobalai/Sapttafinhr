"""Canonical SaaS plan codes — mirrors apps/web/src/types/index.ts PLANS[]."""
from __future__ import annotations

from apps.saas.models import Plan, ProductCode
from apps.saas.pricing import COMPLETE_PRICE, FINANCE_PRICE, HRMS_PRICE, annual_from_monthly

CATALOG_PLANS: tuple[dict, ...] = (
    {
        "code": "hrms",
        "name": "Saptta HRMS",
        "description": "Complete HR, attendance & payroll — flat for up to 30 employees.",
        "monthly_price": HRMS_PRICE,
        "annual_price": annual_from_monthly(HRMS_PRICE),
        "features": {"products": [ProductCode.HR]},
    },
    {
        "code": "finance",
        "name": "Saptta Finance",
        "description": "GST-ready accounting — flat price, unlimited users.",
        "monthly_price": FINANCE_PRICE,
        "annual_price": annual_from_monthly(FINANCE_PRICE),
        "features": {"products": [ProductCode.FIN]},
    },
    {
        "code": "saptta-complete",
        "name": "Saptta Complete",
        "description": "HRMS + Finance together.",
        "monthly_price": COMPLETE_PRICE,
        "annual_price": annual_from_monthly(COMPLETE_PRICE),
        "features": {"products": [ProductCode.FIN, ProductCode.HR]},
    },
)


def seed_catalog_plans() -> int:
    """Idempotently ensure website plan codes exist in the DB. Returns count upserted."""
    count = 0
    for spec in CATALOG_PLANS:
        Plan.objects.update_or_create(
            code=spec["code"],
            defaults={
                "name": spec["name"],
                "description": spec["description"],
                "monthly_price": spec["monthly_price"],
                "annual_price": spec["annual_price"],
                "features": spec["features"],
                "is_active": True,
            },
        )
        count += 1
    return count
