"""In-account invoice view and PDF download for workspace owners."""
from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import render

from utils.pdf import render_pdf_response

from .billing_services import fetch_invoice_detail, invoice_render_context


def _owner_invoice_or_404(request, invoice_id: int):
    if not request.user.is_company_owner:
        raise Http404
    tenant = getattr(request, "tenant", None)
    if not tenant:
        raise Http404
    detail = fetch_invoice_detail(tenant, invoice_id)
    if not detail:
        raise Http404
    return tenant, detail


@login_required
def invoice_view(request, invoice_id: int):
    """HTML invoice for in-browser viewing."""
    _tenant, detail = _owner_invoice_or_404(request, invoice_id)
    ctx = invoice_render_context(detail)
    ctx["invoice_id"] = invoice_id
    return render(request, "billing/saas_invoice.html", ctx)


@login_required
def invoice_pdf(request, invoice_id: int):
    """Downloadable GST invoice PDF."""
    _tenant, detail = _owner_invoice_or_404(request, invoice_id)
    ctx = invoice_render_context(detail)
    number = ctx["invoice"]["number"] or f"invoice-{invoice_id}"
    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in number)
    return render_pdf_response(
        "billing/saas_invoice_pdf.html",
        ctx,
        filename=f"{safe_name}.pdf",
    )
