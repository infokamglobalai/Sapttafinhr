"""Saudi Arabia payroll — GOSI contributions + EOS gratuity (simplified)."""
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


def calculate_gosi(
    basic_monthly: Decimal,
    *,
    is_saudi: bool,
    currency: str = "SAR",
    employee_rate: Decimal | None = None,
    employer_rate: Decimal | None = None,
) -> tuple[Decimal, Decimal]:
    """Simplified GOSI — Saudi nationals only; rates configurable via statutory settings."""
    if not is_saudi or basic_monthly <= 0:
        return Decimal("0"), Decimal("0")
    emp_rate = employee_rate if employee_rate is not None else Decimal("0.0975")
    er_rate = employer_rate if employer_rate is not None else Decimal("0.1175")
    emp = round_money(basic_monthly * emp_rate, currency)
    er = round_money(basic_monthly * er_rate, currency)
    return emp, er


def calculate_ksa_gratuity_settlement(employee, exit_date: datetime.date | None = None, *, currency: str = "SAR") -> dict:
    """KSA EOS — half month salary/year for first 5 years, full month/year after."""
    exit_date = exit_date or datetime.date.today()
    join = employee.date_of_joining
    if not join:
        return {"eligible": False, "years": 0.0, "amount": Decimal("0"), "note": "Add date of joining."}

    years = years_of_service(join, exit_date)
    if years < 2:
        return {
            "eligible": False,
            "years": float(years),
            "amount": Decimal("0"),
            "note": "Gratuity typically applies after 2 years (resignation) or immediately if terminated.",
        }

    basic = _basic_monthly(employee)
    if basic <= 0:
        return {"eligible": True, "years": float(years), "amount": Decimal("0"), "note": "Assign salary to estimate gratuity."}

    completed = int(years)
    if completed <= 5:
        amount = round_money(basic * Decimal("0.5") * completed, currency)
    else:
        first = round_money(basic * Decimal("0.5") * 5, currency)
        after = round_money(basic * (completed - 5), currency)
        amount = first + after

    return {
        "eligible": True,
        "years": float(years),
        "amount": amount,
        "note": "Estimate per Saudi Labour Law — verify with GOSI / HR consultant.",
    }


def monthly_ksa_gratuity_accrual(basic_monthly: Decimal, *, years: Decimal, currency: str = "SAR") -> Decimal:
    if basic_monthly <= 0:
        return Decimal("0")
    annual = basic_monthly * (Decimal("0.5") if years <= 5 else Decimal("1"))
    return round_money(annual / Decimal("12"), currency)
