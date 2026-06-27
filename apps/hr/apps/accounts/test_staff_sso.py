"""Tests for unified HR staff login (platform → HR SSO)."""
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings

from apps.accounts.models import Role, UserRole
from apps.tenants.models import Tenant
from utils import mfa as mfa_service

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

    def _post(self, path, payload):
        return self.client.post(
            path,
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {SECRET}",
        )

    @override_settings(MFA_REQUIRED=True)
    def test_valid_credentials_require_mfa_setup(self):
        resp = self._post("/internal/staff-login/", {"email": "staff@testco.com", "password": "Staff@1234"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["mfa_required"])
        self.assertTrue(data["mfa_setup_required"])
        self.assertIn("challenge_token", data)

    @override_settings(MFA_REQUIRED=False)
    def test_valid_credentials_return_redirect_when_mfa_off(self):
        resp = self._post("/internal/staff-login/", {"email": "staff@testco.com", "password": "Staff@1234"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("redirect_url", data)
        self.assertIn("token=", data["redirect_url"])
        self.assertEqual(data["workspace"], "testco")

    @override_settings(MFA_REQUIRED=True)
    def test_mfa_verify_returns_redirect(self):
        secret = mfa_service.generate_totp_secret()
        mfa_service.enable_mfa(self.user, secret, pyotp_code(secret))
        resp = self._post("/internal/staff-login/", {"email": "staff@testco.com", "password": "Staff@1234"})
        token = resp.json()["challenge_token"]
        code = pyotp_code(secret)
        mfa_resp = self._post(
            "/internal/staff-login/mfa/",
            {"challenge_token": token, "code": code, "platform_url": "http://platform.test", "next": "/"},
        )
        self.assertEqual(mfa_resp.status_code, 200)
        self.assertIn("redirect_url", mfa_resp.json())

    def test_wrong_password_rejected(self):
        resp = self._post("/internal/staff-login/", {"email": "staff@testco.com", "password": "wrong"})
        self.assertEqual(resp.status_code, 401)

    def test_unauthorized_without_bearer(self):
        resp = self.client.post(
            "/internal/staff-login/",
            data={"email": "staff@testco.com", "password": "Staff@1234"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)


def pyotp_code(secret: str) -> str:
    import pyotp

    return pyotp.TOTP(secret).now()
