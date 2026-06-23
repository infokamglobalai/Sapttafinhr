"""Payslip template resolution, context building, and PDF rendering."""
from __future__ import annotations

import calendar
import datetime
from decimal import Decimal

from django.db import transaction
from django.template.loader import render_to_string

from apps.hr_ops.letter_company import get_company_profile
from apps.tenants.jurisdiction import is_gcc_payroll, normalise_jurisdiction
from utils.money import (
    CURRENCY_SYMBOLS,
    amount_in_words,
    amount_in_words_india_parenthetical,
    amount_in_words_parenthetical,
    currency_decimal_places,
    format_amount_plain,
    format_money,
    round_money,
)

from .models import PayslipTemplate
from .payslip_defaults import (
    BUILTIN_DJANGO_TEMPLATES,
    CUSTOM_TEMPLATE_STARTER,
    default_layout_for_tenant,
    default_template_name,
)


def resolve_payslip_template(tenant, template: PayslipTemplate | None = None) -> PayslipTemplate | None:
    """Return active template for tenant — explicit, default, or None (jurisdiction builtin)."""
    if template and template.tenant_id == tenant.id and template.is_active:
        return template
    return (
        PayslipTemplate.objects.filter(tenant=tenant, is_default=True, is_active=True).first()
        or PayslipTemplate.objects.filter(tenant=tenant, is_active=True).order_by("-created_at").first()
    )


def builtin_template_path(layout: str) -> str:
    return BUILTIN_DJANGO_TEMPLATES.get(layout, "payroll/payslip_pdf_in.html")


def _month_label(year: int, month: int) -> str:
    return f"{calendar.month_name[month]} {year}"


def _short_period(year: int, month: int) -> str:
    return datetime.date(year, month, 1).strftime("%b-%y")


def _logo_url(tenant, template: PayslipTemplate | None = None) -> str:
    try:
        if template and template.template_logo:
            return template.template_logo.url
    except (ValueError, AttributeError):
        pass
    try:
        if tenant.company_logo:
            return tenant.company_logo.url
    except (ValueError, AttributeError):
        pass
    return getattr(tenant, "logo_url", "") or ""


def _resolve_payslip_title(template: PayslipTemplate | None, year: int, month: int) -> str:
    month_year = _month_label(year, month)
    if template and template.payslip_title.strip():
        return template.payslip_title.strip().replace("{month_year}", month_year)
    return f"Payslip for the month of {month_year}"


def _resolve_footer_block(template: PayslipTemplate | None, company) -> dict:
    mode = template.footer_mode if template else "system_generated"
    signatory_name = (
        (template.signatory_name_override if template else "")
        or company.signatory_name
        or ""
    )
    signatory_title = (
        (template.signatory_title_override if template else "")
        or company.signatory_title
        or "Authorized Signatory"
    )

    if mode == "none":
        return {"footer_mode": "none", "footer_text": "", "show_signature": False, "signatory_name": "", "signatory_title": ""}
    if mode == "custom":
        return {
            "footer_mode": "custom",
            "footer_text": (template.footer_text if template else "").strip(),
            "show_signature": False,
            "signatory_name": "",
            "signatory_title": "",
        }
    if mode == "certified":
        cert_text = (template.footer_text if template else "").strip()
        if not cert_text:
            cert_text = "Certified that the particulars stated above are true and correct."
        return {
            "footer_mode": "certified",
            "footer_text": cert_text,
            "show_signature": True,
            "signatory_name": signatory_name or "Authorized Signatory",
            "signatory_title": signatory_title,
        }
    default_text = "This is a system generated pay slip and does not require signature."
    custom = (template.footer_text if template else "").strip()
    return {
        "footer_mode": "system_generated",
        "footer_text": custom or default_text,
        "show_signature": False,
        "signatory_name": "",
        "signatory_title": "",
    }


def _earning_rows(record) -> list[dict]:
    rows = []
    for _code, detail in (record.earnings_detail or {}).items():
        if detail.get("employer_only"):
            continue
        amount = Decimal(str(detail.get("amount") or 0))
        if amount:
            rows.append({"code": _code, "name": detail.get("name") or _code, "amount": amount})
    return rows


def _india_display_name(code: str, name: str) -> str:
    mapping = {
        "BASIC": "BASIC",
        "BASIC_SALARY": "BASIC",
        "HRA": "HRA",
        "HOUSING": "HRA",
        "CONV": "CONVEYANCE",
        "CONVEYANCE": "CONVEYANCE",
        "SPECIAL": "SPECIAL ALLOWANCE",
        "OTHER": "OTHER ALLOWANCE",
        "OTHER_EARN": "OTHER ALLOWANCE",
        "BONUS": "BONUS / INCENTIVE",
    }
    return mapping.get(code.upper(), name.upper())


def _india_deduction_name(code: str, name: str) -> str:
    mapping = {
        "PF": "PF",
        "PF_EMP": "PF",
        "PT": "PROF TAX",
        "PROF_TAX": "PROF TAX",
        "TDS": "INCOME TAX",
        "INCOME_TAX": "INCOME TAX",
        "ESI": "ESI",
        "ESI_EMP": "ESI",
        "LWF": "LWF",
    }
    return mapping.get(code.upper(), name.upper())


def _joining_date_india(employee) -> str:
    d = employee.date_of_joining
    if not d:
        return "—"
    day = d.day
    if 11 <= day <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day}{suffix} {d.strftime('%b').upper()} {d.year}"


def _primary_bank(employee) -> dict:
    bank = None
    if hasattr(employee, "bank_accounts"):
        bank = employee.bank_accounts.filter(is_primary=True).first()
        if not bank:
            bank = employee.bank_accounts.first()
    if not bank:
        return {"bank_name": "—", "account_number": "—"}
    acct = ""
    try:
        acct = bank.account_number or ""
    except Exception:
        acct = bank.masked_account_number if hasattr(bank, "masked_account_number") else "—"
    return {
        "bank_name": bank.bank_name or "—",
        "account_number": acct or "—",
    }


def _india_earning_rows(record) -> list[dict]:
    working_days = Decimal(str(record.working_days or 0))
    paid_days = Decimal(str(record.paid_days or 0))
    lop_factor = (paid_days / working_days) if working_days > 0 and paid_days > 0 else Decimal("1")

    rows = []
    for code, detail in (record.earnings_detail or {}).items():
        if detail.get("employer_only"):
            continue
        actual = Decimal(str(detail.get("amount") or 0))
        if not actual:
            continue
        full = actual
        if lop_factor < 1:
            full = round_money(actual / lop_factor, "INR")
        rows.append({
            "code": code,
            "name": _india_display_name(code, detail.get("name") or code),
            "full": full,
            "actual": actual,
        })
    return rows


_INDIA_EARN_ORDER = ("BASIC", "BASIC_SALARY", "HRA", "HOUSING", "CONV", "CONVEYANCE", "OTHER", "OTHER_EARN", "SPECIAL", "BONUS")


def _sort_india_earnings(rows: list[dict]) -> list[dict]:
    order = {code: i for i, code in enumerate(_INDIA_EARN_ORDER)}

    def key(row):
        return (order.get(row["code"].upper(), 99), row["name"])

    return sorted(rows, key=key)


def _india_deduction_rows(record) -> list[dict]:
    rows = []
    for code, detail in (record.deductions_detail or {}).items():
        amount = Decimal(str(detail.get("amount") or 0))
        if amount:
            rows.append({
                "code": code,
                "name": _india_deduction_name(code, detail.get("name") or code),
                "actual": amount,
            })
    return rows


def _deduction_rows(record) -> list[dict]:
    rows = []
    for _code, detail in (record.deductions_detail or {}).items():
        amount = Decimal(str(detail.get("amount") or 0))
        if amount:
            rows.append({"code": _code, "name": detail.get("name") or _code, "amount": amount})
    return rows


def _basic_and_allowances(record) -> tuple[Decimal, Decimal]:
    basic = Decimal("0")
    allowances = Decimal("0")
    for code, detail in (record.earnings_detail or {}).items():
        amount = Decimal(str(detail.get("amount") or 0))
        if code.upper() in ("BASIC", "BASIC_SALARY"):
            basic = amount
        elif amount:
            allowances += amount
    if basic and allowances:
        allowances -= basic
    elif not basic:
        basic = Decimal(str(record.basic or 0))
        allowances = Decimal(str(record.gross_earnings or 0)) - basic
    return basic, max(allowances, Decimal("0"))


def build_payslip_context(record, run, tenant, employee=None, template: PayslipTemplate | None = None) -> dict:
    employee = employee or record.employee
    company = get_company_profile(tenant)
    currency = tenant.currency or "INR"
    decimals = currency_decimal_places(currency)
    symbol = CURRENCY_SYMBOLS.get(currency, f"{currency} ")
    earnings_rows = _earning_rows(record)
    deductions_rows = _deduction_rows(record)
    basic, allowances = _basic_and_allowances(record)
    net = round_money(record.net_payable, currency)
    gross = round_money(record.gross_earnings, currency)
    deductions = round_money(record.total_deductions, currency)

    display_name = (
        (template.company_display_name if template else "")
        or company.name
        or tenant.name
        or ""
    )
    display_address = (
        (template.company_address_override if template else "")
        or company.address
        or ""
    )
    display_city = company.city if not (template and template.company_address_override) else ""

    def fmt(amount):
        return format_money(amount, currency)

    ref_prefix = company.ref_prefix or "HR"
    ref_number = f"{ref_prefix}-PS-{employee.employee_code}-{run.month:02d}"

    group_code = ""
    if employee.department and employee.department.cost_center_code:
        group_code = employee.department.cost_center_code
    elif employee.designation and employee.designation.grade:
        group_code = employee.designation.grade

    ctx = {
        "record": record,
        "employee": employee,
        "tenant": tenant,
        "run": run,
        "template": template,
        "company": company.as_context(),
        "logo_url": _logo_url(tenant, template),
        "currency_code": currency,
        "currency_symbol": symbol.strip(),
        "currency_decimals": decimals,
        "jurisdiction": normalise_jurisdiction(tenant.payroll_jurisdiction),
        "is_gcc": is_gcc_payroll(tenant.payroll_jurisdiction),
        "pay_month_label": _month_label(run.year, run.month),
        "pay_period_short": _short_period(run.year, run.month),
        "ref_number": ref_number,
        "earnings_rows": earnings_rows,
        "deductions_rows": deductions_rows,
        "basic_salary": basic,
        "allowances_total": allowances,
        "basic_salary_fmt": fmt(basic),
        "allowances_fmt": fmt(allowances),
        "gross_earnings_fmt": fmt(gross),
        "total_deductions_fmt": fmt(deductions),
        "net_payable_fmt": fmt(net),
        "net_payable_words": amount_in_words(net, currency),
        "employee_name_ar": getattr(employee, "name_ar", "") or "",
        "group_code": group_code,
        "position": employee.designation.name if employee.designation else "—",
        "today": datetime.date.today(),
    }
    for row in earnings_rows:
        row["amount_fmt"] = fmt(row["amount"])
    for row in deductions_rows:
        row["amount_fmt"] = fmt(row["amount"])

    max_rows = max(len(earnings_rows), len(deductions_rows), 1)
    paired_rows = []
    for i in range(max_rows):
        er = earnings_rows[i] if i < len(earnings_rows) else {}
        dr = deductions_rows[i] if i < len(deductions_rows) else {}
        paired_rows.append({
            "earning_name": er.get("name", ""),
            "earning_amount_fmt": er.get("amount_fmt", ""),
            "deduction_name": dr.get("name", ""),
            "deduction_amount_fmt": dr.get("amount_fmt", ""),
        })
    ctx["paired_rows"] = paired_rows

    bank = _primary_bank(employee)
    india_earnings = _sort_india_earnings(_india_earning_rows(record))
    india_deductions = _india_deduction_rows(record)
    for row in india_earnings:
        row["full_fmt"] = format_amount_plain(row["full"], currency)
        row["actual_fmt"] = format_amount_plain(row["actual"], currency)
    for row in india_deductions:
        row["actual_fmt"] = format_amount_plain(row["actual"], currency)

    max_in = max(len(india_earnings), len(india_deductions), 1)
    india_paired_rows = []
    for i in range(max_in):
        er = india_earnings[i] if i < len(india_earnings) else {}
        dr = india_deductions[i] if i < len(india_deductions) else {}
        india_paired_rows.append({
            "earning_name": er.get("name", ""),
            "earning_full_fmt": er.get("full_fmt", ""),
            "earning_actual_fmt": er.get("actual_fmt", ""),
            "deduction_name": dr.get("name", ""),
            "deduction_actual_fmt": dr.get("actual_fmt", ""),
        })

    pan = ""
    try:
        pan = employee.pan_number or ""
    except Exception:
        pan = ""

    ctx.update({
        "company_name_upper": display_name.upper(),
        "company_address_display": display_address,
        "company_city_display": display_city,
        "payslip_title": _resolve_payslip_title(template, run.year, run.month),
        "joining_date_india": _joining_date_india(employee),
        "bank_name": bank["bank_name"],
        "bank_account_number": bank["account_number"],
        "pan_number": pan or "—",
        "pf_uan": employee.uan_number or "—",
        "pf_number": employee.uan_number or "—",
        "lop_days": record.lop_days,
        "effective_work_days": record.paid_days,
        "gross_earnings_plain": format_amount_plain(gross, currency),
        "total_deductions_plain": format_amount_plain(deductions, currency),
        "net_payable_plain": format_amount_plain(net, currency),
        "net_payable_words_paren": amount_in_words_india_parenthetical(net),
        "india_earnings": india_earnings,
        "india_deductions": india_deductions,
        "india_paired_rows": india_paired_rows,
    })
    ctx.update(_resolve_footer_block(template, company))
    return ctx


def render_payslip_html(record, run, tenant, template: PayslipTemplate | None = None) -> tuple[str, str]:
    """Return (html_string, layout_key)."""
    tmpl = resolve_payslip_template(tenant, template)
    context = build_payslip_context(record, run, tenant, template=tmpl)

    if tmpl and tmpl.layout == "custom" and tmpl.template_html.strip():
        from jinja2 import Environment

        env = Environment(autoescape=True)
        body = env.from_string(tmpl.template_html).render(**context)
        html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{{font-family:Arial,sans-serif;font-size:10pt;margin:24px;color:#111;}}</style>
</head><body>{body}</body></html>"""
        return html, "custom"

    layout = tmpl.layout if tmpl else default_layout_for_tenant(tenant)
    django_path = builtin_template_path(layout)
    html = render_to_string(django_path, context)
    return html, layout


def render_payslip_pdf(record, run, tenant, template: PayslipTemplate | None = None) -> tuple[bytes, str, PayslipTemplate | None]:
    """Render payslip PDF bytes. Returns (pdf_bytes, layout_key, template_used)."""
    from utils.pdf import render_html_to_pdf

    html, layout_key = render_payslip_html(record, run, tenant, template)
    tmpl = resolve_payslip_template(tenant, template)
    return render_html_to_pdf(html), layout_key, tmpl


@transaction.atomic
def seed_default_payslip_template(tenant, created_by=None) -> tuple[int, int]:
    """Create jurisdiction default template if none exist."""
    if PayslipTemplate.objects.filter(tenant=tenant).exists():
        return 0, PayslipTemplate.objects.filter(tenant=tenant).count()
    layout = default_layout_for_tenant(tenant)
    PayslipTemplate.objects.create(
        tenant=tenant,
        name=default_template_name(layout),
        layout=layout,
        is_default=True,
        is_active=True,
        created_by=created_by,
    )
    return 1, 0


def custom_template_starter() -> str:
    return CUSTOM_TEMPLATE_STARTER
