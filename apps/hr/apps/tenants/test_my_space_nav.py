from django.test import TestCase

from apps.tenants.my_space_nav import annotate_my_space_nav, my_space_nav_groups, my_space_palette_links


class MySpaceNavTest(TestCase):
    def test_groups_are_compact_and_grouped(self):
        groups = my_space_nav_groups(tenant_is_india_payroll=True, employee_has_onboarding=True)
        self.assertGreaterEqual(len(groups), 5)
        labels = [g["label"] for g in groups]
        self.assertIn("Time & attendance", labels)
        self.assertIn("Pay & benefits", labels)
        total_items = sum(len(g["items"]) for g in groups)
        self.assertGreater(total_items, 10)
        india_pay = next(g for g in groups if g["id"] == "pay")
        pay_labels = [i["label"] for i in india_pay["items"]]
        self.assertIn("Tax Declaration", pay_labels)

    def test_palette_includes_grouped_links(self):
        groups = my_space_nav_groups()
        links = my_space_palette_links(groups)
        self.assertTrue(any(l["label"] == "My Space overview" for l in links))
        self.assertTrue(any("My Payslips" in l["label"] for l in links))

    def test_annotate_marks_active_item(self):
        groups = my_space_nav_groups()
        class _Match:
            app_name = "payroll"
            url_name = "my_payslips"

        class _Req:
            resolver_match = _Match()
            GET = {}

        annotated = annotate_my_space_nav(groups, _Req())
        pay = next(g for g in annotated if g["id"] == "pay")
        self.assertTrue(pay["is_active"])
        payslip = next(i for i in pay["items"] if i["label"] == "My Payslips")
        self.assertTrue(payslip["is_active"])
