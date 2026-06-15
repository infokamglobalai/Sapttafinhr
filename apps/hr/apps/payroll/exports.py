"""
Statutory exports & accounting-system integrations.

  - Tally XML voucher batch (TallyPrime import format)
  - PF ECR file (EPFO pipe-delimited TXT)
  - ESI return CSV (ESIC monthly contribution file)
"""
import csv
import io
from decimal import Decimal
from xml.sax.saxutils import escape


# ──────────────────────────────────────────────────────────────────────────
# Tally XML — TallyPrime accepts a <VOUCHER> per payroll run.
# We emit a Journal voucher that debits Salary Expense and credits
# the various payable accounts. Names are configurable on the Tally side.
# ──────────────────────────────────────────────────────────────────────────
def build_tally_xml(tenant, payroll_run) -> str:
    """Produce a Tally Prime import XML for a single payroll run."""
    records = payroll_run.records.select_related("employee").all()

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

    voucher_date = f"{payroll_run.year}{payroll_run.month:02d}01"
    narration = f"Salary for {payroll_run.year}-{payroll_run.month:02d} ({len(records)} employees)"

    def ledger_entry(name: str, amount: Decimal, is_debit: bool) -> str:
        sign = "-" if is_debit else ""  # Tally: negative = debit in voucher
        return f"""
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>{escape(name)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>{'Yes' if is_debit else 'No'}</ISDEEMEDPOSITIVE>
          <AMOUNT>{sign}{amount:.2f}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>"""

    entries = []
    # Salary Expense (debit) — gross earnings
    entries.append(ledger_entry("Salaries & Wages", total_gross, is_debit=True))
    # PF Employer (debit, expense)
    if total_pf_er > 0:
        entries.append(ledger_entry("PF - Employer Contribution", total_pf_er, is_debit=True))
    if total_esi_er > 0:
        entries.append(ledger_entry("ESI - Employer Contribution", total_esi_er, is_debit=True))

    # Liability/payable credits
    if total_pf_emp > 0:
        entries.append(ledger_entry("PF Payable", total_pf_emp + total_pf_er, is_debit=False))
    if total_esi_emp > 0:
        entries.append(ledger_entry("ESI Payable", total_esi_emp + total_esi_er, is_debit=False))
    if total_pt > 0:
        entries.append(ledger_entry("Professional Tax Payable", total_pt, is_debit=False))
    if total_lwf > 0:
        entries.append(ledger_entry("LWF Payable", total_lwf, is_debit=False))
    if total_tds > 0:
        entries.append(ledger_entry("TDS Payable", total_tds, is_debit=False))
    if total_loan > 0:
        entries.append(ledger_entry("Loan Recovery", total_loan, is_debit=False))
    # Net to Salary Payable
    entries.append(ledger_entry("Salary Payable", total_net, is_debit=False))

    body = "".join(entries)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
 <HEADER>
  <TALLYREQUEST>Import Data</TALLYREQUEST>
 </HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES>
     <SVCURRENTCOMPANY>{escape(tenant.name)}</SVCURRENTCOMPANY>
    </STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <VOUCHER VCHTYPE="Journal" ACTION="Create">
      <DATE>{voucher_date}</DATE>
      <NARRATION>{escape(narration)}</NARRATION>
      <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
      <VOUCHERNUMBER>PAY-{payroll_run.year}{payroll_run.month:02d}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>Salary Payable</PARTYLEDGERNAME>
      <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>{body}
     </VOUCHER>
    </TALLYMESSAGE>
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>
"""


# ──────────────────────────────────────────────────────────────────────────
# PF ECR — Electronic Challan-cum-Return
# Format: pipe-delimited TXT, 11 fields per EPFO Unified Portal spec (2024).
# https://unifiedportal-emp.epfindia.gov.in
# Fields:
#   UAN#|Member Name|Gross Wages|EPF Wages|EPS Wages|EDLI Wages|
#   EPF Contribution Remitted|EPS Contribution Remitted|
#   EPF EPS Difference Remitted|NCP Days|Refund of Advances
# ──────────────────────────────────────────────────────────────────────────
def build_pf_ecr(tenant, payroll_run) -> str:
    records = payroll_run.records.select_related("employee").order_by("employee__employee_code")
    lines = []
    pf_ceiling = Decimal("15000")  # EPF wage ceiling

    for r in records:
        emp = r.employee
        if not getattr(emp, "uan_number", None):
            continue  # skip employees without UAN

        gross = r.gross_earnings
        epf_wages = min(r.basic, pf_ceiling)
        eps_wages = min(r.basic, pf_ceiling)
        edli_wages = min(r.basic, pf_ceiling)
        # EPS = 8.33% of wages (employer share, capped at 1250)
        eps_contrib = min(epf_wages * Decimal("0.0833"), Decimal("1250"))
        eps_contrib = eps_contrib.quantize(Decimal("1"))
        # EPF (employer) = total employer PF - EPS portion
        epf_employer = (r.pf_employer - eps_contrib).quantize(Decimal("1"))
        # EPF contribution remitted = employee + employer EPF
        epf_remitted = (r.pf_employee + epf_employer).quantize(Decimal("1"))
        diff_remitted = max(Decimal("0"), epf_employer - eps_contrib)
        ncp_days = int(r.lop_days)

        row = "#~#".join([
            str(emp.uan_number),
            emp.full_name.upper(),
            f"{gross:.0f}",
            f"{epf_wages:.0f}",
            f"{eps_wages:.0f}",
            f"{edli_wages:.0f}",
            f"{epf_remitted:.0f}",
            f"{eps_contrib:.0f}",
            f"{diff_remitted:.0f}",
            str(ncp_days),
            "0",
        ])
        # EPFO portal expects pipe-separated but accepts ~#~# in TXT; spec varies
        # The portal validator splits on "#~#" so we use that.
        lines.append(row)

    return "\n".join(lines) + "\n"


# ──────────────────────────────────────────────────────────────────────────
# ESI return — CSV per ESIC online filing spec.
# Columns: IP Number | IP Name | No. of Days for which wages paid | Total Monthly Wages | Reason Code | Last Working Day
# ──────────────────────────────────────────────────────────────────────────
def build_esi_return(tenant, payroll_run) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "IP Number", "IP Name", "No. of Days", "Total Monthly Wages",
        "Reason Code (numeric)", "Last Working Day",
    ])
    records = payroll_run.records.select_related("employee").order_by("employee__employee_code")
    for r in records:
        emp = r.employee
        if not getattr(emp, "esi_number", None):
            continue
        if r.esi_employee == 0 and r.esi_employer == 0:
            continue
        w.writerow([
            emp.esi_number,
            emp.full_name.upper(),
            int(r.paid_days),
            f"{r.gross_earnings:.2f}",
            "",  # reason code: only for non-payments
            "",  # last working day: only on exit
        ])
    return buf.getvalue()


def build_statutory_zip(tenant, payroll_run) -> bytes:
    """Bundle PF ECR + ESI return into a single ZIP for compliance upload."""
    import zipfile

    buf = io.BytesIO()
    period = f"{payroll_run.year}-{payroll_run.month:02d}"
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"pf_ecr_{period}.txt", build_pf_ecr(tenant, payroll_run))
        zf.writestr(f"esi_return_{period}.csv", build_esi_return(tenant, payroll_run))
    return buf.getvalue()
