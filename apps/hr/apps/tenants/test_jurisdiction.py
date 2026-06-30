from django.test import TestCase, override_settings
from django.urls import reverse

from apps.accounts.models import Permission
from apps.tenants.jurisdiction import (
    apply_locale_to_tenant,
    is_gcc_payroll,
    is_india_payroll,
    locale_defaults_for_country,
    normalise_jurisdiction,
)
from apps.tenants.models import Tenant
from apps.tenants.services import provision_tenant
from apps.tenants.setup_checklist import get_setup_checklist
from apps.tenants.tests import LocalClient


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class JurisdictionDefaultsTest(TestCase):
    def test_india_defaults(self):
        locale = locale_defaults_for_country("IN")
        self.assertEqual(locale["currency"], "INR")
        self.assertEqual(locale["timezone"], "Asia/Kolkata")
        self.assertEqual(locale["payroll_jurisdiction"], "IN")

    def test_kuwait_defaults(self):
        locale = locale_defaults_for_country("KW")
        self.assertEqual(locale["currency"], "KWD")
        self.assertEqual(locale["timezone"], "Asia/Kuwait")
        self.assertEqual(locale["payroll_jurisdiction"], "KW")

    def test_unknown_country_falls_back_to_india(self):
        self.assertEqual(normalise_jurisdiction("XX"), "IN")
        self.assertTrue(is_india_payroll("IN"))
        self.assertTrue(is_gcc_payroll("KW"))
        self.assertFalse(is_gcc_payroll("IN"))

    def test_normalise_accepts_tenant_object(self):
        tenant = Tenant(name="T", subdomain="tobj", payroll_jurisdiction="AE")
        self.assertEqual(normalise_jurisdiction(tenant), "AE")


class KuwaitProvisioningTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )

    def test_provision_kuwait_tenant(self):
        tenant, _user = provision_tenant(
            company_name="Kuwait Co",
            subdomain="kuwaitco",
            admin_email="admin@kuwaitco.com",
            admin_password="securepass123",
            country="KW",
        )
        self.assertEqual(tenant.country, "KW")
        self.assertEqual(tenant.currency, "KWD")
        self.assertEqual(tenant.payroll_jurisdiction, "KW")
        self.assertTrue(tenant.is_gcc_payroll)
        self.assertFalse(tenant.is_india_payroll)

    def test_setup_checklist_skips_india_statutory_for_gcc(self):
        tenant, _ = provision_tenant(
            company_name="GCC Co",
            subdomain="gccco",
            admin_email="hr@gccco.com",
            admin_password="securepass123",
            country="AE",
        )
        checklist = get_setup_checklist(tenant)
        keys = {item["key"] for item in checklist["items"]}
        self.assertNotIn("statutory", keys)

    def test_setup_nudge_hidden_after_setup_complete(self):
        tenant, _ = provision_tenant(
            company_name="Done Co",
            subdomain="doneco",
            admin_email="hr@doneco.com",
            admin_password="securepass123",
            country="IN",
        )
        tenant.setup_complete = True
        tenant.save(update_fields=["setup_complete"])
        checklist = get_setup_checklist(tenant)
        self.assertFalse(checklist["show_nudge"])


class IndiaPayrollGateTest(TestCase):
    client_class = LocalClient

    @classmethod
    def setUpTestData(cls):
        Permission.objects.get_or_create(
            codename="employees.view", defaults={"name": "View employees", "module": "employees"},
        )

    def setUp(self):
        self.tenant, self.user = provision_tenant(
            company_name="KW Gate",
            subdomain="kwgate",
            admin_email="admin@kwgate.com",
            admin_password="securepass123",
            country="KW",
        )
        self.tenant.setup_complete = True
        self.tenant.save(update_fields=["setup_complete"])
        self.client.force_login(self.user)

    def test_statutory_redirects_for_gcc(self):
        url = reverse("payroll:statutory")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 302)
        self.assertIn(reverse("payroll:run_list"), resp["Location"])

    def test_apply_locale_updates_existing_tenant(self):
        tenant = Tenant.objects.create(name="Switch", subdomain="switchme")
        apply_locale_to_tenant(tenant, "SA")
        tenant.refresh_from_db()
        self.assertEqual(tenant.payroll_jurisdiction, "SA")
        self.assertEqual(tenant.currency, "SAR")
