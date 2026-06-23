"""Build payroll journal lines for Finance ledger sync (Complete plan)."""
from __future__ import annotations

from decimal import Decimal

from apps.tenants.jurisdiction import is_gcc_payroll


def _line(code: str, name: str, type_: str, side: str, amount: Decimal, description: str = "") -> dict:
    if amount <= 0:
        return None
    return {
        "code": code,
        "name": name,
        "type": type_,
        "parent_code": "5000" if type_ == "EXPENSE" else "2100",
        "side": side,
        "amount": str(amount.quantize(Decimal("0.01"))),
        "description": description,
    }


def build_finance_journal_payload(tenant, payroll_run) -> dict:
    """Return JSON payload for Finance internal payroll-journal API."""
    import calendar
    from datetime import date

    records = list(payroll_run.records.all())
    last_day = calendar.monthrange(payroll_run.year, payroll_run.month)[1]
    entry_date = date(payroll_run.year, payroll_run.month, last_day)
    voucher_no = f"HR-PAY-{payroll_run.year}{payroll_run.month:02d}"
    narration = (
        f"Payroll {payroll_run.year}-{payroll_run.month:02d} "
        f"({len(records)} employees) — synced from Saptta HR"
    )

    lines: list[dict] = []

    if is_gcc_payroll(tenant.payroll_jurisdiction):
        total_gross = sum((r.gross_earnings for r in records), Decimal("0"))
        total_net = sum((r.net_payable for r in records), Decimal("0"))
        total_pifss_emp = sum((r.pf_employee for r in records), Decimal("0"))
        total_pifss_er = sum((r.pf_employer for r in records), Decimal("0"))
        total_ded = sum((r.total_deductions for r in records), Decimal("0"))

        expense = total_gross + total_pifss_er
        for row in (
            _line("5200", "Salaries & Wages", "EXPENSE", "debit", expense, "Gross + employer statutory"),
            _line("5210", "Salary Payable", "LIABILITY", "credit", total_net, "Net salaries payable"),
            _line("5211", "PIFSS / GOSI Payable", "LIABILITY", "credit", total_pifss_emp + total_pifss_er, "Employee + employer"),
            _line("5214", "Payroll Deductions Payable", "LIABILITY", "credit", max(total_ded - total_pifss_emp, Decimal("0")), "Other deductions"),
        ):
            if row:
                lines.append(row)
    else:
        total_gross = sum((r.gross_earnings for r in records), Decimal("0"))
        total_pf_emp = sum((r.pf_employee for r in records), Decimal("0"))
        total_esi_emp = sum((r.esi_employee for r in records), Decimal("0"))
        total_pt = sum((r.professional_tax for r in records), Decimal("0"))
        total_lwf = sum((r.lwf_employee for r in records), Decimal("0"))
        total_tds = sum((r.tds for r in records), Decimal("0"))
        total_loan = sum((r.loan_deduction for r in records), Decimal("0"))
        total_net = sum((r.net_payable for r in records), Decimal("0"))
        total_pf_er = sum((r.pf_employer for r in records), Decimal("0"))
        total_esi_er = sum((r.esi_employer for r in records), Decimal("0"))

        for row in (
            _line("5200", "Salaries & Wages", "EXPENSE", "debit", total_gross, "Gross earnings"),
            _line("5215", "PF Employer Contribution", "EXPENSE", "debit", total_pf_er, "Employer PF"),
            _line("5216", "ESI Employer Contribution", "EXPENSE", "debit", total_esi_er, "Employer ESI"),
            _line("5211", "PF Payable", "LIABILITY", "credit", total_pf_emp + total_pf_er, "PF liability"),
            _line("5212", "ESI Payable", "LIABILITY", "credit", total_esi_emp + total_esi_er, "ESI liability"),
            _line("5213", "Professional Tax Payable", "LIABILITY", "credit", total_pt, "PT"),
            _line("5217", "LWF Payable", "LIABILITY", "credit", total_lwf, "LWF"),
            _line("2160", "TDS Payable", "LIABILITY", "credit", total_tds, "TDS"),
            _line("5218", "Loan Recovery Payable", "LIABILITY", "credit", total_loan, "Loan EMI"),
            _line("5210", "Salary Payable", "LIABILITY", "credit", total_net, "Net salary"),
        ):
            if row:
                lines.append(row)

    return {
        "workspace": tenant.subdomain,
        "hr_payroll_run_id": payroll_run.pk,
        "year": payroll_run.year,
        "month": payroll_run.month,
        "voucher_no": voucher_no,
        "entry_date": entry_date.isoformat(),
        "narration": narration,
        "currency": tenant.currency or "INR",
        "lines": lines,
        "employee_count": len(records),
        "total_net": str(sum((r.net_payable for r in records), Decimal("0"))),
    }


def sync_payroll_to_finance(tenant, payroll_run) -> dict:
    """POST journal to Finance backend. Returns result dict with ok/error."""
    from django.conf import settings

    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    base = getattr(settings, "FIN_INTERNAL_BASE_URL", "").rstrip("/")
    if not secret or not base:
        return {"ok": False, "error": "Finance sync not configured (FIN_INTERNAL_BASE_URL / SSO_SHARED_SECRET)."}

    payload = build_finance_journal_payload(tenant, payroll_run)
    if not payload["lines"]:
        return {"ok": False, "error": "No journal lines to post."}

    try:
        import requests

        resp = requests.post(
            f"{base}/api/v1/saas/internal/payroll-journal/",
            headers={
                "Authorization": f"Bearer {secret}",
                "Host": "localhost",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=20,
        )
        data = resp.json() if resp.content else {}
        if resp.ok:
            return {
                "ok": True,
                "journal_entry_id": data.get("journal_entry_id"),
                "voucher_no": data.get("voucher_no"),
                "already_posted": data.get("already_posted", False),
            }
        return {"ok": False, "error": data.get("detail") or f"HTTP {resp.status_code}"}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
