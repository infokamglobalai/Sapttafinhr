"""Kuwait payroll — PIFSS contributions and end-of-service indemnity (P1)."""
from __future__ import annotations

import datetime
from decimal import Decimal

from utils.money import round_money


def years_of_service(join_date: datetime.date | None, as_of: datetime.date) -> Decimal:
    if not join_date or as_of < join_date:
        return Decimal("0")
    days = (as_of - join_date).days
    return (Decimal(days) / Decimal("365")).quantize(Decimal("0.01"))


def indemnity_base(basic_monthly: Decimal, housing_monthly: Decimal) -> Decimal:
    return basic_monthly + housing_monthly


def monthly_indemnity_accrual(
    basic_monthly: Decimal,
    housing_monthly: Decimal,
    *,
    years: Decimal,
    currency: str = "KWD",
) -> Decimal:
    """
    Monthly employer indemnity accrual (Kuwait private sector, simplified).
    First 5 years: 15 days per year of service base.
    After 5 years: 1 month salary per year (applied to full base monthly).
    """
    base = indemnity_base(basic_monthly, housing_monthly)
    if base <= 0:
        return Decimal("0")
    if years < 5:
        daily = base / Decimal("26")
        annual = daily * Decimal("15")
    else:
        annual = base
    return round_money(annual / Decimal("12"), currency)


def calculate_pifss(
    basic_monthly: Decimal,
    *,
    employee_rate: Decimal,
    employer_rate: Decimal,
    currency: str = "KWD",
) -> tuple[Decimal, Decimal]:
    """PIFSS employee + employer on basic salary (Kuwaiti nationals)."""
    if basic_monthly <= 0:
        return Decimal("0"), Decimal("0")
    emp = round_money(basic_monthly * employee_rate, currency)
    er = round_money(basic_monthly * employer_rate, currency)
    return emp, er


def calculate_indemnity_settlement(
    employee,
    exit_date: datetime.date | None = None,
    *,
    currency: str = "KWD",
) -> dict:
    """Estimate end-of-service indemnity on exit."""
    exit_date = exit_date or datetime.date.today()
    join = employee.date_of_joining
    if not join:
        return {
            "eligible": False,
            "years": 0.0,
            "amount": Decimal("0"),
            "note": "Add date of joining to calculate indemnity.",
        }

    years = years_of_service(join, exit_date)
    basic, housing = _salary_split(employee)
    if basic <= 0:
        return {
            "eligible": years > 0,
            "years": float(years),
            "amount": Decimal("0"),
            "note": "Assign a salary structure to estimate indemnity.",
        }

    base = indemnity_base(basic, housing)
    completed = int(years)
    if completed < 1:
        return {
            "eligible": False,
            "years": float(years),
            "amount": Decimal("0"),
            "note": "Indemnity typically applies after 1 year of service.",
        }

    if years <= 5:
        daily = base / Decimal("26")
        amount = round_money(daily * Decimal("15") * completed, currency)
    else:
        first_five = round_money((base / Decimal("26")) * Decimal("15") * 5, currency)
        after = round_money(base * (completed - 5), currency)
        amount = first_five + after

    return {
        "eligible": True,
        "years": float(years),
        "amount": amount,
        "note": "Estimate per Kuwait Labour Law — verify with payroll consultant before payout.",
    }


def _salary_split(employee) -> tuple[Decimal, Decimal]:
    from apps.payroll.models import EmployeeSalary

    salary = (
        EmployeeSalary.objects.filter(
            tenant=employee.tenant, employee=employee, is_active=True
        )
        .order_by("-effective_date")
        .first()
    )
    if not salary:
        return Decimal("0"), Decimal("0")
    basic = salary.basic_monthly or Decimal("0")
    housing = Decimal("0")
    overrides = salary.component_overrides or {}
    if "HOUSING" in overrides:
        housing = Decimal(str(overrides["HOUSING"]))
    elif "HRA" in overrides:
        housing = Decimal(str(overrides["HRA"]))
    return basic, housing
