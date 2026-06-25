"""Company letterhead / signatory settings stored in TenantSetting + branding assets."""
from __future__ import annotations

from dataclasses import dataclass

from apps.tenants.models import TenantSetting

from .models import CompanyLetterBranding

KEYS = {
    "display_name": "letter_company_display_name",
    "address": "letter_registered_address",
    "city": "letter_city",
    "signatory_name": "letter_signatory_name",
    "signatory_title": "letter_signatory_title",
    "contact_email": "letter_contact_email",
    "contact_phone": "letter_contact_phone",
    "ref_prefix": "letter_ref_prefix",
    "footer_text": "letter_footer_text",
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
    footer_text: str
    logo_url: str = ""
    signature_url: str = ""
    stamp_url: str = ""

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
            "footer_text": self.footer_text,
            "logo_url": self.logo_url,
            "signature_url": self.signature_url,
            "stamp_url": self.stamp_url,
        }


def get_branding(tenant) -> CompanyLetterBranding | None:
    branding, _ = CompanyLetterBranding.objects.get_or_create(tenant=tenant)
    return branding


def get_company_profile(tenant) -> CompanyLetterProfile:
    branding = CompanyLetterBranding.objects.filter(tenant=tenant).first()
    logo_url = ""
    signature_url = ""
    stamp_url = ""
    footer_html = TenantSetting.get(tenant, KEYS["footer_text"]) or ""
    if branding:
        if branding.logo:
            logo_url = branding.logo.url
        elif tenant.company_logo:
            logo_url = tenant.company_logo.url
        if branding.signature_image:
            signature_url = branding.signature_image.url
        if branding.stamp_image:
            stamp_url = branding.stamp_image.url
        if branding.footer_html:
            footer_html = branding.footer_html
    elif tenant.company_logo:
        logo_url = tenant.company_logo.url

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
        footer_text=footer_html,
        logo_url=logo_url,
        signature_url=signature_url,
        stamp_url=stamp_url,
    )


def save_company_profile(tenant, data: dict, files: dict | None = None):
    for field, key in KEYS.items():
        if field in data and field not in ("footer_text",):
            TenantSetting.set(tenant, key, (data[field] or "").strip())

    branding = get_branding(tenant)
    if "footer_text" in data:
        branding.footer_html = (data["footer_text"] or "").strip()
    if files:
        if files.get("logo"):
            branding.logo = files["logo"]
        if files.get("signature_image"):
            branding.signature_image = files["signature_image"]
        if files.get("stamp_image"):
            branding.stamp_image = files["stamp_image"]
    branding.save()
