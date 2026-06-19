"""Recruitment workflow helpers — hire-to-employee handoff."""
from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee
from apps.employees.services import create_employee, generate_employee_code

from .models import JobApplication


@transaction.atomic
def convert_hired_application(application: JobApplication, *, created_by=None) -> Employee:
    """
    Create an employee record from a hired application and start onboarding.
    Idempotent if an employee with the same official email already exists.
    """
    from apps.payroll.bootstrap import bootstrap_payroll_for_tenant
    from apps.payroll.models import EmployeeSalary, SalaryStructure

    candidate = application.candidate
    job = application.job_opening
    tenant = application.tenant

    if candidate.email:
        existing = Employee.objects.filter(
            tenant=tenant, official_email__iexact=candidate.email.strip()
        ).first()
        if existing:
            return existing

    code_base = f"CAN{candidate.pk:04d}"
    code = code_base
    n = 1
    while Employee.objects.filter(tenant=tenant, employee_code=code).exists():
        code = f"{code_base}-{n}"
        n += 1

    emp, _ = create_employee(
        tenant,
        {
            "employee_code": code,
            "first_name": candidate.first_name or "New",
            "last_name": candidate.last_name or "Hire",
            "official_email": (candidate.email or "").strip(),
            "phone_primary": (candidate.phone or "").strip(),
            "date_of_joining": timezone.localdate(),
            "department": job.department,
            "designation": job.designation,
            "location": job.location,
            "employment_type": job.employment_type or "full_time",
            "employment_status": "active",
        },
        created_by=created_by,
    )

    if tenant.is_india_payroll or tenant.is_gcc_payroll:
        bootstrap_payroll_for_tenant(tenant, assign_salaries=False)
    structure = SalaryStructure.objects.filter(tenant=tenant, is_active=True).first()
    if structure and not EmployeeSalary.objects.filter(employee=emp, is_active=True).exists():
        ctc = candidate.current_ctc or candidate.expected_ctc or Decimal("600000")
        basic_monthly = (Decimal(str(ctc)) * Decimal("0.40") / 12).quantize(Decimal("0.01"))
        EmployeeSalary.objects.create(
            tenant=tenant,
            employee=emp,
            structure=structure,
            effective_date=emp.date_of_joining,
            ctc_annual=ctc,
            basic_monthly=basic_monthly,
            is_active=True,
        )

    note = f"\n[Converted to employee {emp.employee_code} on {timezone.localdate()}]"
    application.notes = (application.notes or "") + note
    application.save(update_fields=["notes", "updated_at"])
    return emp
