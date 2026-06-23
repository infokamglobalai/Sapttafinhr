"""Default payslip template packs per payroll jurisdiction."""
from __future__ import annotations

from apps.tenants.jurisdiction import INDIA, is_gcc_payroll, normalise_jurisdiction

DEFAULT_LAYOUT_FOR_JURISDICTION = {
    INDIA: "builtin_in",
    "KW": "builtin_kw",
    "AE": "builtin_gcc",
    "SA": "builtin_gcc",
    "BH": "builtin_gcc",
    "OM": "builtin_gcc",
    "QA": "builtin_gcc",
}

DEFAULT_TEMPLATE_NAMES = {
    "builtin_in": "India — Standard Payslip",
    "builtin_kw": "Kuwait / GCC — Standard Payslip",
    "builtin_gcc": "GCC — Standard Payslip",
}

BUILTIN_DJANGO_TEMPLATES = {
    "builtin_in": "payroll/payslip_pdf_in.html",
    "builtin_kw": "payroll/payslip_pdf_kw.html",
    "builtin_gcc": "payroll/payslip_pdf_kw.html",
}

CUSTOM_TEMPLATE_STARTER = """
<div style="font-family: Arial, sans-serif; font-size: 10pt;">
  <div style="display:flex; justify-content:space-between; margin-bottom: 12px;">
    {% if logo_url %}<img src="{{ logo_url }}" alt="" style="height:48px;">{% endif %}
    <div style="text-align:right; font-size:9pt;">REF: {{ ref_number }}</div>
  </div>
  <h2 style="text-align:center; margin: 8px 0;">{{ company.name }}</h2>
  <h3 style="text-align:center; margin: 4px 0;">Pay Slip — {{ pay_month_label }}</h3>
  <p><strong>{{ employee.full_name }}</strong> ({{ employee.employee_code }})</p>
  <table style="width:100%; border-collapse:collapse; margin: 12px 0;">
    <tr><th style="border:1px solid #ccc; padding:6px;">Earnings</th><th style="border:1px solid #ccc; padding:6px;">Amount</th></tr>
    {% for row in earnings_rows %}
    <tr><td style="border:1px solid #ccc; padding:6px;">{{ row.name }}</td><td style="border:1px solid #ccc; padding:6px; text-align:right;">{{ row.amount_fmt }}</td></tr>
    {% endfor %}
    <tr><td style="border:1px solid #ccc; padding:6px;"><strong>Net pay</strong></td><td style="border:1px solid #ccc; padding:6px; text-align:right;"><strong>{{ net_payable_fmt }}</strong></td></tr>
  </table>
  <p style="font-size:9pt;">{{ net_payable_words }}</p>
</div>
""".strip()


def default_layout_for_tenant(tenant) -> str:
    jurisdiction = normalise_jurisdiction(getattr(tenant, "payroll_jurisdiction", INDIA))
    if is_gcc_payroll(jurisdiction) and jurisdiction == "KW":
        return "builtin_kw"
    if is_gcc_payroll(jurisdiction):
        return "builtin_gcc"
    return DEFAULT_LAYOUT_FOR_JURISDICTION.get(jurisdiction, "builtin_in")


def default_template_name(layout: str) -> str:
    return DEFAULT_TEMPLATE_NAMES.get(layout, "Standard Payslip")
