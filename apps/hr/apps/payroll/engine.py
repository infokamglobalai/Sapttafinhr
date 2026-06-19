"""
Payroll calculation engine.

Calculation order:
  1. Determine working days and LOP days from attendance summary
  2. Compute gross earnings (pro-rated for LOP)
  3. Compute statutory deductions (PF, ESI, PT, LWF, TDS)
  4. Compute loan EMI deductions
  5. Compute reimbursements to add
  6. Final net payable

LEGAL FLAG: TDS is calculated as a flat slab (simplified).
  Full regime-based TDS with 80C declarations is deferred to v2.
  Recommend clients verify final TDS with their CA before filing Form 24Q.
"""
import calendar
import datetime
from decimal import Decimal, ROUND_HALF_UP

from .models import (
    EmployeeSalary, StatutorySetting, PayrollRecord,
    EmployeeLoan, ExpenseClaim,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def round2(value) -> Decimal:
    """Round to 2 decimal places, half-up."""
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_working_days_in_month(year: int, month: int) -> int:
    """Count Mon–Sat days in the month (standard 26-day payroll month)."""
    _, days_in_month = calendar.monthrange(year, month)
    return sum(
        1 for d in range(1, days_in_month + 1)
        if datetime.date(year, month, d).weekday() != 6  # exclude Sunday
    )


def get_statutory_setting(tenant, statutory_type: str, state_code: str = ""):
    """Fetch the most recent active statutory setting for a type/state."""
    return (
        StatutorySetting.objects.filter(
            tenant=tenant,
            statutory_type=statutory_type,
            state_code=state_code,
            is_active=True,
        )
        .order_by("-effective_date")
        .first()
    )


# ---------------------------------------------------------------------------
# PT slab calculation
# ---------------------------------------------------------------------------
def calculate_pt(gross_salary: Decimal, slabs: list) -> Decimal:
    """
    Calculate Professional Tax from slab config.
    slabs: [{"min": 0, "max": 15000, "amount": 0}, {"min": 15001, "max": null, "amount": 200}]
    """
    for slab in slabs:
        min_val = Decimal(str(slab["min"]))
        max_val = Decimal(str(slab["max"])) if slab.get("max") is not None else None
        amount = Decimal(str(slab["amount"]))
        if gross_salary >= min_val and (max_val is None or gross_salary <= max_val):
            return amount
    return Decimal("0")


# ---------------------------------------------------------------------------
# TDS flat-slab (simplified — v1 only)
# LEGAL FLAG: This is a rough estimate. Do not use for Form 24Q filing.
# ---------------------------------------------------------------------------
def calculate_tds_flat(annual_gross: Decimal) -> Decimal:
    """
    Flat-slab TDS per new tax regime (FY 2024-25 slabs, India).
    Returns MONTHLY TDS amount.
    """
    slabs = [
        (Decimal("300000"), Decimal("0")),
        (Decimal("600000"), Decimal("0.05")),
        (Decimal("900000"), Decimal("0.10")),
        (Decimal("1200000"), Decimal("0.15")),
        (Decimal("1500000"), Decimal("0.20")),
    ]
    annual_tax = Decimal("0")
    remaining = annual_gross
    prev_limit = Decimal("0")

    for limit, rate in slabs:
        taxable = min(remaining, limit - prev_limit)
        if taxable <= 0:
            break
        annual_tax += taxable * rate
        remaining -= taxable
        prev_limit = limit

    if remaining > 0:
        annual_tax += remaining * Decimal("0.30")

    # Rebate u/s 87A (income ≤ 7L pays 0 tax)
    if annual_gross <= Decimal("700000"):
        annual_tax = Decimal("0")

    # 4% health & education cess
    annual_tax *= Decimal("1.04")

    return round2(annual_tax / 12)


# ---------------------------------------------------------------------------
# Core engine
# ---------------------------------------------------------------------------
def compute_payroll_record(
    tenant,
    employee,
    payroll_run,
    year: int,
    month: int,
) -> PayrollRecord:
    """
    Compute a complete PayrollRecord for one employee in one payroll run.
    Idempotent — overwrites existing record for the same run+employee.
    """
    from apps.tenants.jurisdiction import is_gcc_payroll

    if is_gcc_payroll(getattr(tenant, "payroll_jurisdiction", "IN")):
        from .gcc_engine import compute_gcc_payroll_record
        return compute_gcc_payroll_record(tenant, employee, payroll_run, year, month)

    currency = getattr(tenant, "currency", "INR") or "INR"
    from apps.attendance.models import MonthlyAttendanceSummary

    import calendar

    # ── 1. Get salary details ──────────────────────────────────────────────
    month_end = datetime.date(year, month, calendar.monthrange(year, month)[1])
    salary = EmployeeSalary.objects.filter(
        tenant=tenant,
        employee=employee,
        effective_date__lte=month_end,
        is_active=True,
    ).order_by("-effective_date").first()

    if not salary:
        raise ValueError(f"No active salary found for {employee}.")

    existing = PayrollRecord.objects.filter(
        tenant=tenant, payroll_run=payroll_run, employee=employee,
    ).first()
    lop_override = existing.lop_override if existing else None
    bonus_amount = existing.bonus_amount if existing else Decimal("0")
    manual_deduction = existing.manual_deduction if existing else Decimal("0")
    hr_notes = existing.hr_notes if existing else ""

    structure = salary.structure
    components = list(
        structure.structure_components.select_related("component").order_by("sequence_order")
    )

    # ── 2. Attendance / LOP ───────────────────────────────────────────────
    if lop_override is not None:
        lop_days = Decimal(str(lop_override))
    else:
        try:
            att_summary = MonthlyAttendanceSummary.objects.get(
                tenant=tenant, employee=employee, year=year, month=month
            )
            lop_days = att_summary.lop_days + Decimal(str(att_summary.absent_days))
        except MonthlyAttendanceSummary.DoesNotExist:
            lop_days = Decimal("0")

    working_days = get_working_days_in_month(year, month)
    paid_days = Decimal(str(working_days)) - lop_days
    paid_days = max(paid_days, Decimal("0"))
    lop_fraction = paid_days / Decimal(str(working_days)) if working_days > 0 else Decimal("1")

    # ── 3. Earnings computation ────────────────────────────────────────────
    basic_monthly = salary.basic_monthly * lop_fraction
    basic_monthly = round2(basic_monthly)

    overrides = salary.component_overrides or {}

    earnings_detail = {}
    deductions_detail = {}
    total_gross = Decimal("0")
    total_employer_cost = Decimal("0")

    # Build a context dict for formula evaluation
    calc_context = {
        "basic": float(basic_monthly),
        "gross": 0,  # will be updated after first pass
    }

    # First pass: compute all earnings
    for sc in components:
        comp = sc.component
        if comp.component_type != "earning" or not comp.is_active:
            continue

        # Check override
        if comp.code in overrides:
            amount = round2(Decimal(str(overrides[comp.code])) * lop_fraction)
        elif comp.calc_type == "fixed":
            amount = round2((comp.calc_value or 0) * lop_fraction)
        elif comp.calc_type == "pct_of_basic":
            amount = round2(basic_monthly * (comp.calc_value or 0) / 100)
        elif comp.calc_type == "formula":
            try:
                amount = round2(eval(comp.formula, {"__builtins__": {}}, calc_context))  # noqa: S307
            except Exception:
                amount = Decimal("0")
        else:
            amount = Decimal("0")

        earnings_detail[comp.code] = {
            "name": comp.name,
            "amount": float(amount),
            "is_taxable": comp.is_taxable,
        }
        calc_context[comp.code.lower()] = float(amount)
        total_gross += amount

    calc_context["gross"] = float(total_gross)

    # Bonus / incentive — include in gross before statutory deductions
    bonus_amount = round2(bonus_amount or 0)
    if bonus_amount > 0:
        total_gross += bonus_amount
        earnings_detail["BONUS"] = {
            "name": "Bonus / Incentive",
            "amount": float(bonus_amount),
            "is_taxable": True,
        }
        calc_context["gross"] = float(total_gross)

    # Gratuity accrual (employer provision — not paid to employee this month)
    from .gratuity import monthly_gratuity_accrual

    gratuity_accrual = monthly_gratuity_accrual(basic_monthly)
    if gratuity_accrual > 0:
        earnings_detail["GRAT_ACCR"] = {
            "name": "Gratuity accrual (employer)",
            "amount": float(gratuity_accrual),
            "is_taxable": False,
            "employer_only": True,
        }

    # ── 4. Statutory deductions ───────────────────────────────────────────
    state_code = employee.work_state_code or ""

    # PF (employee: 12% of basic, capped at PF wage ceiling)
    pf_setting = get_statutory_setting(tenant, "pf")
    pf_employee = Decimal("0")
    pf_employer = Decimal("0")
    if pf_setting:
        pf_wage = min(basic_monthly, pf_setting.wage_ceiling or Decimal("15000"))
        pf_employee = round2(pf_wage * (pf_setting.employee_rate or Decimal("0.12")))
        pf_employer = round2(pf_wage * (pf_setting.employer_rate or Decimal("0.1208")))

    # ESI (employee: 0.75% of gross if gross ≤ ESI ceiling)
    esi_setting = get_statutory_setting(tenant, "esi")
    esi_employee = Decimal("0")
    esi_employer = Decimal("0")
    if esi_setting and total_gross <= (esi_setting.wage_ceiling or Decimal("21000")):
        esi_employee = round2(total_gross * (esi_setting.employee_rate or Decimal("0.0075")))
        esi_employer = round2(total_gross * (esi_setting.employer_rate or Decimal("0.0325")))

    # Professional Tax (slab-based, state-specific)
    pt_setting = get_statutory_setting(tenant, "pt", state_code)
    pt = Decimal("0")
    if pt_setting and pt_setting.slabs:
        # PT is on monthly gross
        pt = calculate_pt(total_gross, pt_setting.slabs)

    # LWF (typically a small fixed annual amount, deducted monthly/twice-yearly)
    lwf_setting = get_statutory_setting(tenant, "lwf", state_code)
    lwf_employee = Decimal("0")
    lwf_employer = Decimal("0")
    if lwf_setting:
        lwf_employee = round2(lwf_setting.employee_rate or 0)
        lwf_employer = round2(lwf_setting.employer_rate or 0)

    # TDS — use declaration-aware calculator if a declaration exists, else fall back
    from .tax import monthly_tds
    hra_monthly_amt = Decimal(str(earnings_detail.get("HRA", {}).get("amount", 0)))
    try:
        tds = monthly_tds(
            tenant=tenant, employee=employee,
            gross_monthly=total_gross,
            basic_monthly=basic_monthly,
            hra_monthly=hra_monthly_amt,
            today=datetime.date(year, month, 1),
        )
    except Exception:
        tds = calculate_tds_flat(total_gross * 12)

    # ── 5. Loan deductions ────────────────────────────────────────────────
    loan_deduction = Decimal("0")
    active_loans = EmployeeLoan.objects.filter(
        tenant=tenant, employee=employee, status="active"
    )
    for loan in active_loans:
        loan_deduction += loan.emi_amount
        loan.outstanding_amount = max(Decimal("0"), loan.outstanding_amount - loan.emi_amount)
        loan.paid_installments += 1
        if loan.outstanding_amount <= 0:
            loan.status = "closed"
        loan.save(update_fields=["outstanding_amount", "paid_installments", "status"])

    # ── 6. Approved expense reimbursements (add to net, not gross) ─────────
    approved_reimbursements = Decimal("0")
    claims = ExpenseClaim.objects.filter(
        tenant=tenant, employee=employee, status="approved", paid_in_run__isnull=True
    )
    for claim in claims:
        approved_reimbursements += claim.amount
        claim.status = "paid"
        claim.paid_in_run = payroll_run
        claim.save(update_fields=["status", "paid_in_run"])

    # ── 7. Totals ─────────────────────────────────────────────────────────
    manual_deduction = round2(manual_deduction or 0)

    deductions_detail = {
        "PF_EMP": {"name": "PF (Employee)", "amount": float(pf_employee)},
        "ESI_EMP": {"name": "ESI (Employee)", "amount": float(esi_employee)},
        "PT": {"name": "Professional Tax", "amount": float(pt)},
        "LWF_EMP": {"name": "Labour Welfare Fund", "amount": float(lwf_employee)},
        "TDS": {"name": "TDS", "amount": float(tds)},
        "LOAN": {"name": "Loan Deduction", "amount": float(loan_deduction)},
    }
    if manual_deduction > 0:
        deductions_detail["MANUAL"] = {
            "name": "Other Deduction",
            "amount": float(manual_deduction),
        }

    total_deductions = (
        pf_employee + esi_employee + pt + lwf_employee + tds + loan_deduction + manual_deduction
    )
    net_payable = round2(total_gross - total_deductions + approved_reimbursements)
    if approved_reimbursements > 0:
        earnings_detail["REIMB"] = {
            "name": "Reimbursements",
            "amount": float(approved_reimbursements),
            "is_taxable": False,
        }

    # ── 9. Persist ────────────────────────────────────────────────────────
    record, _ = PayrollRecord.objects.update_or_create(
        tenant=tenant, payroll_run=payroll_run, employee=employee,
        defaults={
            "lop_days": lop_days,
            "lop_override": lop_override,
            "bonus_amount": bonus_amount,
            "manual_deduction": manual_deduction,
            "hr_notes": hr_notes,
            "paid_days": paid_days,
            "working_days": working_days,
            "basic": basic_monthly,
            "hra": Decimal(str(earnings_detail.get("HRA", {}).get("amount", 0))),
            "conveyance": Decimal(str(earnings_detail.get("CONV", {}).get("amount", 0))),
            "special_allowance": Decimal(str(earnings_detail.get("SPECIAL", {}).get("amount", 0))),
            "other_earnings": approved_reimbursements,
            "gross_earnings": total_gross,
            "pf_employee": pf_employee,
            "esi_employee": esi_employee,
            "professional_tax": pt,
            "lwf_employee": lwf_employee,
            "tds": tds,
            "loan_deduction": loan_deduction,
            "total_deductions": total_deductions,
            "pf_employer": pf_employer,
            "esi_employer": esi_employer,
            "lwf_employer": lwf_employer,
            "net_payable": net_payable,
            "earnings_detail": earnings_detail,
            "deductions_detail": deductions_detail,
        },
    )
    return record
