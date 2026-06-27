"""Recruitment workflow helpers — hire-to-employee handoff."""
from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee
from apps.employees.services import create_employee

from .models import JobApplication


@transaction.atomic
def ensure_employee_for_application(
    application: JobApplication,
    *,
    created_by=None,
    setup_payroll: bool = False,
) -> Employee:
    """
    Return an employee record for a candidate/application.
    Used for offer-letter drafts (P5) and hired conversion.
    """
    candidate = application.candidate
    job = application.job_opening
    tenant = application.tenant

    if candidate.email:
        existing = Employee.objects.filter(
            tenant=tenant, official_email__iexact=candidate.email.strip()
        ).first()
        if existing:
            _sync_employee_from_job(existing, job)
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

    if setup_payroll:
        _bootstrap_candidate_payroll(tenant, emp, candidate)

    note = f"\n[Employee {emp.employee_code} linked from recruitment application #{application.pk} on {timezone.localdate()}]"
    application.notes = (application.notes or "") + note
    application.save(update_fields=["notes", "updated_at"])
    return emp


def _sync_employee_from_job(employee: Employee, job) -> None:
    updates = {}
    if job.department_id and not employee.department_id:
        updates["department"] = job.department
    if job.designation_id and not employee.designation_id:
        updates["designation"] = job.designation
    if job.location_id and not employee.location_id:
        updates["location"] = job.location
    if updates:
        for field, value in updates.items():
            setattr(employee, field, value)
        employee.save(update_fields=list(updates.keys()) + ["updated_at"])


def _bootstrap_candidate_payroll(tenant, emp, candidate) -> None:
    from apps.payroll.bootstrap import bootstrap_payroll_for_tenant
    from apps.payroll.models import EmployeeSalary, SalaryStructure

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


@transaction.atomic
def convert_hired_application(application: JobApplication, *, created_by=None) -> Employee:
    """
    Create an employee record from a hired application and start onboarding.
    Idempotent if an employee with the same official email already exists.
    """
    emp = ensure_employee_for_application(
        application, created_by=created_by, setup_payroll=True
    )
    note = f"\n[Converted to employee {emp.employee_code} on {timezone.localdate()}]"
    if note.strip() not in (application.notes or ""):
        application.notes = (application.notes or "") + note
        application.save(update_fields=["notes", "updated_at"])
    return emp
