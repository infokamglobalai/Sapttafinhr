"""
Management command: seed_payroll
Seeds a standard Indian salary structure and assigns sample salaries
to every employee in a tenant who doesn't already have one.

Usage:
    python manage.py seed_payroll --tenant demo
    python manage.py seed_payroll --tenant demo --ctc 600000
"""
import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Seed salary components, structure, statutory settings, and assign salaries"

    def add_arguments(self, parser):
        parser.add_argument("--tenant", required=True, help="Tenant subdomain")
        parser.add_argument("--ctc", type=int, default=600000, help="Default annual CTC")

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.tenants.models import Tenant
        from apps.payroll.bootstrap import bootstrap_payroll_for_tenant

        tenant = Tenant.objects.get(subdomain=options["tenant"])
        ctc = options["ctc"]

        if tenant.is_gcc_payroll:
            result = bootstrap_payroll_for_tenant(tenant, assign_salaries=True)
            self.stdout.write(self.style.SUCCESS(
                f"GCC payroll ready: {result['structure']}, "
                f"{result['salaries_assigned']} salary(ies) assigned."
            ))
            return

        from apps.employees.models import Employee
        from apps.payroll.models import (
            SalaryComponent, SalaryStructure, SalaryStructureComponent,
            EmployeeSalary, StatutorySetting,
        )

        ctc = Decimal(ctc)
        self.stdout.write(f"Tenant: {tenant.name}  |  Default CTC: Rs.{ctc}/yr")

        # ── 1. Salary components ────────────────────────────────────────────
        components_spec = [
            # (code, name, type, calc_type, calc_value, taxable, statutory, seq)
            ("BASIC",   "Basic",            "earning", "fixed",        0, True,  False, 10),
            ("HRA",     "House Rent Allow.", "earning", "pct_of_basic", 40, True,  False, 20),
            ("CONV",    "Conveyance",       "earning", "fixed",      1600, False, False, 30),
            ("SPECIAL", "Special Allowance","earning", "fixed",         0, True,  False, 40),
        ]
        comp_map = {}
        for code, name, ctype, calc, value, taxable, statutory, seq in components_spec:
            c, _ = SalaryComponent.objects.update_or_create(
                tenant=tenant, code=code,
                defaults={
                    "name": name, "component_type": ctype, "calc_type": calc,
                    "calc_value": value, "is_taxable": taxable,
                    "is_statutory": statutory, "sequence_order": seq, "is_active": True,
                },
            )
            comp_map[code] = c
        self.stdout.write(f"  Components: {len(comp_map)} created/updated")

        # ── 2. Salary structure ─────────────────────────────────────────────
        structure, _ = SalaryStructure.objects.update_or_create(
            tenant=tenant, name="Standard Indian Structure",
            defaults={"description": "BASIC + HRA(40%) + CONV + Special", "is_active": True},
        )
        for code, comp in comp_map.items():
            SalaryStructureComponent.objects.update_or_create(
                structure=structure, component=comp,
                defaults={"sequence_order": comp.sequence_order},
            )
        self.stdout.write(f"  Structure: {structure.name}")

        # ── 3. Statutory settings (PF, ESI, PT-KA) ──────────────────────────
        today = datetime.date.today()
        StatutorySetting.objects.update_or_create(
            tenant=tenant, statutory_type="pf", state_code="", effective_date=today,
            defaults={
                "employee_rate": Decimal("0.12"), "employer_rate": Decimal("0.1208"),
                "wage_ceiling": Decimal("15000"), "is_active": True,
            },
        )
        StatutorySetting.objects.update_or_create(
            tenant=tenant, statutory_type="esi", state_code="", effective_date=today,
            defaults={
                "employee_rate": Decimal("0.0075"), "employer_rate": Decimal("0.0325"),
                "wage_ceiling": Decimal("21000"), "is_active": True,
            },
        )
        StatutorySetting.objects.update_or_create(
            tenant=tenant, statutory_type="pt", state_code="IN-KA", effective_date=today,
            defaults={
                "slabs": [
                    {"min": 0,     "max": 14999, "amount": 0},
                    {"min": 15000, "max": None,  "amount": 200},
                ],
                "is_active": True,
            },
        )
        self.stdout.write("  Statutory: PF, ESI, PT-KA configured")

        # ── 4. Assign salaries to all employees without one ─────────────────
        basic_monthly = (ctc * Decimal("0.40") / 12).quantize(Decimal("0.01"))
        assigned = 0
        skipped = 0
        for emp in Employee.objects.filter(tenant=tenant, employment_status="active"):
            if EmployeeSalary.objects.filter(tenant=tenant, employee=emp, is_active=True).exists():
                skipped += 1
                continue
            EmployeeSalary.objects.create(
                tenant=tenant, employee=emp, structure=structure,
                effective_date=emp.date_of_joining,
                ctc_annual=ctc, basic_monthly=basic_monthly,
                is_active=True,
            )
            assigned += 1
        self.stdout.write(f"  Salaries assigned: {assigned}, skipped (already had): {skipped}")
        self.stdout.write(self.style.SUCCESS(f"\nDONE. {assigned} employees ready for payroll."))
