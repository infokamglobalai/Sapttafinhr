"""Income-tax / TDS engine tests — FY 2025-26 new & old regimes, Section 192.

Pure-function coverage for the statutory heart of payroll: slab tax, the 87A
rebate, new-regime marginal relief, old-regime HRA/80C deductions, and the
monthly TDS spreading helper. No DB needed (SimpleTestCase).
"""
from decimal import Decimal

from django.test import SimpleTestCase

from apps.payroll.tax import (
    _spread_monthly_tds,
    compute_annual_tax,
    fy_months_before,
)


def D(x):
    return Decimal(str(x))


class _DeclStub:
    """Minimal stand-in for TaxDeclaration — only the attrs the tax calc reads."""

    def __init__(self, **over):
        self.rent_paid_annual = D("0")
        self.is_metro_city = False
        self.total_80c = D("0")
        self.sec_80d_self = D("0")
        self.sec_80d_parents = D("0")
        self.sec_80d_parents_senior = False
        self.sec_80ccd_1b_nps = D("0")
        self.sec_80e_education_loan = D("0")
        self.sec_80g_donations = D("0")
        self.sec_24_home_loan_interest = D("0")
        self.other_income_annual = D("0")
        for k, v in over.items():
            setattr(self, k, v)


class NewRegimeTaxTest(SimpleTestCase):
    def test_zero_tax_at_rebate_ceiling(self):
        # 12.75L gross → 12.00L taxable after 75k std deduction → full 87A rebate.
        r = compute_annual_tax(regime="new", gross_salary_annual=D("1275000"))
        self.assertEqual(r["taxable_income"], D("1200000"))
        self.assertEqual(r["total_tax"], D("0"))

    def test_slab_tax_above_ceiling(self):
        # 16L gross → 15.25L taxable; tax 108750 + 4% cess = 113100. No relief.
        r = compute_annual_tax(regime="new", gross_salary_annual=D("1600000"))
        self.assertEqual(r["taxable_income"], D("1525000"))
        self.assertEqual(r["tax_before_rebate"], D("108750"))
        self.assertEqual(r["rebate_87a"], D("0"))
        self.assertEqual(r["marginal_relief"], D("0"))
        self.assertEqual(r["total_tax"], D("113100"))

    def test_marginal_relief_just_over_ceiling(self):
        # 12.80L gross → 12.05L taxable. Normal tax 60750, but income over 12L is
        # only 5000 → marginal relief caps tax at 5000 (+4% cess) = 5200.
        r = compute_annual_tax(regime="new", gross_salary_annual=D("1280000"))
        self.assertEqual(r["taxable_income"], D("1205000"))
        self.assertEqual(r["tax_before_rebate"], D("60750"))
        self.assertEqual(r["marginal_relief"], D("55750"))
        self.assertEqual(r["tax_after_rebate"], D("5000"))
        self.assertEqual(r["total_tax"], D("5200"))


class OldRegimeTaxTest(SimpleTestCase):
    def test_80c_reduces_taxable(self):
        decl = _DeclStub(total_80c=D("150000"))
        r = compute_annual_tax(
            regime="old",
            gross_salary_annual=D("1000000"),
            basic_annual=D("400000"),
            declaration=decl,
        )
        # 10L - 50k std - 1.5L 80C = 8L taxable; tax 72500 + cess = 75400.
        self.assertEqual(r["chapter_via"]["80C"], D("150000"))
        self.assertEqual(r["taxable_income"], D("800000"))
        self.assertEqual(r["total_tax"], D("75400"))

    def test_80c_is_capped_at_150000(self):
        decl = _DeclStub(total_80c=D("250000"))
        r = compute_annual_tax(
            regime="old", gross_salary_annual=D("1000000"),
            basic_annual=D("400000"), declaration=decl,
        )
        self.assertEqual(r["chapter_via"]["80C"], D("150000"))

    def test_hra_exemption_applied(self):
        decl = _DeclStub(rent_paid_annual=D("300000"), is_metro_city=True)
        r = compute_annual_tax(
            regime="old",
            gross_salary_annual=D("1200000"),
            basic_annual=D("600000"),
            hra_received_annual=D("240000"),
            declaration=decl,
        )
        # least(HRA 240000, rent-10%basic = 240000, 50% basic = 300000) = 240000.
        self.assertEqual(r["exemptions"]["HRA"], D("240000"))


class SpreadAndProjectionTest(SimpleTestCase):
    def test_fy_months_before_april_is_empty(self):
        self.assertEqual(fy_months_before("2025-26", 2025, 4), [])

    def test_fy_months_before_january_spans_nine(self):
        pairs = fy_months_before("2025-26", 2026, 1)  # Apr–Dec 2025
        self.assertEqual(len(pairs), 9)
        self.assertEqual(pairs[0], (2025, 4))
        self.assertEqual(pairs[-1], (2025, 12))

    def test_fy_months_before_march_spans_eleven(self):
        self.assertEqual(len(fy_months_before("2025-26", 2026, 3)), 11)

    def test_spread_subtracts_ytd_then_divides_remaining(self):
        # 120000 annual, 30000 already deducted, 6 months left → 15000/mo.
        self.assertEqual(_spread_monthly_tds(D("120000"), D("30000"), 6), D("15000"))

    def test_spread_never_negative(self):
        self.assertEqual(_spread_monthly_tds(D("10000"), D("50000"), 3), D("0"))
