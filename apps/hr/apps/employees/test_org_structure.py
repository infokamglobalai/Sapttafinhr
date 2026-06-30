"""Org structure list querysets — employee count annotation."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from apps.accounts.models import Permission
from apps.employees.org_structure_services import (
    departments_queryset,
    designations_queryset,
    locations_queryset,
)
from apps.tenants.services import provision_tenant

User = get_user_model()


class OrgStructureQuerysetTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.edit",
            defaults={"name": "Edit employees", "module": "employees"},
        )
        cls.tenant, cls.admin = provision_tenant(
            company_name="Org Structure Co",
            subdomain="orgstruct",
            admin_email="admin@orgstruct.com",
            admin_password="Admin@1234",
        )

    def test_department_queryset_annotates_without_error(self):
        list(departments_queryset(self.tenant))

    def test_designation_queryset_annotates_without_error(self):
        list(designations_queryset(self.tenant))

    def test_location_queryset_annotates_without_error(self):
        list(locations_queryset(self.tenant))

    def test_designations_page_loads(self):
        self.client.force_login(self.admin)
        response = self.client.get(
            reverse("employees:designations"),
            HTTP_HOST="orgstruct.localhost",
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
