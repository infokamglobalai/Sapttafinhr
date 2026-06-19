"""India Payment of Gratuity Act — monthly accrual and exit settlement estimates."""
from __future__ import annotations

import datetime
from decimal import Decimal, ROUND_HALF_UP


def round2(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def years_of_service(join_date: datetime.date | None, as_of: datetime.date) -> Decimal:
    if not join_date or as_of < join_date:
        return Decimal("0")
    days = (as_of - join_date).days
    return (Decimal(days) / Decimal("365")).quantize(Decimal("0.01"))


def monthly_gratuity_accrual(basic_monthly: Decimal) -> Decimal:
    """Employer provision: (15/26 × basic) ÷ 12 per month (simplified accrual)."""
    if not basic_monthly or basic_monthly <= 0:
        return Decimal("0")
    annual = basic_monthly * Decimal("15") / Decimal("26")
    return round2(annual / 12)


def _employee_basic_monthly(employee) -> Decimal:
    from .models import EmployeeSalary

    salary = (
        EmployeeSalary.objects.filter(
            tenant=employee.tenant, employee=employee, is_active=True
        )
        .order_by("-effective_date")
        .first()
    )
    return salary.basic_monthly if salary else Decimal("0")


def calculate_gratuity_settlement(employee, exit_date: datetime.date | None = None) -> dict:
    """
    Estimate gratuity payable on exit per Payment of Gratuity Act (India).
    Full eligibility: 5+ years continuous service (simplified; verify with CA for edge cases).
    """
    exit_date = exit_date or datetime.date.today()
    join = employee.date_of_joining
    if not join:
        return {
            "eligible": False,
            "years": 0.0,
            "amount": Decimal("0"),
            "note": "Add date of joining to calculate gratuity.",
        }

    years = years_of_service(join, exit_date)
    if years < 5:
        return {
            "eligible": False,
            "years": float(years),
            "amount": Decimal("0"),
            "note": "Gratuity typically payable after 5 years of continuous service.",
        }

    basic = _employee_basic_monthly(employee)
    if basic <= 0:
        return {
            "eligible": True,
            "years": float(years),
            "amount": Decimal("0"),
            "note": "Assign a salary structure to estimate gratuity amount.",
        }

    completed_years = int(years)
    amount = round2((basic * Decimal("15") / Decimal("26")) * completed_years)
    return {
        "eligible": True,
        "years": float(years),
        "amount": amount,
        "note": "Estimate per Payment of Gratuity Act — verify before F&F payout.",
    }
