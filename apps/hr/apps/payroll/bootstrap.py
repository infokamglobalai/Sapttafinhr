"""Bootstrap payroll defaults for a new tenant (structures, statutory, salaries)."""
from __future__ import annotations

import datetime
from decimal import Decimal

from django.db import transaction

from apps.tenants.jurisdiction import normalise_jurisdiction


def bootstrap_payroll_for_tenant(tenant, *, default_ctc: int = 600000, assign_salaries: bool = True) -> dict:
    """Route to India or GCC bootstrap based on tenant jurisdiction."""
    if tenant.is_gcc_payroll:
        return bootstrap_gcc_payroll_defaults(tenant, assign_salaries=assign_salaries)
    return bootstrap_payroll_defaults(tenant, default_ctc=default_ctc, assign_salaries=assign_salaries)


@transaction.atomic
def bootstrap_gcc_payroll_defaults(tenant, *, assign_salaries: bool = True) -> dict:
    """
    Seed GCC salary structure (BASIC + HOUSING + TRANSPORT), regional statutory
    rates, and assign salaries. Safe to call multiple times (idempotent).
    """
    from apps.employees.models import Employee
    from apps.payroll.models import (
        EmployeeSalary,
        SalaryComponent,
        SalaryStructure,
        SalaryStructureComponent,
    )
    from apps.tenants.regional_packs import seed_kuwait_payroll_defaults, seed_ksa_payroll_defaults

    currency = tenant.currency or "AED"
    default_basic = {
        "KWD": Decimal("500"),
        "AED": Decimal("5000"),
        "SAR": Decimal("5000"),
        "BHD": Decimal("500"),
        "OMR": Decimal("500"),
        "QAR": Decimal("5000"),
    }.get(currency, Decimal("5000"))
    transport = {
        "KWD": Decimal("50"),
        "AED": Decimal("500"),
        "SAR": Decimal("500"),
    }.get(currency, Decimal("300"))

    components_spec = [
        ("BASIC", "Basic Salary", "earning", "fixed", 0, True, False, 10),
        ("HOUSING", "Housing Allowance", "earning", "pct_of_basic", 25, True, False, 20),
        ("TRANSPORT", "Transport Allowance", "earning", "fixed", transport, False, False, 30),
    ]
    comp_map = {}
    for code, name, ctype, calc, value, taxable, statutory, seq in components_spec:
        comp, _ = SalaryComponent.objects.update_or_create(
            tenant=tenant,
            code=code,
            defaults={
                "name": name,
                "component_type": ctype,
                "calc_type": calc,
                "calc_value": value,
                "is_taxable": taxable,
                "is_statutory": statutory,
                "sequence_order": seq,
                "is_active": True,
            },
        )
        comp_map[code] = comp

    jurisdiction = normalise_jurisdiction(tenant.payroll_jurisdiction)
    structure_name = f"Standard GCC ({jurisdiction})"
    structure, _ = SalaryStructure.objects.update_or_create(
        tenant=tenant,
        name=structure_name,
        defaults={
            "description": "BASIC + HOUSING(25%) + TRANSPORT — demo GCC pack",
            "is_active": True,
        },
    )
    for code, comp in comp_map.items():
        SalaryStructureComponent.objects.update_or_create(
            structure=structure,
            component=comp,
            defaults={"sequence_order": comp.sequence_order},
        )

    seed_kuwait_payroll_defaults(tenant)
    seed_ksa_payroll_defaults(tenant)

    today = datetime.date.today()
    assigned = 0
    if assign_salaries:
        housing = (default_basic * Decimal("0.25")).quantize(Decimal("0.001" if currency == "KWD" else "0.01"))
        monthly_gross = default_basic + housing + transport
        ctc_annual = (monthly_gross * 12).quantize(Decimal("0.001" if currency == "KWD" else "0.01"))
        for emp in Employee.objects.filter(tenant=tenant, employment_status="active"):
            if EmployeeSalary.objects.filter(tenant=tenant, employee=emp, is_active=True).exists():
                continue
            EmployeeSalary.objects.create(
                tenant=tenant,
                employee=emp,
                structure=structure,
                effective_date=emp.date_of_joining or today,
                ctc_annual=ctc_annual,
                basic_monthly=default_basic,
                is_active=True,
            )
            assigned += 1

    return {"structure": structure.name, "salaries_assigned": assigned}


@transaction.atomic
def bootstrap_payroll_defaults(tenant, *, default_ctc: int = 600000, assign_salaries: bool = True) -> dict:
    """
    Seed standard Indian salary structure, PF/ESI/PT, and assign salaries to employees
    who do not yet have one. Safe to call multiple times (idempotent).
    """
    from apps.employees.models import Employee
    from apps.payroll.models import (
        EmployeeSalary,
        SalaryComponent,
        SalaryStructure,
        SalaryStructureComponent,
        StatutorySetting,
    )

    ctc = Decimal(default_ctc)
    components_spec = [
        ("BASIC", "Basic", "earning", "fixed", 0, True, False, 10),
        ("HRA", "House Rent Allow.", "earning", "pct_of_basic", 40, True, False, 20),
        ("CONV", "Conveyance", "earning", "fixed", 1600, False, False, 30),
        ("SPECIAL", "Special Allowance", "earning", "fixed", 0, True, False, 40),
    ]
    comp_map = {}
    for code, name, ctype, calc, value, taxable, statutory, seq in components_spec:
        comp, _ = SalaryComponent.objects.update_or_create(
            tenant=tenant,
            code=code,
            defaults={
                "name": name,
                "component_type": ctype,
                "calc_type": calc,
                "calc_value": value,
                "is_taxable": taxable,
                "is_statutory": statutory,
                "sequence_order": seq,
                "is_active": True,
            },
        )
        comp_map[code] = comp

    structure, _ = SalaryStructure.objects.update_or_create(
        tenant=tenant,
        name="Standard Indian Structure",
        defaults={
            "description": "BASIC + HRA(40%) + CONV + Special",
            "is_active": True,
        },
    )
    for code, comp in comp_map.items():
        SalaryStructureComponent.objects.update_or_create(
            structure=structure,
            component=comp,
            defaults={"sequence_order": comp.sequence_order},
        )

    today = datetime.date.today()
    StatutorySetting.objects.update_or_create(
        tenant=tenant,
        statutory_type="pf",
        state_code="",
        effective_date=today,
        defaults={
            "employee_rate": Decimal("0.12"),
            "employer_rate": Decimal("0.1208"),
            "wage_ceiling": Decimal("15000"),
            "is_active": True,
        },
    )
    StatutorySetting.objects.update_or_create(
        tenant=tenant,
        statutory_type="esi",
        state_code="",
        effective_date=today,
        defaults={
            "employee_rate": Decimal("0.0075"),
            "employer_rate": Decimal("0.0325"),
            "wage_ceiling": Decimal("21000"),
            "is_active": True,
        },
    )
    StatutorySetting.objects.update_or_create(
        tenant=tenant,
        statutory_type="pt",
        state_code="IN-KA",
        effective_date=today,
        defaults={
            "slabs": [
                {"min": 0, "max": 14999, "amount": 0},
                {"min": 15000, "max": None, "amount": 200},
            ],
            "is_active": True,
        },
    )

    assigned = 0
    if assign_salaries:
        basic_monthly = (ctc * Decimal("0.40") / 12).quantize(Decimal("0.01"))
        for emp in Employee.objects.filter(tenant=tenant, employment_status="active"):
            if EmployeeSalary.objects.filter(tenant=tenant, employee=emp, is_active=True).exists():
                continue
            EmployeeSalary.objects.create(
                tenant=tenant,
                employee=emp,
                structure=structure,
                effective_date=emp.date_of_joining or today,
                ctc_annual=ctc,
                basic_monthly=basic_monthly,
                is_active=True,
            )
            assigned += 1

    return {"structure": structure.name, "salaries_assigned": assigned}
