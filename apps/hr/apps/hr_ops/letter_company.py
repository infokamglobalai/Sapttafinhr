"""Company letterhead / signatory settings stored in TenantSetting."""
from __future__ import annotations

from dataclasses import dataclass

from apps.tenants.models import TenantSetting

KEYS = {
    "display_name": "letter_company_display_name",
    "address": "letter_registered_address",
    "city": "letter_city",
    "signatory_name": "letter_signatory_name",
    "signatory_title": "letter_signatory_title",
    "contact_email": "letter_contact_email",
    "contact_phone": "letter_contact_phone",
    "ref_prefix": "letter_ref_prefix",
}


@dataclass
class CompanyLetterProfile:
    name: str
    legal_name: str
    address: str
    city: str
    gstin: str
    pan: str
    cin: str
    signatory_name: str
    signatory_title: str
    contact_email: str
    contact_phone: str
    ref_prefix: str

    def as_context(self) -> dict:
        return {
            "name": self.name,
            "legal_name": self.legal_name,
            "address": self.address,
            "city": self.city,
            "gstin": self.gstin,
            "pan": self.pan,
            "cin": self.cin,
            "signatory_name": self.signatory_name,
            "signatory_title": self.signatory_title,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "ref_prefix": self.ref_prefix,
        }


def get_company_profile(tenant) -> CompanyLetterProfile:
    return CompanyLetterProfile(
        name=TenantSetting.get(tenant, KEYS["display_name"]) or tenant.name,
        legal_name=tenant.name,
        address=TenantSetting.get(tenant, KEYS["address"]) or tenant.address or "",
        city=TenantSetting.get(tenant, KEYS["city"]),
        gstin=tenant.gstin or "",
        pan=tenant.pan or "",
        cin=tenant.cin or "",
        signatory_name=TenantSetting.get(tenant, KEYS["signatory_name"]),
        signatory_title=TenantSetting.get(tenant, KEYS["signatory_title"]) or "HR Manager",
        contact_email=TenantSetting.get(tenant, KEYS["contact_email"]),
        contact_phone=TenantSetting.get(tenant, KEYS["contact_phone"]),
        ref_prefix=TenantSetting.get(tenant, KEYS["ref_prefix"]) or "HR",
    )


def save_company_profile(tenant, data: dict):
    for field, key in KEYS.items():
        if field in data:
            TenantSetting.set(tenant, key, (data[field] or "").strip())
