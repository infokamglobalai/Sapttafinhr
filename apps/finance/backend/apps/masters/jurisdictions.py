"""Tax-jurisdiction definitions — India + the six GCC states.

Single source of truth for per-country tax defaults that drive the Region /
Tax Jurisdiction setting. Selecting a country pre-fills these onto the Company;
the tax engine (Phase 2) branches on ``tax_regime``.

Figures verified June 2026 — re-verify rates, thresholds and e-invoicing
mandates periodically, they change (e.g. ZATCA waves, the UAE Peppol rollout).
"""

# Tax regimes — kept in sync with Company.TaxRegime choices.
INDIA_GST = "INDIA_GST"
GCC_VAT = "GCC_VAT"
NO_TAX = "NONE"

# E-invoicing schemes.
EINVOICE_NONE = "NONE"
EINVOICE_NIC_IRP = "NIC_IRP"               # India — IRN / QR via NIC IRP
EINVOICE_ZATCA = "ZATCA"                    # KSA — Fatoora Phase 2 clearance
EINVOICE_PEPPOL_PINT_AE = "PEPPOL_PINT_AE"  # UAE — Peppol PINT AE (5-corner)

# country_code -> rule set. ``standard_vat_rate`` is "" for India (GST uses
# per-item slabs, not one standard rate) and for the not-yet-VAT GCC states.
# Thresholds are informational (local currency, mandatory-registration level).
JURISDICTIONS: dict[str, dict] = {
    "IN": {
        "name": "India",
        "tax_regime": INDIA_GST,
        "tax_id_label": "GSTIN",
        "currency": "INR",
        "standard_vat_rate": "0",
        "reg_threshold": "2000000",
        "fiscal_year_start_month": 4,
        "einvoice_scheme": EINVOICE_NIC_IRP,
    },
    "AE": {
        "name": "United Arab Emirates",
        "tax_regime": GCC_VAT,
        "tax_id_label": "TRN",
        "currency": "AED",
        "standard_vat_rate": "5",
        "reg_threshold": "375000",
        "fiscal_year_start_month": 1,
        "einvoice_scheme": EINVOICE_PEPPOL_PINT_AE,
    },
    "SA": {
        "name": "Saudi Arabia",
        "tax_regime": GCC_VAT,
        "tax_id_label": "TRN",
        "currency": "SAR",
        "standard_vat_rate": "15",
        "reg_threshold": "375000",
        "fiscal_year_start_month": 1,
        "einvoice_scheme": EINVOICE_ZATCA,
    },
    "BH": {
        "name": "Bahrain",
        "tax_regime": GCC_VAT,
        "tax_id_label": "TRN",
        "currency": "BHD",
        "standard_vat_rate": "10",
        "reg_threshold": "37500",
        "fiscal_year_start_month": 1,
        "einvoice_scheme": EINVOICE_NONE,
    },
    "OM": {
        "name": "Oman",
        "tax_regime": GCC_VAT,
        "tax_id_label": "VATIN",
        "currency": "OMR",
        "standard_vat_rate": "5",
        "reg_threshold": "38500",
        "fiscal_year_start_month": 1,
        "einvoice_scheme": EINVOICE_NONE,
    },
    "QA": {
        "name": "Qatar",
        "tax_regime": NO_TAX,
        "tax_id_label": "TIN",
        "currency": "QAR",
        "standard_vat_rate": "0",
        "reg_threshold": "0",
        "fiscal_year_start_month": 1,
        "einvoice_scheme": EINVOICE_NONE,
    },
    "KW": {
        "name": "Kuwait",
        "tax_regime": NO_TAX,
        "tax_id_label": "TIN",
        "currency": "KWD",
        "standard_vat_rate": "0",
        "reg_threshold": "0",
        "fiscal_year_start_month": 1,
        "einvoice_scheme": EINVOICE_NONE,
    },
}


def get_jurisdiction(country_code: str | None) -> dict | None:
    """Return the rule set for a country code (case-insensitive), or None."""
    return JURISDICTIONS.get((country_code or "").upper())


def country_choices() -> list[tuple[str, str]]:
    """(code, name) pairs for a model/serializer choice field."""
    return [(code, rules["name"]) for code, rules in JURISDICTIONS.items()]
