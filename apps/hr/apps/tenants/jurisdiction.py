"""Payroll jurisdiction — India vs GCC country packs (P0 foundation)."""
from __future__ import annotations

from functools import wraps

from django.contrib import messages
from django.shortcuts import redirect

# ISO 3166-1 alpha-2 payroll jurisdictions we recognise today.
INDIA = "IN"
GCC_JURISDICTIONS = frozenset({"KW", "AE", "SA", "BH", "OM", "QA"})
SUPPORTED_JURISDICTIONS = frozenset({INDIA, *GCC_JURISDICTIONS})

JURISDICTION_LABELS = {
    INDIA: "India",
    "KW": "Kuwait",
    "AE": "United Arab Emirates",
    "SA": "Saudi Arabia",
    "BH": "Bahrain",
    "OM": "Oman",
    "QA": "Qatar",
}

# Country → locale defaults applied at tenant creation / country change.
LOCALE_DEFAULTS: dict[str, dict[str, str]] = {
    INDIA: {
        "country": INDIA,
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "payroll_jurisdiction": INDIA,
    },
    "KW": {
        "country": "KW",
        "currency": "KWD",
        "timezone": "Asia/Kuwait",
        "payroll_jurisdiction": "KW",
    },
    "AE": {
        "country": "AE",
        "currency": "AED",
        "timezone": "Asia/Dubai",
        "payroll_jurisdiction": "AE",
    },
    "SA": {
        "country": "SA",
        "currency": "SAR",
        "timezone": "Asia/Riyadh",
        "payroll_jurisdiction": "SA",
    },
    "BH": {
        "country": "BH",
        "currency": "BHD",
        "timezone": "Asia/Bahrain",
        "payroll_jurisdiction": "BH",
    },
    "OM": {
        "country": "OM",
        "currency": "OMR",
        "timezone": "Asia/Muscat",
        "payroll_jurisdiction": "OM",
    },
    "QA": {
        "country": "QA",
        "currency": "QAR",
        "timezone": "Asia/Qatar",
        "payroll_jurisdiction": "QA",
    },
}

SIGNUP_COUNTRY_CHOICES = [
    (INDIA, "India"),
    ("KW", "Kuwait"),
    ("AE", "United Arab Emirates"),
    ("SA", "Saudi Arabia"),
    ("BH", "Bahrain"),
    ("OM", "Oman"),
    ("QA", "Qatar"),
]


def normalise_jurisdiction(code: str | None) -> str:
    code = (code or INDIA).strip().upper()
    return code if code in SUPPORTED_JURISDICTIONS else INDIA


def locale_defaults_for_country(country: str | None) -> dict[str, str]:
    """Return country/currency/timezone/payroll_jurisdiction for a signup country."""
    code = normalise_jurisdiction(country)
    return dict(LOCALE_DEFAULTS.get(code, LOCALE_DEFAULTS[INDIA]))


def apply_locale_to_tenant(tenant, country: str | None) -> None:
    """Set tenant locale fields from country; saves the tenant."""
    defaults = locale_defaults_for_country(country)
    tenant.country = defaults["country"]
    tenant.currency = defaults["currency"]
    tenant.timezone = defaults["timezone"]
    tenant.payroll_jurisdiction = defaults["payroll_jurisdiction"]
    tenant.save(
        update_fields=["country", "currency", "timezone", "payroll_jurisdiction", "updated_at"]
    )


def jurisdiction_label(code: str | None) -> str:
    return JURISDICTION_LABELS.get(normalise_jurisdiction(code), code or INDIA)


def is_india_payroll(jurisdiction: str | None) -> bool:
    return normalise_jurisdiction(jurisdiction) == INDIA


def is_gcc_payroll(jurisdiction: str | None) -> bool:
    return normalise_jurisdiction(jurisdiction) in GCC_JURISDICTIONS


GCC_PAYROLL_ROADMAP_MSG = (
    "Core HR is live for your region. GCC statutory payroll (PIFSS, indemnity, WPS) "
    "is on our roadmap — use payroll runs for basic salary tracking until then."
)

INDIA_ONLY_MSG = (
    "This feature is for India statutory payroll (PF, ESI, TDS, Form 16, Tally). "
    "GCC payroll compliance is coming soon."
)


def require_gcc_payroll(view_func):
    """Only GCC tenants may access GCC-specific payroll exports."""

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        tenant = getattr(request, "tenant", None)
        if tenant and not is_gcc_payroll(getattr(tenant, "payroll_jurisdiction", INDIA)):
            messages.info(request, "This export is for GCC payroll workspaces.")
            return redirect("payroll:run_list")
        return view_func(request, *args, **kwargs)

    return wrapper


def require_india_payroll(view_func):
    """Redirect GCC tenants away from India-only payroll/compliance views."""

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        tenant = getattr(request, "tenant", None)
        if tenant and not is_india_payroll(getattr(tenant, "payroll_jurisdiction", INDIA)):
            messages.info(request, INDIA_ONLY_MSG)
            return redirect("payroll:run_list")
        return view_func(request, *args, **kwargs)

    return wrapper
