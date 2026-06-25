"""Indian IFSC validation and lookup (Razorpay public API)."""

from __future__ import annotations

import re

import requests
from rest_framework.exceptions import ValidationError

IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
IFSC_LOOKUP_URL = "https://ifsc.razorpay.com/{ifsc}"
IFSC_TIMEOUT = 10


def normalize_ifsc(value: str) -> str:
    return (value or "").strip().upper().replace(" ", "")


def validate_ifsc_format(value: str, *, required: bool = False) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return "IFSC is required." if required else None
    code = normalize_ifsc(raw)
    if len(code) != 11:
        return "IFSC must be exactly 11 characters."
    if not IFSC_RE.match(code):
        return (
            "Invalid IFSC format. Use 4 letters + 0 + 6 characters "
            "(e.g. HDFC0001234)."
        )
    return None


def build_branch_text(data: dict) -> str:
    parts: list[str] = []
    for key in ("BRANCH", "ADDRESS", "CITY", "DISTRICT", "STATE"):
        val = (data.get(key) or "").strip()
        if val and (not parts or val.lower() not in parts[-1].lower()):
            parts.append(val)
    text = ", ".join(parts)
    if len(text) > 200:
        return text[:197] + "..."
    return text


def lookup_ifsc(ifsc: str) -> dict:
    """Return Razorpay IFSC payload or raise ValidationError."""
    err = validate_ifsc_format(ifsc, required=True)
    if err:
        raise ValidationError({"ifsc": err})

    code = normalize_ifsc(ifsc)
    try:
        resp = requests.get(IFSC_LOOKUP_URL.format(ifsc=code), timeout=IFSC_TIMEOUT)
    except requests.RequestException as exc:
        raise ValidationError(
            {"ifsc": "Could not reach IFSC directory. Try again in a moment."}
        ) from exc

    if resp.status_code == 404:
        raise ValidationError(
            {"ifsc": f"IFSC “{code}” was not found. Check the code and try again."}
        )
    if not resp.ok:
        raise ValidationError({"ifsc": "IFSC lookup failed. Please try again."})

    data = resp.json()
    if not data.get("BANK"):
        raise ValidationError({"ifsc": "Invalid IFSC response. Please try again."})

    return {
        "ifsc": data.get("IFSC") or code,
        "bank": data.get("BANK", ""),
        "branch": data.get("BRANCH", ""),
        "address": data.get("ADDRESS", ""),
        "city": data.get("CITY", ""),
        "district": data.get("DISTRICT", ""),
        "state": data.get("STATE", ""),
        "centre": data.get("CENTRE", ""),
        "micr": data.get("MICR", ""),
        "branch_text": build_branch_text(data),
        "upi": bool(data.get("UPI")),
    }
