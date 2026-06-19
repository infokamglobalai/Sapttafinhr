"""Payroll lifecycle integration tests."""
import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import Permission
from apps.employees.models import Department, Designation, Employee
from apps.payroll.engine import compute_payroll_record
from apps.payroll.exports import build_tally_xml
from apps.payroll.models import (
    EmployeeSalary,
    PayrollRecord,
    PayrollRun,
    SalaryComponent,
    SalaryStructure,
    SalaryStructureComponent,
    StatutorySetting,
)
from apps.payroll.tasks import generate_payslips_for_run
from apps.tenants.services import provision_tenant

User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CELERY_TASK_ALWAYS_EAGER=True,
)
class PayrollLifecycleTest(TestCase):
    """create → compute → approve → publish → export."""

    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )
        cls.tenant, cls.admin = provision_tenant(
            company_name="Payroll Test Co",
            subdomain="payrolltest",
            admin_email="admin@payrolltest.com",
            admin_password="Admin@1234",
        )
        cls.tenant.setup_complete = True
        cls.tenant.save(update_fields=["setup_complete"])

        dept = Department.objects.create(tenant=cls.tenant, name="Ops")
        desig = Designation.objects.create(tenant=cls.tenant, name="Associate", level=2)
        cls.employee = Employee.objects.create(
            tenant=cls.tenant,
            employee_code="EMP0001",
            first_name="Pay",
            last_name="Roll",
            official_email="pay.roll@payrolltest.com",
            date_of_joining=datetime.date(2020, 1, 1),
            department=dept,
            designation=desig,
            employment_status="active",
            work_state_code="IN-KA",
        )

        structure = SalaryStructure.objects.create(
            tenant=cls.tenant, name="Default", is_active=True,
        )
        basic = SalaryComponent.objects.create(
            tenant=cls.tenant, name="Basic", code="BASIC", component_type="earning",
            calc_type="fixed", calc_value=Decimal("40000"), is_taxable=True, sequence_order=10,
        )
        SalaryStructureComponent.objects.create(structure=structure, component=basic, sequence_order=10)
        EmployeeSalary.objects.create(
            tenant=cls.tenant,
            employee=cls.employee,
            structure=structure,
            effective_date=datetime.date(2020, 1, 1),
            ctc_annual=Decimal("600000"),
            basic_monthly=Decimal("40000"),
            is_active=True,
        )
        StatutorySetting.objects.create(
            tenant=cls.tenant, statutory_type="pf",
            employee_rate=Decimal("0.12"), employer_rate=Decimal("0.1208"),
            wage_ceiling=Decimal("15000"), effective_date=datetime.date(2024, 4, 1),
        )

    def test_full_payroll_lifecycle(self):
        today = datetime.date.today()
        prev = (today.replace(day=1) - datetime.timedelta(days=1))
        run = PayrollRun.objects.create(
            tenant=self.tenant,
            year=prev.year,
            month=prev.month,
            status="processing",
            run_by=self.admin,
        )

        record = compute_payroll_record(self.tenant, self.employee, run, run.year, run.month)
        self.assertIsNotNone(record)
        self.assertGreater(record.net_payable, 0)

        run.status = "approved"
        run.approved_at = timezone.now()
        run.save()
        run.records.update(is_locked=True)

        try:
            generate_payslips_for_run(run.id)
        except OSError:
            self.skipTest("WeasyPrint not available on this host")

        run.status = "paid"
        run.paid_at = timezone.now()
        run.save()

        xml = build_tally_xml(self.tenant, run)
        self.assertIn("<ENVELOPE>", xml)

        client = Client(HTTP_HOST="localhost")
        client.force_login(self.admin, backend="apps.accounts.backends.TenantAuthBackend")
        resp = client.get(reverse("payroll:salary_register", args=[run.pk]))
        self.assertEqual(resp.status_code, 200)
        self.assertGreater(len(resp.content), 1000)

        self.assertEqual(
            PayrollRecord.objects.filter(payroll_run=run, employee=self.employee).count(),
            1,
        )
