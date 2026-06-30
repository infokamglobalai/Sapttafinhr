"""Duplicate email checks when creating employees."""
import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.accounts.models import Permission
from apps.employees.models import Employee
from apps.employees.services import EmployeeEmailInUse, create_employee
from apps.tenants.services import provision_tenant

User = get_user_model()


class EmployeeEmailConflictTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view",
            defaults={"name": "View employees", "module": "employees"},
        )
        Permission.objects.get_or_create(
            codename="employees.create",
            defaults={"name": "Create employees", "module": "employees"},
        )
        cls.tenant, cls.admin = provision_tenant(
            company_name="Email Conflict Co",
            subdomain="emailconflict",
            admin_email="admin@emailconflict.com",
            admin_password="Admin@1234",
        )

    def test_blocks_duplicate_active_email(self):
        create_employee(
            self.tenant,
            {
                "first_name": "First",
                "last_name": "Person",
                "official_email": "executive.secretary@kamglobalai.com",
                "date_of_joining": datetime.date.today(),
                "employment_status": "active",
            },
        )
        with self.assertRaises(EmployeeEmailInUse) as ctx:
            create_employee(
                self.tenant,
                {
                    "first_name": "Deepika",
                    "last_name": "G",
                    "official_email": "executive.secretary@kamglobalai.com",
                    "date_of_joining": datetime.date.today(),
                    "employment_status": "active",
                },
            )
        self.assertIn("already used", str(ctx.exception).lower())

    def test_blocks_duplicate_exited_employee_email(self):
        emp, _ = create_employee(
            self.tenant,
            {
                "first_name": "Former",
                "last_name": "Staff",
                "official_email": "former@emailconflict.com",
                "date_of_joining": datetime.date.today(),
                "employment_status": "active",
            },
        )
        emp.employment_status = "exited"
        emp.is_active = False
        emp.save(update_fields=["employment_status", "is_active"])

        with self.assertRaises(EmployeeEmailInUse) as ctx:
            create_employee(
                self.tenant,
                {
                    "first_name": "New",
                    "last_name": "Hire",
                    "official_email": "former@emailconflict.com",
                    "date_of_joining": datetime.date.today(),
                    "employment_status": "active",
                },
            )
        self.assertIn("rehire", str(ctx.exception).lower())
