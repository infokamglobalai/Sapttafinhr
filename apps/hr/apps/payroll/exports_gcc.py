"""GCC payroll exports — WPS SIF, bank transfer, PIFSS, indemnity liability."""
from __future__ import annotations

import csv
import io
from decimal import Decimal

from utils.money import currency_decimal_places, format_money


def build_wps_sif_csv(tenant, payroll_run) -> str:
    """
    WPS Salary Information File (CSV) — simplified layout compatible with
    UAE/KSA bank upload workflows. Validate field mapping with your bank.
    """
    records = (
        payroll_run.records.select_related("employee")
        .prefetch_related("employee__bank_accounts")
        .filter(net_payable__gt=0)
        .order_by("employee__employee_code")
    )
    currency = tenant.currency or "AED"
    period_start = f"{payroll_run.year:04d}-{payroll_run.month:02d}-01"
    # Last day approx — banks often want period end
    import calendar
    last_day = calendar.monthrange(payroll_run.year, payroll_run.month)[1]
    period_end = f"{payroll_run.year:04d}-{payroll_run.month:02d}-{last_day:02d}"

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "Employee Code", "Employee Name", "IBAN", "SWIFT/BIC", "Bank Name",
        "Fixed Salary", "Variable Pay", "Total Pay", "Currency",
        "Period Start", "Period End", "Days Paid", "Employer Reference",
    ])
    employer_ref = tenant.subdomain.upper()

    for rec in records:
        emp = rec.employee
        bank = emp.bank_accounts.filter(is_primary=True).first()
        iban = bank.account_number if bank else ""
        fixed = rec.basic + rec.hra
        variable = rec.gross_earnings - fixed
        writer.writerow([
            emp.employee_code,
            emp.full_name,
            iban,
            bank.ifsc_code if bank else "",
            bank.bank_name if bank else "",
            f"{fixed:.{currency_decimal_places(currency)}f}",
            f"{max(variable, Decimal('0')):.{currency_decimal_places(currency)}f}",
            f"{rec.net_payable:.{currency_decimal_places(currency)}f}",
            currency,
            period_start,
            period_end,
            float(rec.paid_days),
            employer_ref,
        ])
    return buf.getvalue()


def build_gcc_bank_transfer_csv(tenant, payroll_run) -> str:
    """Kuwait/GCC bank bulk transfer CSV — IBAN, amount, beneficiary, reference."""
    records = (
        payroll_run.records.select_related("employee")
        .prefetch_related("employee__bank_accounts")
        .filter(net_payable__gt=0)
        .order_by("employee__employee_code")
    )
    currency = tenant.currency or "KWD"
    places = currency_decimal_places(currency)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Beneficiary Name", "IBAN", "SWIFT/BIC", "Amount", "Currency", "Payment Reference", "Employee Code"])

    for rec in records:
        emp = rec.employee
        bank = emp.bank_accounts.filter(is_primary=True).first()
        if not bank or not bank.account_number:
            continue
        ref = f"SAL-{payroll_run.year}{payroll_run.month:02d}-{emp.employee_code}"
        writer.writerow([
            bank.account_holder_name or emp.full_name,
            bank.account_number,
            bank.ifsc_code or "",
            f"{rec.net_payable:.{places}f}",
            currency,
            ref,
            emp.employee_code,
        ])
    return buf.getvalue()


def pifss_rows(tenant, payroll_run) -> list[list]:
    """Rows for PIFSS contribution report (Kuwaiti nationals with PIFSS deductions)."""
    currency = tenant.currency or "KWD"
    places = currency_decimal_places(currency)
    rows = [
        ["Employee Code", "Name", "Civil ID", "PIFSS No.", "Basic (KWD)", "Employee PIFSS", "Employer PIFSS", "Total"],
    ]
    records = payroll_run.records.select_related("employee").filter(pf_employee__gt=0)
    for rec in records:
        emp = rec.employee
        civil = ""
        try:
            civil = emp.civil_id or ""
        except Exception:
            pass
        if civil and len(civil) > 4:
            civil = f"****{civil[-4:]}"
        rows.append([
            emp.employee_code,
            emp.full_name,
            civil,
            emp.pifss_number or "",
            f"{rec.basic:.{places}f}",
            f"{rec.pf_employee:.{places}f}",
            f"{rec.pf_employer:.{places}f}",
            f"{(rec.pf_employee + rec.pf_employer):.{places}f}",
        ])
    return rows


def indemnity_liability_rows(tenant) -> list[list]:
    """Active employees — accrued indemnity/gratuity liability snapshot."""
    from apps.employees.models import Employee
    from apps.payroll.settlement import settlement_estimate

    currency = tenant.currency or "KWD"
    places = currency_decimal_places(currency)
    rows = [["Employee Code", "Name", "Years", "Estimate", "Currency", "Note"]]
    for emp in Employee.objects.filter(tenant=tenant, is_active=True).order_by("employee_code"):
        est = settlement_estimate(emp, tenant=tenant)
        rows.append([
            emp.employee_code,
            emp.full_name,
            est.get("years", 0),
            f"{Decimal(str(est.get('amount', 0))):.{places}f}",
            currency,
            est.get("note", "")[:80],
        ])
    return rows
