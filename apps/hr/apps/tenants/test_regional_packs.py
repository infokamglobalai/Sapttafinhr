"""Tests for GCC regional packs (P0) and Kuwait payroll (P1)."""
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import Permission
from apps.employees.models import Employee, Department, Designation
from apps.leaves.models import HolidayCalendar, LeaveType
from apps.payroll.models import EmployeeSalary, PayrollRun, SalaryStructure, StatutorySetting
from apps.tenants.models import Tenant
from apps.tenants.regional_packs import seed_regional_defaults
from apps.tenants.services import provision_tenant
from apps.payroll.kuwait import calculate_indemnity_settlement, monthly_indemnity_accrual
from utils.money import currency_decimal_places, round_money


class MoneyUtilsTest(TestCase):
    def test_kwd_three_decimals(self):
        self.assertEqual(currency_decimal_places("KWD"), 3)
        self.assertEqual(round_money("1.2345", "KWD"), Decimal("1.235"))

    def test_aed_two_decimals(self):
        self.assertEqual(currency_decimal_places("AED"), 2)
        self.assertEqual(round_money("1.234", "AED"), Decimal("1.23"))


class RegionalPackTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )

    def test_kuwait_provision_seeds_pack(self):
        tenant, _ = provision_tenant(
            company_name="KW Pack Co",
            subdomain="kwpack",
            admin_email="kwpack@saptta.local",
            admin_password="Testpass123",
            country="KW",
        )
        self.assertTrue(LeaveType.objects.filter(tenant=tenant, code="AL").exists())
        self.assertTrue(HolidayCalendar.objects.filter(tenant=tenant, is_default=True).exists())
        self.assertTrue(StatutorySetting.objects.filter(tenant=tenant, statutory_type="pifss").exists())

    def test_seed_idempotent(self):
        tenant, _ = provision_tenant(
            company_name="KW Idem",
            subdomain="kwidem",
            admin_email="kwidem@saptta.local",
            admin_password="Testpass123",
            country="KW",
        )
        before = LeaveType.objects.filter(tenant=tenant).count()
        result = seed_regional_defaults(tenant)
        self.assertEqual(result["leave_types"], 0)
        self.assertEqual(LeaveType.objects.filter(tenant=tenant).count(), before)


class KuwaitPayrollTest(TestCase):
    def test_indemnity_accrual(self):
        accrual = monthly_indemnity_accrual(
            Decimal("1000"), Decimal("200"), years=Decimal("2"), currency="KWD",
        )
        self.assertGreater(accrual, 0)

    def test_indemnity_settlement_requires_join_date(self):
        tenant = Tenant.objects.create(
            name="T", subdomain="kwt", country="KW", currency="KWD",
            timezone="Asia/Kuwait", payroll_jurisdiction="KW",
        )
        dept = Department.objects.create(tenant=tenant, name="Ops")
        des = Designation.objects.create(tenant=tenant, name="Staff")
        emp = Employee.objects.create(
            tenant=tenant, employee_code="E1", first_name="A", last_name="B",
            department=dept, designation=des, date_of_joining=timezone.localdate().replace(year=2020),
        )
        result = calculate_indemnity_settlement(emp, currency="KWD")
        self.assertTrue(result["eligible"])
