"""Indian GSTIN / PAN and GCC tax ID validation for Finance masters."""
from __future__ import annotations

import re

GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
VALID_GST_STATE_CODES = frozenset(f"{i:02d}" for i in range(1, 38))
PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")

GCC_TAX_ID_PATTERNS: dict[str, re.Pattern[str]] = {
    "AE": re.compile(r"^[0-9]{15}$"),
    "SA": re.compile(r"^3[0-9]{14}$"),
    "BH": re.compile(r"^[0-9]{15}$"),
    "OM": re.compile(r"^[A-Z0-9]{10,15}$"),
    "KW": re.compile(r"^[0-9A-Z]{5,20}$"),
    "QA": re.compile(r"^[0-9A-Z]{5,20}$"),
}


def normalise_tax_id(value: str) -> str:
    return (value or "").strip().upper().replace(" ", "")


def validate_gstin(value: str, *, required: bool = False) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return "GSTIN is required." if required else None
    gstin = normalise_tax_id(raw)
    if len(gstin) != 15:
        return "GSTIN must be exactly 15 characters."
    if not GSTIN_RE.match(gstin):
        return (
            "Invalid GSTIN format. Use 2-digit state code + 10-char PAN + "
            "entity number + Z + checksum (e.g. 27AAACS1234D1Z5)."
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
        return "Invalid PAN format. Use 5 letters + 4 digits + 1 letter (e.g. AAACS1234D)."
    return None


def gstin_pan_consistency(gstin: str, pan: str) -> str | None:
    g = normalise_tax_id(gstin)
    p = normalise_tax_id(pan)
    if not g or not p:
        return None
    embedded = g[2:12]
    if embedded != p:
        return f"GSTIN PAN segment ({embedded}) must match the company PAN ({p})."
    return None


def gstin_state_consistency(gstin: str, state_code: str) -> str | None:
    g = normalise_tax_id(gstin)
    sc = (state_code or "").strip()
    if not g or not sc:
        return None
    if len(sc) == 1:
        sc = f"0{sc}"
    if g[:2] != sc.zfill(2)[-2:]:
        return f"GSTIN state code ({g[:2]}) must match home state code ({sc})."
    return None


def validate_gcc_tax_id(country: str, value: str) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None
    code = (country or "").upper()
    tax_id = normalise_tax_id(raw)
    pattern = GCC_TAX_ID_PATTERNS.get(code)
    if not pattern:
        if not re.match(r"^[0-9A-Z\-]{5,20}$", tax_id.replace("-", "")):
            return "Tax ID must be 5–20 alphanumeric characters."
        return None
    if not pattern.match(tax_id):
        return f"Invalid tax registration number for {code}."
    return None


def is_india_company(country: str | None, base_currency: str | None) -> bool:
    return (country or "IN").upper() == "IN" or (base_currency or "INR").upper() == "INR"
