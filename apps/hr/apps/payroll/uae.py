"""UAE payroll — end-of-service gratuity (simplified MOHRE rules)."""
from __future__ import annotations

import datetime
from decimal import Decimal

from utils.money import round_money


def years_of_service(join_date: datetime.date | None, as_of: datetime.date) -> Decimal:
    if not join_date or as_of < join_date:
        return Decimal("0")
    return (Decimal((as_of - join_date).days) / Decimal("365")).quantize(Decimal("0.01"))


def _basic_monthly(employee) -> Decimal:
    from apps.payroll.models import EmployeeSalary

    salary = (
        EmployeeSalary.objects.filter(
            tenant=employee.tenant, employee=employee, is_active=True
        )
        .order_by("-effective_date")
        .first()
    )
    return salary.basic_monthly if salary else Decimal("0")


def calculate_uae_gratuity_settlement(employee, exit_date: datetime.date | None = None, *, currency: str = "AED") -> dict:
    """
    UAE EOS gratuity estimate (limited contract, simplified):
    Years 1–5: 21 days basic/year; after 5 years: 30 days basic/year.
    """
    exit_date = exit_date or datetime.date.today()
    join = employee.date_of_joining
    if not join:
        return {"eligible": False, "years": 0.0, "amount": Decimal("0"), "note": "Add date of joining."}

    years = years_of_service(join, exit_date)
    if years < 1:
        return {
            "eligible": False,
            "years": float(years),
            "amount": Decimal("0"),
            "note": "Gratuity typically applies after 1 year of service.",
        }

    basic = _basic_monthly(employee)
    if basic <= 0:
        return {"eligible": True, "years": float(years), "amount": Decimal("0"), "note": "Assign salary to estimate gratuity."}

    daily = basic / Decimal("30")
    completed = int(years)
    if completed <= 5:
        amount = round_money(daily * Decimal("21") * completed, currency)
    else:
        first = round_money(daily * Decimal("21") * 5, currency)
        after = round_money(daily * Decimal("30") * (completed - 5), currency)
        amount = first + after

    return {
        "eligible": True,
        "years": float(years),
        "amount": amount,
        "note": "Estimate per UAE Labour Law — verify before FnF payout.",
    }


def monthly_uae_gratuity_accrual(basic_monthly: Decimal, *, years: Decimal, currency: str = "AED") -> Decimal:
    if basic_monthly <= 0:
        return Decimal("0")
    daily = basic_monthly / Decimal("30")
    annual = daily * (Decimal("21") if years < 5 else Decimal("30"))
    return round_money(annual / Decimal("12"), currency)
