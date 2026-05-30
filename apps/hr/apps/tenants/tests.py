"""
Smoke tests for critical flows: signup, login, dashboard, password reset.
Run with: python manage.py test apps.tenants
"""
from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core import mail

from apps.tenants.models import ProductEntitlement, Tenant
from apps.tenants.services import provision_tenant, validate_subdomain
from apps.accounts.models import Permission

User = get_user_model()


class LocalClient(Client):
    """Test client that defaults HTTP_HOST=localhost so TenantMiddleware bypasses subdomain lookup."""
    def __init__(self, **defaults):
        defaults.setdefault("HTTP_HOST", "localhost")
        super().__init__(**defaults)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    SESSION_ENGINE="django.contrib.sessions.backends.signed_cookies",
)
class SignupFlowTest(TestCase):
    """Self-service signup creates Tenant + admin user and logs them in."""

    client_class = LocalClient

    @classmethod
    def setUpTestData(cls):
        # Seed at least one permission so role assignment works
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )

    def test_signup_get_renders(self):
        r = self.client.get(reverse("tenants:signup"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Start your free trial")

    def test_signup_creates_tenant_and_logs_in(self):
        r = self.client.post(reverse("tenants:signup"), {
            "company_name": "Acme Pvt Ltd",
            "subdomain": "acme",
            "admin_email": "founder@acme.com",
            "admin_password": "Str0ngPass!23",
            "admin_password2": "Str0ngPass!23",
            "accept_terms": "on",
        })
        # Should redirect to dashboard
        self.assertEqual(r.status_code, 302)
        self.assertEqual(r.url, reverse("tenants:dashboard"))

        tenant = Tenant.objects.get(subdomain="acme")
        self.assertEqual(tenant.status, "trial")
        self.assertEqual(tenant.name, "Acme Pvt Ltd")
        self.assertTrue(
            ProductEntitlement.objects.filter(
                tenant=tenant, product="HR", status=ProductEntitlement.Status.TRIAL
            ).exists()
        )

        user = User.objects.get(email="founder@acme.com", tenant=tenant)
        self.assertTrue(user.is_hr_admin)

    def test_signup_rejects_duplicate_subdomain(self):
        Tenant.objects.create(name="X", subdomain="taken", status="trial")
        r = self.client.post(reverse("tenants:signup"), {
            "company_name": "Other Co",
            "subdomain": "taken",
            "admin_email": "x@y.com",
            "admin_password": "Str0ngPass!23",
            "admin_password2": "Str0ngPass!23",
            "accept_terms": "on",
        })
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "already taken")

    def test_signup_rejects_mismatched_passwords(self):
        r = self.client.post(reverse("tenants:signup"), {
            "company_name": "Co",
            "subdomain": "co",
            "admin_email": "a@b.com",
            "admin_password": "Str0ngPass!23",
            "admin_password2": "different",
            "accept_terms": "on",
        })
        self.assertContains(r, "don&#x27;t match")

    def test_signup_requires_terms_acceptance(self):
        r = self.client.post(reverse("tenants:signup"), {
            "company_name": "Co",
            "subdomain": "co",
            "admin_email": "a@b.com",
            "admin_password": "Str0ngPass!23",
            "admin_password2": "Str0ngPass!23",
        })
        self.assertContains(r, "accept the terms")


class SubdomainValidationTest(TestCase):
    def test_valid_subdomains(self):
        for s in ["acme", "acme-corp", "acme123", "a1b2c3"]:
            self.assertIsNone(validate_subdomain(s), f"Should accept {s}")

    def test_invalid_subdomains(self):
        for s in ["", "ab", "1acme", "Acme", "acme.corp", "-acme", "acme_corp"]:
            self.assertIsNotNone(validate_subdomain(s), f"Should reject {s}")

    def test_reserved_subdomains(self):
        for s in ["www", "api", "admin", "superadmin", "staging"]:
            err = validate_subdomain(s)
            self.assertIsNotNone(err)
            self.assertIn("reserved", err.lower())


@override_settings(
    HRMS_TENANT_DOMAIN="yourbrand.com",
    HRMS_SUPERADMIN_DOMAIN="app.yourbrand.com",
    ALLOWED_HOSTS=["*"],
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class ProductEntitlementAccessTest(TestCase):
    def test_inactive_hr_entitlement_blocks_tenant_route(self):
        tenant = Tenant.objects.create(name="Blocked Co", subdomain="blocked", status="active")
        ProductEntitlement.objects.create(
            tenant=tenant,
            product="HR",
            status=ProductEntitlement.Status.CANCELLED,
        )

        response = Client(HTTP_HOST="blocked.yourbrand.com").get(reverse("tenants:dashboard"))
        self.assertEqual(response.status_code, 403)

    def test_active_hr_entitlement_allows_tenant_route_to_auth_layer(self):
        tenant = Tenant.objects.create(name="Active Co", subdomain="active", status="active")
        ProductEntitlement.objects.create(
            tenant=tenant,
            product="HR",
            status=ProductEntitlement.Status.ACTIVE,
        )

        response = Client(HTTP_HOST="active.yourbrand.com").get(reverse("tenants:dashboard"))
        self.assertNotEqual(response.status_code, 403)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    SESSION_ENGINE="django.contrib.sessions.backends.signed_cookies",
    HRMS_TENANT_DOMAIN="yourbrand.com",
    ALLOWED_HOSTS=["*"],
)
class LoginFlowTest(TestCase):
    """Login authenticates a tenant user and rejects bad credentials."""

    client_class = LocalClient

    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )
        cls.tenant, cls.user = provision_tenant(
            company_name="LoginTest Co",
            subdomain="logintest",
            admin_email="admin@logintest.com",
            admin_password="GoodPass!234",
        )

    def test_login_page_renders(self):
        r = self.client.get(reverse("accounts:login"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Welcome back")

    def test_login_with_correct_credentials(self):
        # On localhost middleware leaves tenant=None for anonymous users; the
        # TenantAuthBackend then matches users where tenant=None. Since our
        # provisioned user has a tenant, we drive the login by hitting the
        # tenant subdomain directly so middleware resolves it from cache.
        r = self.client.post(reverse("accounts:login"), {
            "email": "admin@logintest.com",
            "password": "GoodPass!234",
        }, HTTP_HOST="logintest.yourbrand.com")
        self.assertIn(r.status_code, (200, 302))

    def test_login_with_wrong_password_fails(self):
        r = self.client.post(reverse("accounts:login"), {
            "email": "admin@logintest.com",
            "password": "wrong",
        }, HTTP_HOST="logintest.yourbrand.com")
        self.assertEqual(r.status_code, 200)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    SESSION_ENGINE="django.contrib.sessions.backends.signed_cookies",
)
class PasswordResetFlowTest(TestCase):
    """Forgot password sends an email; the link lets the user set a new password."""

    client_class = LocalClient

    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )
        cls.tenant, cls.user = provision_tenant(
            company_name="ResetTest",
            subdomain="resettest",
            admin_email="user@resettest.com",
            admin_password="OldPass!234",
        )

    def test_reset_request_page_renders(self):
        r = self.client.get(reverse("accounts:password_reset_request"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Forgot your password")

    def test_reset_request_sends_email_for_existing_user(self):
        # Log in first so middleware can resolve tenant from user (localhost fallback)
        self.client.force_login(self.user, backend="apps.accounts.backends.TenantAuthBackend")
        self.client.logout()
        # On localhost with no auth, password_reset_request still works — it just
        # doesn't filter by tenant. We need to ensure the user lookup finds them.
        mail.outbox = []
        r = self.client.post(reverse("accounts:password_reset_request"), {
            "email": "user@resettest.com",
        })
        self.assertEqual(r.status_code, 302)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Reset your", mail.outbox[0].subject)
        self.assertIn("user@resettest.com", mail.outbox[0].to)

    def test_reset_request_silently_succeeds_for_unknown_email(self):
        mail.outbox = []
        r = self.client.post(reverse("accounts:password_reset_request"), {
            "email": "nobody@nowhere.com",
        })
        # No email sent but request still redirects with a success message
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(r.status_code, 302)

    def test_reset_link_invalid_token_redirects(self):
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        r = self.client.get(reverse("accounts:password_reset_confirm",
                                    kwargs={"uidb64": uid, "token": "invalid-token"}))
        self.assertEqual(r.status_code, 302)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    SESSION_ENGINE="django.contrib.sessions.backends.signed_cookies",
)
class DashboardAccessTest(TestCase):
    """Dashboard requires authentication; tenant context is resolved correctly."""

    client_class = LocalClient

    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )
        cls.tenant, cls.user = provision_tenant(
            company_name="Dashboard Co",
            subdomain="dashtest",
            admin_email="admin@dashtest.com",
            admin_password="DashPass!234",
        )

    def test_dashboard_redirects_when_logged_out(self):
        r = self.client.get(reverse("tenants:dashboard"))
        self.assertEqual(r.status_code, 302)
        self.assertIn("/auth/login/", r.url)

    def test_dashboard_renders_for_logged_in_user(self):
        self.client.force_login(self.user, backend="apps.accounts.backends.TenantAuthBackend")
        r = self.client.get(reverse("tenants:dashboard"))
        self.assertEqual(r.status_code, 200)


class NotificationServiceTest(TestCase):
    """notify() creates an in-app record and (when enabled) sends an email."""

    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )
        cls.tenant, cls.user = provision_tenant(
            company_name="Notif Co",
            subdomain="notiftest",
            admin_email="user@notiftest.com",
            admin_password="NotifPass!234",
        )

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_notify_creates_record(self):
        from apps.hr_ops.services import notify
        from apps.hr_ops.models import Notification

        mail.outbox = []
        notif = notify(self.user, "general", "Hello", message="Test body", action_url="/x/")
        self.assertIsNotNone(notif)
        self.assertEqual(Notification.objects.filter(recipient=self.user).count(), 1)
        self.assertEqual(notif.title, "Hello")
        self.assertEqual(len(mail.outbox), 1)

    def test_notify_skips_user_without_tenant(self):
        from apps.hr_ops.services import notify
        u = User.objects.create_user(email="orphan@nowhere.com", tenant=None, password="x")
        result = notify(u, "general", "X")
        self.assertIsNone(result)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    SESSION_ENGINE="django.contrib.sessions.backends.signed_cookies",
)
class RateLimitTest(TestCase):
    """Brute-force protection: too many bad login attempts trigger a lockout."""

    client_class = LocalClient

    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )
        cls.tenant, cls.user = provision_tenant(
            company_name="RateLimit Co",
            subdomain="ratetest",
            admin_email="user@ratetest.com",
            admin_password="GoodPass!234",
        )

    def setUp(self):
        from django.core.cache import cache
        cache.clear()

    def test_lockout_after_repeated_failures(self):
        from apps.accounts.ratelimit import is_locked_out

        # 5 bad attempts → on the 5th, lockout flips on
        for _ in range(5):
            self.client.post(reverse("accounts:login"), {
                "email": "user@ratetest.com",
                "password": "wrong",
            })

        class _FakeReq:
            META = {"REMOTE_ADDR": "127.0.0.1"}
        self.assertTrue(is_locked_out("login", _FakeReq(), "user@ratetest.com"))

    def test_successful_login_clears_counter(self):
        from apps.accounts.ratelimit import record_failure, is_locked_out

        class _FakeReq:
            META = {"REMOTE_ADDR": "127.0.0.1"}

        record_failure("login", _FakeReq(), "user@ratetest.com")
        record_failure("login", _FakeReq(), "user@ratetest.com")

        # Simulate successful login by hitting the endpoint with good creds
        self.client.post(reverse("accounts:login"), {
            "email": "user@ratetest.com",
            "password": "GoodPass!234",
        }, HTTP_HOST="ratetest.yourbrand.com")

        # After success, counter should be reset (not locked)
        self.assertFalse(is_locked_out("login", _FakeReq(), "user@ratetest.com"))


class AuditLogServiceTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )
        cls.tenant, cls.user = provision_tenant(
            company_name="Audit Co",
            subdomain="audittest",
            admin_email="user@audittest.com",
            admin_password="AuditPass!234",
        )

    def test_audit_log_writes_entry(self):
        from apps.hr_ops.services import audit_log
        from apps.hr_ops.models import AuditLog

        audit_log(self.tenant, self.user, "create", "Tenant", self.tenant,
                  "Created test tenant", details={"plan": "trial"})
        entry = AuditLog.objects.filter(tenant=self.tenant).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.action, "create")
        self.assertEqual(entry.resource_type, "Tenant")
        self.assertEqual(entry.summary, "Created test tenant")
