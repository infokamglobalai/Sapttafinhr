"""Pre-export validation for GCC payroll bank / WPS files."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# Common GCC IBAN layouts — confirm final mapping with your bank / consultant.
IBAN_PATTERNS: dict[str, re.Pattern[str]] = {
    "KW": re.compile(r"^KW[0-9]{2}[A-Z]{4}[A-Z0-9]{22}$"),
    "AE": re.compile(r"^AE[0-9]{2}[0-9]{3}[0-9]{16}$"),
    "SA": re.compile(r"^SA[0-9]{2}[0-9]{2}[A-Z0-9]{18}$"),
    "BH": re.compile(r"^BH[0-9]{2}[A-Z]{4}[A-Z0-9]{14}$"),
    "OM": re.compile(r"^OM[0-9]{2}[0-9]{3}[A-Z0-9]{16}$"),
    "QA": re.compile(r"^QA[0-9]{2}[A-Z]{4}[A-Z0-9]{21}$"),
}

SWIFT_RE = re.compile(r"^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$")


def normalize_iban(value: str) -> str:
    return (value or "").strip().upper().replace(" ", "")


def validate_iban(iban: str, country_code: str) -> bool:
    code = normalize_iban(iban)
    if not code:
        return False
    country = (country_code or "").upper()[:2]
    pattern = IBAN_PATTERNS.get(country)
    if pattern:
        return bool(pattern.match(code))
    # Generic fallback: country prefix + reasonable length
    return code[:2].isalpha() and len(code) >= 15 and code.isalnum()


def validate_swift(swift: str) -> bool:
    code = (swift or "").strip().upper().replace(" ", "")
    return bool(code and SWIFT_RE.match(code))


@dataclass
class GccExportIssue:
    employee_code: str
    employee_name: str
    messages: list[str] = field(default_factory=list)


@dataclass
class GccExportReadiness:
    ready_count: int
    issue_count: int
    total_payable: int
    issues: list[GccExportIssue]
    country_code: str

    @property
    def can_export(self) -> bool:
        return self.ready_count > 0

    @property
    def is_clean(self) -> bool:
        return self.issue_count == 0 and self.ready_count > 0


def assess_gcc_export_readiness(tenant, payroll_run) -> GccExportReadiness:
    """Validate employee bank + identity fields before WPS / bank CSV export."""
    country = (
        getattr(tenant, "country", None)
        or getattr(tenant, "payroll_jurisdiction", None)
        or "KW"
    )
    country_code = str(country).upper()[:2]

    records = (
        payroll_run.records.select_related("employee")
        .prefetch_related("employee__bank_accounts")
        .filter(net_payable__gt=0)
        .order_by("employee__employee_code")
    )

    issues: list[GccExportIssue] = []
    ready = 0

    for rec in records:
        emp = rec.employee
        bank = emp.bank_accounts.filter(is_primary=True).first()
        row_issues: list[str] = []

        if not bank:
            row_issues.append("No primary bank account on file.")
        else:
            iban = normalize_iban(bank.account_number or "")
            if not iban:
                row_issues.append("Primary bank account number / IBAN is empty.")
            elif not validate_iban(iban, country_code):
                row_issues.append(
                    f"IBAN does not match the expected {country_code} format — verify with your bank."
                )
            swift = (bank.ifsc_code or "").strip().upper()
            if swift and not validate_swift(swift):
                row_issues.append("SWIFT/BIC on bank account looks invalid.")
            elif not swift:
                row_issues.append("SWIFT/BIC missing (stored in IFSC/SWIFT field).")

        if country_code == "KW":
            civil = (getattr(emp, "civil_id", None) or "").strip()
            if not civil:
                row_issues.append("Civil ID missing — required for Kuwait compliance exports.")

        if row_issues:
            issues.append(GccExportIssue(emp.employee_code, emp.full_name, row_issues))
        else:
            ready += 1

    return GccExportReadiness(
        ready_count=ready,
        issue_count=len(issues),
        total_payable=records.count(),
        issues=issues,
        country_code=country_code,
    )


def primary_bank_for_export(employee):
    """Return primary bank if it passes IBAN validation for the employee tenant."""
    bank = employee.bank_accounts.filter(is_primary=True).first()
    if not bank:
        return None
    country = (
        getattr(employee.tenant, "country", None)
        or getattr(employee.tenant, "payroll_jurisdiction", None)
        or "KW"
    )
    iban = normalize_iban(bank.account_number or "")
    if not validate_iban(iban, str(country).upper()[:2]):
        return None
    return bank
