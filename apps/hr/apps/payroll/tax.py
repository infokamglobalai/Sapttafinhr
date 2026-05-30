"""
Indian income-tax calculation supporting both Old and New regimes.

DISCLAIMER: This is a pragmatic implementation for FY 2025-26 (AY 2026-27)
to drive accurate monthly TDS deduction. Companies MUST have a qualified
CA verify the actual annual tax liability and Form 24Q filings.

Old vs New regime — what differs (FY 2025-26):
  - Standard deduction: Old = Rs 50,000; New = Rs 75,000
  - Old regime: HRA exemption, 80C (1.5L), 80D, 80CCD(1B) (50k), 80E, 80G, Sec 24 (2L), etc.
  - New regime: most exemptions/deductions removed; tax slabs are lower
  - 87A rebate: Old at income <= 5L, New at income <= 7L
"""
from decimal import Decimal, ROUND_HALF_UP
import datetime


D = lambda x: Decimal(str(x))  # noqa: E731
Z = D(0)


def round2(value) -> Decimal:
    return D(value).quantize(D("0.01"), rounding=ROUND_HALF_UP)


def current_financial_year(today: datetime.date | None = None) -> str:
    """Returns 'YYYY-YY' (April 1 → March 31)."""
    today = today or datetime.date.today()
    if today.month >= 4:
        start = today.year
    else:
        start = today.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


def fy_date_range(fy: str) -> tuple[datetime.date, datetime.date]:
    """FY '2025-26' → (2025-04-01, 2026-03-31)."""
    start_year = int(fy.split("-")[0])
    return datetime.date(start_year, 4, 1), datetime.date(start_year + 1, 3, 31)


# ─────────────────────────────────────────────────────────────────────────────
# Slab tables (FY 2025-26)
# ─────────────────────────────────────────────────────────────────────────────
NEW_REGIME_SLABS_FY26 = [
    (D("400000"),  D("0.00")),
    (D("800000"),  D("0.05")),
    (D("1200000"), D("0.10")),
    (D("1600000"), D("0.15")),
    (D("2000000"), D("0.20")),
    (D("2400000"), D("0.25")),
    # > 24L → 30%
]

OLD_REGIME_SLABS_FY26 = [
    (D("250000"),  D("0.00")),
    (D("500000"),  D("0.05")),
    (D("1000000"), D("0.20")),
    # > 10L → 30%
]


def _apply_slabs(taxable: Decimal, slabs: list, top_rate: Decimal = D("0.30")) -> Decimal:
    """Walk the slabs and sum tax. taxable in INR."""
    tax = Z
    prev = Z
    remaining = max(taxable, Z)
    for limit, rate in slabs:
        bracket = min(remaining, limit - prev)
        if bracket <= 0:
            break
        tax += bracket * rate
        remaining -= bracket
        prev = limit
    if remaining > 0:
        tax += remaining * top_rate
    return tax


# ─────────────────────────────────────────────────────────────────────────────
# HRA exemption (Old regime only)
# ─────────────────────────────────────────────────────────────────────────────
def hra_exemption_annual(*, basic_annual: Decimal, hra_received_annual: Decimal,
                         rent_paid_annual: Decimal, is_metro: bool) -> Decimal:
    """Least of: HRA received, rent paid - 10% basic, 50% (metro) / 40% basic."""
    if hra_received_annual <= 0 or rent_paid_annual <= 0:
        return Z
    rent_minus_10pct = rent_paid_annual - (basic_annual * D("0.10"))
    pct_of_basic = basic_annual * (D("0.50") if is_metro else D("0.40"))
    return max(Z, min(hra_received_annual, rent_minus_10pct, pct_of_basic))


# ─────────────────────────────────────────────────────────────────────────────
# 80D cap (health insurance)
# ─────────────────────────────────────────────────────────────────────────────
def sec_80d_eligible(self_amt: Decimal, parents_amt: Decimal,
                     parents_are_senior: bool) -> Decimal:
    """Self up to 25k, parents up to 25k (50k if senior)."""
    self_cap = D("25000")
    parents_cap = D("50000") if parents_are_senior else D("25000")
    return min(self_amt, self_cap) + min(parents_amt, parents_cap)


# ─────────────────────────────────────────────────────────────────────────────
# Main: compute_annual_tax
# ─────────────────────────────────────────────────────────────────────────────
def compute_annual_tax(*, regime: str, gross_salary_annual: Decimal,
                       basic_annual: Decimal = Z, hra_received_annual: Decimal = Z,
                       declaration=None, other_income_annual: Decimal = Z) -> dict:
    """
    Compute annual tax liability for an employee.

    Returns a dict suitable for Form 16 generation:
      {
        "regime": "new" | "old",
        "gross_salary": ...,
        "exemptions": {...},
        "standard_deduction": ...,
        "chapter_via": {...},
        "taxable_income": ...,
        "tax_before_rebate": ...,
        "rebate_87a": ...,
        "tax_after_rebate": ...,
        "cess": ...,
        "total_tax": ...,
      }
    """
    gross = D(gross_salary_annual) + D(other_income_annual)

    exemptions = {}
    chapter_via = {}

    if regime == "new":
        std_deduction = D("75000")
        # Most exemptions/deductions removed in new regime
        taxable = max(Z, gross - std_deduction)
        tax = _apply_slabs(taxable, NEW_REGIME_SLABS_FY26)
        # 87A rebate: full tax remitted if income <= 7L (effectively up to 12L after std)
        rebate_threshold = D("1200000")  # post std deduction in FY 25-26
        rebate = tax if taxable <= rebate_threshold else Z
    else:  # old regime
        std_deduction = D("50000")
        # HRA exemption
        if declaration and declaration.rent_paid_annual > 0:
            hra_exempt = hra_exemption_annual(
                basic_annual=D(basic_annual),
                hra_received_annual=D(hra_received_annual),
                rent_paid_annual=D(declaration.rent_paid_annual),
                is_metro=declaration.is_metro_city,
            )
            exemptions["HRA"] = hra_exempt
        else:
            exemptions["HRA"] = Z

        total_exemptions = sum(exemptions.values(), Z)
        after_exemptions = max(Z, gross - total_exemptions - std_deduction)

        # Chapter VI-A deductions
        if declaration:
            chapter_via["80C"] = min(declaration.total_80c, D("150000"))
            chapter_via["80D"] = sec_80d_eligible(
                declaration.sec_80d_self,
                declaration.sec_80d_parents,
                declaration.sec_80d_parents_senior,
            )
            chapter_via["80CCD(1B)"] = min(declaration.sec_80ccd_1b_nps, D("50000"))
            chapter_via["80E"] = declaration.sec_80e_education_loan  # no cap
            chapter_via["80G"] = declaration.sec_80g_donations  # simplified — full deduction
            chapter_via["24(b)"] = min(declaration.sec_24_home_loan_interest, D("200000"))

        total_chapter_via = sum(chapter_via.values(), Z)
        taxable = max(Z, after_exemptions - total_chapter_via)
        tax = _apply_slabs(taxable, OLD_REGIME_SLABS_FY26)
        # 87A rebate: full tax remitted if income <= 5L
        rebate = tax if taxable <= D("500000") else Z

    tax_after_rebate = max(Z, tax - rebate)
    cess = tax_after_rebate * D("0.04")  # 4% health & education cess
    total_tax = round2(tax_after_rebate + cess)

    return {
        "regime": regime,
        "gross_salary": round2(D(gross_salary_annual)),
        "other_income": round2(D(other_income_annual)),
        "exemptions": {k: round2(v) for k, v in exemptions.items()},
        "standard_deduction": round2(std_deduction),
        "chapter_via": {k: round2(v) for k, v in chapter_via.items()},
        "taxable_income": round2(taxable),
        "tax_before_rebate": round2(tax),
        "rebate_87a": round2(rebate),
        "tax_after_rebate": round2(tax_after_rebate),
        "cess": round2(cess),
        "total_tax": total_tax,
    }


def monthly_tds(tenant, employee, gross_monthly: Decimal,
                basic_monthly: Decimal, hra_monthly: Decimal,
                today: datetime.date | None = None) -> Decimal:
    """
    Calculate monthly TDS based on employee's tax declaration.
    Falls back to new-regime flat calculation if no declaration on file.
    """
    today = today or datetime.date.today()
    fy = current_financial_year(today)

    # Months remaining in FY (including current)
    fy_start, _ = fy_date_range(fy)
    if today.month >= 4:
        months_elapsed = today.month - 4
    else:
        months_elapsed = today.month + 8
    months_remaining = 12 - months_elapsed
    months_remaining = max(months_remaining, 1)

    # Fetch declaration if present
    from .models import TaxDeclaration
    declaration = TaxDeclaration.objects.filter(
        tenant=tenant, employee=employee, financial_year=fy,
    ).first()
    regime = declaration.regime if declaration else "new"

    annual_gross = D(gross_monthly) * 12
    annual_basic = D(basic_monthly) * 12
    annual_hra = D(hra_monthly) * 12
    other_income = declaration.other_income_annual if declaration else Z

    result = compute_annual_tax(
        regime=regime,
        gross_salary_annual=annual_gross,
        basic_annual=annual_basic,
        hra_received_annual=annual_hra,
        declaration=declaration,
        other_income_annual=other_income,
    )

    # Spread remaining liability evenly over remaining months
    return round2(result["total_tax"] / 12)
