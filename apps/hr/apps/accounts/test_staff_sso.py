"""Tests for unified HR staff login (platform → HR SSO)."""
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings

from apps.accounts.models import Role, UserRole
from apps.tenants.models import Tenant

User = get_user_model()
SECRET = "test-sso-secret-for-staff-login-1234567890"


@override_settings(SSO_SHARED_SECRET=SECRET, HR_PUBLIC_BASE_URL="http://hr.test")
class StaffLoginApiTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Test Co", subdomain="testco", status="trial")
        self.user = User.objects.create_user(
            email="staff@testco.com",
            tenant=self.tenant,
            password="Staff@1234",
        )
        role = Role.objects.create(tenant=self.tenant, name="employee", is_system=True)
        UserRole.objects.create(user=self.user, role=role)
        self.client = Client()

    def _post(self, payload):
        return self.client.post(
            "/internal/staff-login/",
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {SECRET}",
        )

    def test_valid_credentials_return_redirect(self):
        resp = self._post({"email": "staff@testco.com", "password": "Staff@1234"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("redirect_url", data)
        self.assertIn("token=", data["redirect_url"])
        self.assertEqual(data["workspace"], "testco")

    def test_wrong_password_rejected(self):
        resp = self._post({"email": "staff@testco.com", "password": "wrong"})
        self.assertEqual(resp.status_code, 401)

    def test_unauthorized_without_bearer(self):
        resp = self.client.post(
            "/internal/staff-login/",
            data={"email": "staff@testco.com", "password": "Staff@1234"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)
