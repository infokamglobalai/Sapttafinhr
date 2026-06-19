"""Employee headcount limit tests."""
import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.accounts.models import Permission
from apps.employees.services import create_employee
from apps.tenants.limits import DEFAULT_INCLUDED_EMPLOYEES, EmployeeLimitExceeded, employee_limit
from apps.tenants.services import provision_tenant

User = get_user_model()


class EmployeeLimitTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )
        cls.tenant, cls.admin = provision_tenant(
            company_name="Limit Test Co",
            subdomain="limittest",
            admin_email="admin@limittest.com",
            admin_password="Admin@1234",
        )

    def test_default_max_is_30(self):
        self.assertEqual(employee_limit(self.tenant), DEFAULT_INCLUDED_EMPLOYEES)
        self.assertEqual(self.tenant.max_employees, 30)

    def test_blocks_over_limit(self):
        self.tenant.max_employees = 1
        self.tenant.save(update_fields=["max_employees"])
        create_employee(
            self.tenant,
            {
                "first_name": "One",
                "last_name": "Only",
                "official_email": "one@limittest.com",
                "date_of_joining": datetime.date.today(),
                "employment_status": "active",
            },
        )
        with self.assertRaises(EmployeeLimitExceeded):
            create_employee(
                self.tenant,
                {
                    "first_name": "Two",
                    "last_name": "TooMany",
                    "official_email": "two@limittest.com",
                    "date_of_joining": datetime.date.today(),
                    "employment_status": "active",
                },
            )
