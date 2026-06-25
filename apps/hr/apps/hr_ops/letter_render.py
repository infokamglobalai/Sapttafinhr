"""Render HR letters to HTML/PDF with company letterhead."""
from __future__ import annotations

from jinja2 import Environment

from django.conf import settings

from .letter_company import get_company_profile
from .letter_services import build_letter_context
from .models import CompanyLetterBranding, HRLetter, LetterTemplate


def _branding_urls(tenant) -> dict:
    branding = getattr(tenant, "letter_branding", None)
    try:
        branding = CompanyLetterBranding.objects.filter(tenant=tenant).first()
    except Exception:
        branding = None

    logo_url = ""
    if branding and branding.logo:
        logo_url = branding.logo.url
    elif tenant.company_logo:
        logo_url = tenant.company_logo.url

    signature_url = branding.signature_image.url if branding and branding.signature_image else ""
    stamp_url = branding.stamp_image.url if branding and branding.stamp_image else ""
    footer_html = branding.footer_html if branding else ""

    return {
        "logo_url": logo_url,
        "signature_url": signature_url,
        "stamp_url": stamp_url,
        "footer_html": footer_html,
    }


def render_template_html(
    tenant,
    employee,
    template: LetterTemplate,
    extra_context: dict | None = None,
) -> str:
    env = Environment(autoescape=True)
    tmpl = env.from_string(template.template_html)
    context = build_letter_context(tenant, employee, extra_context)
    return tmpl.render(**context)


def render_letter_body(letter: HRLetter) -> str:
    if letter.draft_html:
        return letter.draft_html
    if letter.template_id:
        return render_template_html(
            letter.tenant,
            letter.employee,
            letter.template,
            letter.extra_context,
        )
    return ""


def wrap_letter_document(content_html: str, tenant) -> str:
    company = get_company_profile(tenant).as_context()
    branding = _branding_urls(tenant)

    logo_block = ""
    if branding["logo_url"]:
        logo_block = f'<img src="{branding["logo_url"]}" alt="" style="height:56px; max-width:220px;">'

    signature_block = ""
    if branding["signature_url"]:
        signature_block = f'<img src="{branding["signature_url"]}" alt="Signature" style="height:48px;">'
    elif company.get("signatory_name"):
        signature_block = f'<p style="margin:0;"><strong>{company["signatory_name"]}</strong></p>'

    stamp_block = ""
    if branding["stamp_url"]:
        stamp_block = f'<img src="{branding["stamp_url"]}" alt="Stamp" style="height:64px; opacity:0.9;">'

    footer_block = branding["footer_html"] or company.get("contact_email", "")
    addr_parts = [company.get("address", ""), company.get("city", "")]
    addr_line = ", ".join(p for p in addr_parts if p)

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: Arial, sans-serif; font-size: 12pt; margin: 36px 48px; color: #111; line-height: 1.55; }}
    .letterhead {{ text-align: center; margin-bottom: 28px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }}
    .letterhead .name {{ font-size: 15pt; font-weight: bold; margin: 8px 0 4px; }}
    .letterhead .addr {{ font-size: 9pt; color: #555; }}
    .content {{ line-height: 1.65; }}
    .signature-row {{ margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; }}
    .signature-col {{ max-width: 45%; }}
    .footer {{ margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #666; text-align: center; }}
    table {{ width: 100%; border-collapse: collapse; }}
  </style>
</head>
<body>
  <div class="letterhead">
    {logo_block}
    <div class="name">{company.get("name", tenant.name)}</div>
    {f'<div class="addr">{addr_line}</div>' if addr_line else ''}
  </div>
  <div class="content">{content_html}</div>
  <div class="signature-row">
    <div class="signature-col">
      {signature_block}
      <p style="font-size:10pt; margin:4px 0 0;">{company.get("signatory_title", "")}</p>
      <p style="font-size:10pt; margin:0;">For <strong>{company.get("name", tenant.name)}</strong></p>
    </div>
    <div class="signature-col" style="text-align:right;">{stamp_block}</div>
  </div>
  {f'<div class="footer">{footer_block}</div>' if footer_block else ''}
</body>
</html>"""


def render_letter_pdf(letter: HRLetter) -> bytes:
    from utils.pdf import render_html_to_pdf

    body = render_letter_body(letter)
    full_html = wrap_letter_document(body, letter.tenant)
    base_url = getattr(settings, "MEDIA_URL", "/media/")
    if not base_url.startswith("http"):
        base_url = f"file://{settings.MEDIA_ROOT}/"
    return render_html_to_pdf(full_html, base_url=base_url)
