"""Render SaaS subscription GST invoices as HTML/PDF."""
from __future__ import annotations

from django.conf import settings
from django.template.loader import render_to_string


def _vendor_gstin() -> str:
    return getattr(settings, "SAAS_VENDOR_GSTIN", "27AABCZ1234A1Z5")


def invoice_context(invoice) -> dict:
    sub = invoice.subscription
    tenant = sub.tenant
    return {
        "invoice": invoice,
        "tenant_name": tenant.name,
        "plan_name": sub.plan.name if sub.plan_id else "Saptta",
        "vendor_gstin": _vendor_gstin(),
    }


def render_invoice_html(invoice) -> str:
    return render_to_string("saas/gst_invoice.html", invoice_context(invoice))


def render_invoice_pdf(invoice) -> bytes:
    html = render_invoice_html(invoice)
    try:
        from xhtml2pdf import pisa
        import io

        buf = io.BytesIO()
        pisa.CreatePDF(html, dest=buf, encoding="utf-8")
        return buf.getvalue()
    except Exception:
        return html.encode("utf-8")
