"""
Form 16 (Part B) generation.

Part A is issued by TRACES (Income Tax dept.) and downloaded after Q4 TDS return
filing — we provide an upload field on Form16 for that. Part B (detailed salary
& tax breakup) is generated here from PayrollRecord data + TaxDeclaration.
"""
import datetime
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.files.base import ContentFile

from .models import Form16, PayrollRecord, EmployeeSalary, TaxDeclaration
from .tax import compute_annual_tax, fy_date_range
from apps.employees.models import Employee
from utils.pdf import render_pdf


Z = Decimal("0")


def _aggregate_records_for_fy(tenant, employee, fy: str) -> dict:
    """Sum PayrollRecord values across all months of the given FY."""
    start, end = fy_date_range(fy)
    # FY 'YYYY-YY' → months: Apr–Dec of start_year + Jan–Mar of end_year
    start_year = start.year
    end_year = end.year

    records = PayrollRecord.objects.filter(
        tenant=tenant, employee=employee,
    ).filter(
        # year_year_year__ filters not available; use OR:
    )
    # Filter by year+month manually
    records = [
        r for r in PayrollRecord.objects.filter(tenant=tenant, employee=employee)
        if (r.payroll_run.year == start_year and r.payroll_run.month >= 4)
        or (r.payroll_run.year == end_year and r.payroll_run.month <= 3)
    ]

    totals = {
        "basic": Z, "hra": Z, "conveyance": Z, "special": Z, "other": Z,
        "gross": Z, "pf_emp": Z, "esi_emp": Z, "pt": Z, "lwf_emp": Z,
        "tds": Z, "loan": Z, "net": Z, "months_paid": 0,
    }
    for r in records:
        totals["basic"] += r.basic
        totals["hra"] += r.hra
        totals["conveyance"] += r.conveyance
        totals["special"] += r.special_allowance
        totals["other"] += r.other_earnings
        totals["gross"] += r.gross_earnings
        totals["pf_emp"] += r.pf_employee
        totals["esi_emp"] += r.esi_employee
        totals["pt"] += r.professional_tax
        totals["lwf_emp"] += r.lwf_employee
        totals["tds"] += r.tds
        totals["loan"] += r.loan_deduction
        totals["net"] += r.net_payable
        totals["months_paid"] += 1
    return totals


@transaction.atomic
def generate_form16_part_b(tenant, employee, fy: str, generated_by=None) -> Form16:
    """Create or update a Form16 record + Part B PDF for one employee."""
    assessment_year = f"{int(fy.split('-')[0]) + 1}-{int(fy.split('-')[1]) + 1}"

    totals = _aggregate_records_for_fy(tenant, employee, fy)
    if totals["months_paid"] == 0:
        return None

    declaration = TaxDeclaration.objects.filter(
        tenant=tenant, employee=employee, financial_year=fy,
    ).first()
    regime = declaration.regime if declaration else "new"

    tax_calc = compute_annual_tax(
        regime=regime,
        gross_salary_annual=totals["gross"],
        basic_annual=totals["basic"],
        hra_received_annual=totals["hra"],
        declaration=declaration,
    )

    form16, _ = Form16.objects.update_or_create(
        tenant=tenant, employee=employee, financial_year=fy,
        defaults={
            "assessment_year": assessment_year,
            "gross_salary": totals["gross"],
            "total_exemptions": sum(tax_calc.get("exemptions", {}).values(), Z),
            "standard_deduction": tax_calc["standard_deduction"],
            "chapter_via_deductions": sum(tax_calc.get("chapter_via", {}).values(), Z),
            "taxable_income": tax_calc["taxable_income"],
            "tax_payable": tax_calc["total_tax"],
            "tds_deducted": totals["tds"],
            "regime": regime,
            "generated_by": generated_by,
        },
    )

    # ── Render Part B PDF ──────────────────────────────────────────────────
    context = {
        "tenant": tenant,
        "employee": employee,
        "fy": fy, "assessment_year": assessment_year,
        "form16": form16,
        "totals": totals,
        "tax_calc": tax_calc,
        "declaration": declaration,
        "generated_on": datetime.date.today(),
    }
    pdf_bytes = render_pdf("payroll/form16_part_b.html", context)
    filename = f"form16_partB_{employee.employee_code}_{fy}.pdf"
    form16.part_b_pdf.save(filename, ContentFile(pdf_bytes), save=True)
    return form16


def generate_form16_for_fy(tenant, fy: str, generated_by=None) -> tuple[int, int]:
    """Generate Form 16 Part B for every employee with payroll in this FY."""
    created = 0
    skipped = 0
    employees = Employee.objects.filter(tenant=tenant).distinct()
    for emp in employees:
        try:
            result = generate_form16_part_b(tenant, emp, fy, generated_by=generated_by)
            if result:
                created += 1
            else:
                skipped += 1
        except Exception:
            skipped += 1
    return created, skipped
