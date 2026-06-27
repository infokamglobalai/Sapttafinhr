"""Render HR letters to HTML/PDF with company letterhead."""
from __future__ import annotations

from jinja2 import Environment

from django.conf import settings

from .letter_company import get_company_profile, get_letter_signatories
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
        "signatories": get_letter_signatories(tenant),
    }


def _render_signatory_columns(signatories: list[dict], company_name: str) -> str:
    if not signatories:
        return (
            f'<p style="font-size:10pt; margin:0;">For <strong>{company_name}</strong></p>'
        )

    cols = []
    for sig in signatories:
        if sig.get("signature_url"):
            sig_body = f'<img src="{sig["signature_url"]}" alt="Signature" style="height:44px; max-width:160px;">'
        else:
            sig_body = f'<p style="margin:0 0 4px;"><strong>{sig.get("name", "")}</strong></p>'
        title = sig.get("title") or ""
        if sig.get("signature_url") and sig.get("name"):
            title_block = (
                f'<p style="font-size:10pt; margin:4px 0 0;"><strong>{sig["name"]}</strong></p>'
                f'<p style="font-size:9pt; margin:0; color:#444;">{title}</p>'
            )
        else:
            title_block = f'<p style="font-size:9pt; margin:4px 0 0; color:#444;">{title}</p>' if title else ""
        cols.append(
            f'<div class="signature-col">{sig_body}{title_block}</div>'
        )

    company_line = f'<p class="for-company">For <strong>{company_name}</strong></p>'
    return f'<div class="signatories-grid">{"".join(cols)}</div>{company_line}'


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

    stamp_block = ""
    if branding["stamp_url"]:
        stamp_block = f'<img src="{branding["stamp_url"]}" alt="Stamp" style="height:64px; opacity:0.9;">'

    signatories_html = _render_signatory_columns(
        branding.get("signatories") or [],
        company.get("name", tenant.name),
    )

    footer_block = branding["footer_html"] or company.get("footer_text") or company.get("contact_email", "")
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
    .signature-row {{ margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }}
    .signatories-grid {{ display: flex; flex-wrap: wrap; gap: 28px; flex: 1; align-items: flex-end; }}
    .signature-col {{ min-width: 120px; max-width: 180px; }}
    .for-company {{ font-size: 10pt; margin: 12px 0 0; width: 100%; }}
    .stamp-col {{ text-align: right; flex-shrink: 0; }}
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
    <div style="flex:1;">{signatories_html}</div>
    <div class="stamp-col">{stamp_block}</div>
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
