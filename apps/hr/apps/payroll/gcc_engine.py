"""GCC payroll engine — no India statutory; Kuwait adds PIFSS + indemnity accrual."""
from __future__ import annotations

import calendar
import datetime
from decimal import Decimal

from apps.tenants.jurisdiction import normalise_jurisdiction
from utils.money import round_money

from .engine import get_working_days_in_month, get_statutory_setting
from .kuwait import calculate_pifss, monthly_indemnity_accrual, years_of_service
from .models import EmployeeLoan, EmployeeSalary, ExpenseClaim, PayrollRecord


def compute_gcc_payroll_record(tenant, employee, payroll_run, year: int, month: int) -> PayrollRecord:
    """Payroll for GCC tenants — earnings, LOP, loans; KW adds PIFSS + indemnity."""
    from apps.attendance.models import MonthlyAttendanceSummary

    currency = tenant.currency or "AED"
    month_end = datetime.date(year, month, calendar.monthrange(year, month)[1])
    salary = (
        EmployeeSalary.objects.filter(
            tenant=tenant,
            employee=employee,
            effective_date__lte=month_end,
            is_active=True,
        )
        .order_by("-effective_date")
        .first()
    )
    if not salary:
        raise ValueError(f"No active salary found for {employee}.")

    existing = PayrollRecord.objects.filter(
        tenant=tenant, payroll_run=payroll_run, employee=employee,
    ).first()
    lop_override = existing.lop_override if existing else None
    bonus_amount = existing.bonus_amount if existing else Decimal("0")
    manual_deduction = existing.manual_deduction if existing else Decimal("0")
    hr_notes = existing.hr_notes if existing else ""

    if lop_override is not None:
        lop_days = Decimal(str(lop_override))
    else:
        try:
            att = MonthlyAttendanceSummary.objects.get(
                tenant=tenant, employee=employee, year=year, month=month
            )
            lop_days = att.lop_days + Decimal(str(att.absent_days))
        except MonthlyAttendanceSummary.DoesNotExist:
            lop_days = Decimal("0")

    working_days = get_working_days_in_month(year, month)
    paid_days = max(Decimal(str(working_days)) - lop_days, Decimal("0"))
    lop_fraction = paid_days / Decimal(str(working_days)) if working_days > 0 else Decimal("1")

    structure = salary.structure
    components = list(
        structure.structure_components.select_related("component").order_by("sequence_order")
    )
    overrides = salary.component_overrides or {}

    basic_monthly = round_money(salary.basic_monthly * lop_fraction, currency)
    earnings_detail = {}
    deductions_detail = {}
    total_gross = Decimal("0")
    calc_context = {"basic": float(basic_monthly), "gross": 0}

    for sc in components:
        comp = sc.component
        if comp.component_type != "earning" or not comp.is_active:
            continue
        if comp.code in overrides:
            amount = round_money(Decimal(str(overrides[comp.code])) * lop_fraction, currency)
        elif comp.calc_type == "fixed":
            amount = round_money((comp.calc_value or 0) * lop_fraction, currency)
        elif comp.calc_type == "pct_of_basic":
            amount = round_money(basic_monthly * (comp.calc_value or 0) / 100, currency)
        elif comp.calc_type == "formula":
            try:
                amount = round_money(
                    eval(comp.formula, {"__builtins__": {}}, calc_context),  # noqa: S307
                    currency,
                )
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

    bonus_amount = round_money(bonus_amount or 0, currency)
    if bonus_amount > 0:
        total_gross += bonus_amount
        earnings_detail["BONUS"] = {"name": "Bonus / Incentive", "amount": float(bonus_amount), "is_taxable": True}

    housing_monthly = Decimal(str(earnings_detail.get("HOUSING", {}).get("amount", 0)))
    if housing_monthly == 0:
        housing_monthly = Decimal(str(earnings_detail.get("HRA", {}).get("amount", 0)))

    jurisdiction = normalise_jurisdiction(tenant.payroll_jurisdiction)
    pifss_employee = Decimal("0")
    pifss_employer = Decimal("0")
    if jurisdiction == "KW" and getattr(employee, "is_kuwaiti_national", False):
        pifss_setting = get_statutory_setting(tenant, "pifss")
        if pifss_setting:
            pifss_employee, pifss_employer = calculate_pifss(
                basic_monthly,
                employee_rate=pifss_setting.employee_rate or Decimal("0.055"),
                employer_rate=pifss_setting.employer_rate or Decimal("0.115"),
                currency=currency,
            )

    if jurisdiction == "SA" and getattr(employee, "nationality", "").upper() == "SA":
        from .ksa import calculate_gosi
        gosi_setting = get_statutory_setting(tenant, "gosi")
        if gosi_setting:
            pifss_employee, pifss_employer = calculate_gosi(
                basic_monthly,
                is_saudi=True,
                currency=currency,
                employee_rate=gosi_setting.employee_rate or Decimal("0.0975"),
                employer_rate=gosi_setting.employer_rate or Decimal("0.1175"),
            )
        else:
            pifss_employee, pifss_employer = calculate_gosi(
                basic_monthly, is_saudi=True, currency=currency,
            )

    yrs = years_of_service(employee.date_of_joining, month_end)
    indemnity_accrual = Decimal("0")
    if jurisdiction == "KW":
        indemnity_accrual = monthly_indemnity_accrual(
            basic_monthly, housing_monthly, years=yrs, currency=currency,
        )
    elif jurisdiction == "AE":
        from .uae import monthly_uae_gratuity_accrual
        indemnity_accrual = monthly_uae_gratuity_accrual(basic_monthly, years=yrs, currency=currency)
    elif jurisdiction == "SA":
        from .ksa import monthly_ksa_gratuity_accrual
        indemnity_accrual = monthly_ksa_gratuity_accrual(basic_monthly, years=yrs, currency=currency)

    if indemnity_accrual > 0:
        label = "Indemnity accrual (employer)" if jurisdiction == "KW" else "EOS accrual (employer)"
        earnings_detail["INDEM_ACCR"] = {
            "name": label,
            "amount": float(indemnity_accrual),
            "is_taxable": False,
            "employer_only": True,
        }

    loan_deduction = Decimal("0")
    for loan in EmployeeLoan.objects.filter(tenant=tenant, employee=employee, status="active"):
        loan_deduction += loan.emi_amount
        loan.outstanding_amount = max(Decimal("0"), loan.outstanding_amount - loan.emi_amount)
        loan.paid_installments += 1
        if loan.outstanding_amount <= 0:
            loan.status = "closed"
        loan.save(update_fields=["outstanding_amount", "paid_installments", "status"])
    loan_deduction = round_money(loan_deduction, currency)

    approved_reimbursements = Decimal("0")
    for claim in ExpenseClaim.objects.filter(
        tenant=tenant, employee=employee, status="approved", paid_in_run__isnull=True
    ):
        approved_reimbursements += claim.amount
        claim.status = "paid"
        claim.paid_in_run = payroll_run
        claim.save(update_fields=["status", "paid_in_run"])
    approved_reimbursements = round_money(approved_reimbursements, currency)

    manual_deduction = round_money(manual_deduction or 0, currency)
    deductions_detail = {
        "LOAN": {"name": "Loan Deduction", "amount": float(loan_deduction)},
    }
    if pifss_employee > 0:
        stat_label = "GOSI (Employee)" if jurisdiction == "SA" else "PIFSS (Employee)"
        deductions_detail["PIFSS_EMP"] = {"name": stat_label, "amount": float(pifss_employee)}

    total_deductions = pifss_employee + loan_deduction + manual_deduction
    net_payable = round_money(total_gross - total_deductions + approved_reimbursements, currency)

    if approved_reimbursements > 0:
        earnings_detail["REIMB"] = {
            "name": "Reimbursements",
            "amount": float(approved_reimbursements),
            "is_taxable": False,
        }

    record, _ = PayrollRecord.objects.update_or_create(
        tenant=tenant,
        payroll_run=payroll_run,
        employee=employee,
        defaults={
            "lop_days": lop_days,
            "lop_override": lop_override,
            "bonus_amount": bonus_amount,
            "manual_deduction": manual_deduction,
            "hr_notes": hr_notes,
            "paid_days": paid_days,
            "working_days": working_days,
            "basic": basic_monthly,
            "hra": housing_monthly,
            "conveyance": round_money(
                Decimal(str(earnings_detail.get("CONV", {}).get("amount", 0))), currency
            ),
            "special_allowance": round_money(
                Decimal(str(earnings_detail.get("SPECIAL", {}).get("amount", 0))), currency
            ),
            "other_earnings": approved_reimbursements,
            "gross_earnings": round_money(total_gross, currency),
            "pf_employee": pifss_employee,
            "pf_employer": pifss_employer,
            "esi_employee": Decimal("0"),
            "esi_employer": Decimal("0"),
            "professional_tax": Decimal("0"),
            "lwf_employee": Decimal("0"),
            "tds": Decimal("0"),
            "loan_deduction": loan_deduction,
            "other_deductions": manual_deduction,
            "total_deductions": round_money(total_deductions, currency),
            "lwf_employer": Decimal("0"),
            "net_payable": net_payable,
            "earnings_detail": earnings_detail,
            "deductions_detail": deductions_detail,
        },
    )
    return record
