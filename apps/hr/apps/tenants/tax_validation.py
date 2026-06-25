"""Tax / registration ID validation — India GSTIN/PAN and GCC TRN/VATIN."""
from __future__ import annotations

import re

from .jurisdiction import GCC_JURISDICTIONS, INDIA, is_india_payroll

# Indian GSTIN: 2-digit state + 10-char PAN + entity + Z + checksum
# e.g. 22AAAAA0000A1Z5
GSTIN_RE = re.compile(
    r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$"
)
VALID_GST_STATE_CODES = frozenset(
    f"{i:02d}" for i in range(1, 38)
)  # 01–37 (+ legacy codes covered)

PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")

# GCC tax registration patterns (optional field — validate when provided).
GCC_TAX_ID_PATTERNS: dict[str, re.Pattern[str]] = {
    "AE": re.compile(r"^[0-9]{15}$"),           # UAE TRN
    "SA": re.compile(r"^3[0-9]{14}$"),            # KSA VAT (15 digits, starts with 3)
    "BH": re.compile(r"^[0-9]{15}$"),             # Bahrain TRN
    "OM": re.compile(r"^[A-Z0-9]{10,15}$"),       # Oman VATIN
    "KW": re.compile(r"^[0-9A-Z]{5,20}$"),        # Kuwait commercial / TIN
    "QA": re.compile(r"^[0-9A-Z]{5,20}$"),        # Qatar TIN (optional)
}

TAX_ID_LABELS: dict[str, str] = {
    INDIA: "GSTIN",
    "AE": "TRN (Tax Registration Number)",
    "SA": "VAT Registration Number (TRN)",
    "BH": "TRN",
    "OM": "VATIN",
    "KW": "Commercial / Tax ID (optional)",
    "QA": "Tax Identification Number (optional)",
}


def tax_id_label(jurisdiction: str | None) -> str:
    code = (jurisdiction or INDIA).upper()
    return TAX_ID_LABELS.get(code, "Tax registration number")


def tax_id_hint(jurisdiction: str | None) -> str:
    code = (jurisdiction or INDIA).upper()
    if code == INDIA:
        return "15 characters — state code + PAN + entity + Z + checksum (e.g. 22AAAAA0000A1Z5)"
    hints = {
        "AE": "15-digit UAE TRN (e.g. 100123456700003)",
        "SA": "15-digit KSA VAT number starting with 3",
        "BH": "15-digit Bahrain TRN",
        "OM": "10–15 character Oman VATIN",
        "KW": "Commercial registration or tax ID (5–20 characters)",
        "QA": "Tax ID if registered (5–20 characters)",
    }
    return hints.get(code, "Tax registration number for your region")


def tax_id_placeholder(jurisdiction: str | None) -> str:
    code = (jurisdiction or INDIA).upper()
    placeholders = {
        INDIA: "22AAAAA0000A1Z5",
        "AE": "100123456700003",
        "SA": "310123456700003",
        "BH": "123456789012345",
        "OM": "OM1234567890",
        "KW": "CR-12345",
        "QA": "TIN-12345",
    }
    return placeholders.get(code, "")


def normalise_tax_id(value: str) -> str:
    return (value or "").strip().upper().replace(" ", "")


def validate_gstin(value: str) -> str | None:
    """Return an error message, or None if valid / empty."""
    raw = (value or "").strip()
    if not raw:
        return None
    gstin = normalise_tax_id(raw)
    if len(gstin) != 15:
        return "GSTIN must be exactly 15 characters."
    if not GSTIN_RE.match(gstin):
        return (
            "Invalid GSTIN format. Use 2-digit state code + 10-char PAN + "
            "entity number + Z + checksum (e.g. 22AAAAA0000A1Z5)."
        )
    if gstin[:2] not in VALID_GST_STATE_CODES:
        return f"Invalid GST state code “{gstin[:2]}”. Use a valid Indian state code (01–37)."
    return None


def validate_pan(value: str) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None
    pan = normalise_tax_id(raw)
    if len(pan) != 10:
        return "PAN must be exactly 10 characters."
    if not PAN_RE.match(pan):
        return "Invalid PAN format. Use 5 letters + 4 digits + 1 letter (e.g. AAAAA0000A)."
    return None


def validate_gcc_tax_id(jurisdiction: str, value: str) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None
    code = (jurisdiction or "").upper()
    tax_id = normalise_tax_id(raw)
    pattern = GCC_TAX_ID_PATTERNS.get(code)
    if not pattern:
        if not re.match(r"^[0-9A-Z\-]{5,20}$", tax_id.replace("-", "")):
            return "Tax ID must be 5–20 alphanumeric characters."
        return None
    if not pattern.match(tax_id):
        return f"Invalid {tax_id_label(code)} for {code}. {tax_id_hint(code)}"
    return None


def validate_tax_id(jurisdiction: str | None, value: str) -> str | None:
    if is_india_payroll(jurisdiction):
        return validate_gstin(value)
    return validate_gcc_tax_id(jurisdiction or INDIA, value)


def gstin_pan_consistency(gstin: str, pan: str) -> str | None:
    """GSTIN embeds the entity PAN at positions 3–12."""
    g = normalise_tax_id(gstin)
    p = normalise_tax_id(pan)
    if not g or not p:
        return None
    embedded = g[2:12]
    if embedded != p:
        return f"GSTIN PAN segment ({embedded}) must match the company PAN ({p})."
    return None
