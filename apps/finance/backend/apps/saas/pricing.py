"""Saptta SaaS pricing — mirrors apps/web/src/types/index.ts (ex-GST INR)."""
from __future__ import annotations

from decimal import Decimal

INCLUDED_EMPLOYEES = 30
EXTRA_EMPLOYEE_PRICE = Decimal("111")

HRMS_PRICE = Decimal("4999")
FINANCE_PRICE = Decimal("4999")
COMPLETE_PRICE = Decimal("7999")

HR_PLANS = frozenset({"hrms", "saptta-hrms", "saptta-complete", "complete"})
COMPLETE_PLANS = frozenset({"saptta-complete", "complete"})


def plan_monthly_inr(plan_code: str, employees: int = INCLUDED_EMPLOYEES) -> Decimal:
    code = (plan_code or "").strip().lower()
    if code in COMPLETE_PLANS or code == "saptta-complete":
        base = COMPLETE_PRICE
    elif code in {"finance", "saptta-finance"}:
        base = FINANCE_PRICE
    else:
        base = HRMS_PRICE

    extra = max(0, int(employees) - INCLUDED_EMPLOYEES)
    if code in {"finance", "saptta-finance"}:
        extra = 0
    return base + (EXTRA_EMPLOYEE_PRICE * extra)


def max_employees_for_plan(plan_code: str, employees: int | None = None) -> int:
    """Paid headcount cap pushed to HR — finance-only plans leave HR at default."""
    code = (plan_code or "").strip().lower()
    if code in {"finance", "saptta-finance"}:
        return INCLUDED_EMPLOYEES
    headcount = int(employees or INCLUDED_EMPLOYEES)
    return max(headcount, INCLUDED_EMPLOYEES)
