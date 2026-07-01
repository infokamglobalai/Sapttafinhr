import datetime
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.tenants.services import provision_tenant
from apps.employees.services import create_employee
from apps.employees.models import EmployeeDocument

User = get_user_model()


class BugFixesTest(TestCase):
    # Duplicate-email handling is covered by apps.employees.test_email_conflict.

    @classmethod
    def setUpTestData(cls):
        cls.tenant, cls.admin = provision_tenant(
            company_name="Bug Fixes Co",
            subdomain="bugfixes",
            admin_email="admin@bugfixes.com",
            admin_password="Admin@1234",
        )

    def test_document_download_permissions(self):
        self.tenant.setup_complete = True
        self.tenant.save(update_fields=["setup_complete"])

        # Create employee
        emp, _ = create_employee(
            self.tenant,
            {
                "first_name": "Doc",
                "last_name": "User",
                "official_email": "doc@bugfixes.com",
                "date_of_joining": datetime.date.today(),
            }
        )

        # Create document
        doc_file = SimpleUploadedFile("resume.pdf", b"%PDF-1.5 test content")
        doc = EmployeeDocument.objects.create(
            tenant=self.tenant,
            employee=emp,
            document_type="other",
            document_name="Test Resume",
            file=doc_file
        )

        url = reverse("employees:document_download", kwargs={"pk": doc.pk})

        # Unauthenticated request should redirect to login
        response = self.client.get(url, HTTP_HOST="localhost")
        self.assertEqual(response.status_code, 302)

        # Login as admin (who has employees.view permissions)
        logged_in = self.client.login(username="admin@bugfixes.com", password="Admin@1234")
        self.assertTrue(logged_in)

        # Request on localhost where tenant maps to user's tenant
        response = self.client.get(url, HTTP_HOST="localhost")
        # Should be 200 OK since file exists
        self.assertEqual(response.status_code, 200)
