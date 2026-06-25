"""Tests for GCC payroll export validation."""
import datetime
from decimal import Decimal

from django.test import TestCase

from apps.payroll.gcc_export_validation import (
    assess_gcc_export_readiness,
    normalize_iban,
    validate_iban,
    validate_swift,
)
from apps.payroll.models import PayrollRecord, PayrollRun
from apps.tenants.services import provision_tenant


class GccExportValidationTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.tenant, cls.admin = provision_tenant(
            company_name="Kuwait Demo",
            subdomain="kw-export-test",
            admin_email="admin@kw-export-test.demo",
            admin_password="Demo@1234",
        )
        cls.tenant.payroll_jurisdiction = "KW"
        cls.tenant.country = "KW"
        cls.tenant.currency = "KWD"
        cls.tenant.save(update_fields=["payroll_jurisdiction", "country", "currency"])

        from apps.employees.models import Employee, EmployeeBankAccount

        cls.employee = Employee.objects.create(
            tenant=cls.tenant,
            employee_code="KW001",
            first_name="Ahmad",
            last_name="Al-Sabah",
            employment_status="active",
            is_active=True,
            date_of_joining=datetime.date(2024, 1, 1),
            civil_id="288031500001",
            nationality="KW",
        )
        bank = EmployeeBankAccount(
            employee=cls.employee,
            account_holder_name=cls.employee.full_name,
            bank_name="NBK",
            ifsc_code="NBOKKWKW",
            is_primary=True,
            is_verified=True,
        )
        bank.account_number = "KW81CBKU0000000000001234560101"
        bank.save()

        cls.payroll_run = PayrollRun.objects.create(
            tenant=cls.tenant, year=2026, month=5, status="approved",
        )
        PayrollRecord.objects.create(
            tenant=cls.tenant,
            payroll_run=cls.payroll_run,
            employee=cls.employee,
            net_payable=Decimal("850.000"),
            paid_days=Decimal("30"),
        )

    def test_validate_kuwait_iban(self):
        self.assertTrue(validate_iban("KW81CBKU0000000000001234560101", "KW"))
        self.assertFalse(validate_iban("50100123456789", "KW"))

    def test_normalize_iban(self):
        self.assertEqual(
            normalize_iban(" kw81cbku0000000000001234560101 "),
            "KW81CBKU0000000000001234560101",
        )

    def test_validate_swift(self):
        self.assertTrue(validate_swift("NBOKKWKW"))
        self.assertFalse(validate_swift("BAD"))

    def test_assess_ready_employee(self):
        readiness = assess_gcc_export_readiness(self.tenant, self.payroll_run)
        self.assertEqual(readiness.ready_count, 1)
        self.assertEqual(readiness.issue_count, 0)
        self.assertTrue(readiness.is_clean)
