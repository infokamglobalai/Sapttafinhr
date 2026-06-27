"""Client SOW / contract document rendering and lifecycle."""
from __future__ import annotations

import datetime
from decimal import Decimal

from django.db import transaction
from jinja2 import Environment

from apps.masters.models import Company, Party
from apps.masters.numbering import peek_next

from .client_doc_defaults import DEFAULT_CLIENT_DOC_TEMPLATES, get_default_html, get_default_name
from .models import ClientDocument, ClientDocumentTemplate, Quotation, SalesOrder


def _money_fmt(value, currency: str = "INR") -> str:
    if value in (None, ""):
        return ""
    try:
        n = Decimal(str(value))
    except Exception:
        return str(value)
    if currency == "INR":
        return f"₹{n:,.2f}"
    return f"{currency} {n:,.2f}"


def _company_ctx(company: Company) -> dict:
    return {
        "name": company.name,
        "legal_name": company.legal_name,
        "gstin": company.gstin,
        "pan": company.pan,
        "state_code": company.state_code,
        "base_currency": company.base_currency,
    }


def _customer_ctx(customer: Party) -> dict:
    return {
        "name": customer.name,
        "legal_name": customer.legal_name,
        "gstin": customer.gstin,
        "pan": customer.pan,
        "email": customer.email,
        "phone": customer.phone,
        "billing_address": customer.billing_address,
        "state_code": customer.state_code,
    }


def _quotation_ctx(quotation: Quotation | None, currency: str) -> dict | None:
    if not quotation:
        return None
    lines = []
    for line in quotation.lines.all():
        lines.append({
            "description": line.description,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "line_total": line.line_total,
            "line_total_fmt": _money_fmt(line.line_total, currency),
        })
    return {
        "quote_no": quotation.quote_no,
        "date": quotation.date.isoformat() if quotation.date else "",
        "valid_until": quotation.valid_until.isoformat() if quotation.valid_until else "",
        "grand_total": quotation.grand_total,
        "grand_total_fmt": _money_fmt(quotation.grand_total, currency),
        "notes": quotation.notes,
        "lines": lines,
    }


def build_document_context(
    *,
    company: Company,
    customer: Party,
    doc_no: str,
    quotation: Quotation | None = None,
    sales_order: SalesOrder | None = None,
    extra: dict | None = None,
) -> dict:
    currency = company.base_currency or "INR"
    ctx = {
        "company": _company_ctx(company),
        "customer": _customer_ctx(customer),
        "quotation": _quotation_ctx(quotation, currency),
        "sales_order": None,
        "doc_no": doc_no,
        "today": datetime.date.today(),
        "today_formatted": datetime.date.today().strftime("%d %B %Y"),
        "project_name": "",
        "project_value": "",
        "project_value_fmt": "",
        "milestones": "",
        "payment_terms": "",
        "contract_start": "",
        "contract_end": "",
        "scope_summary": "",
    }
    if sales_order:
        ctx["sales_order"] = {
            "so_no": sales_order.so_no,
            "date": sales_order.date.isoformat() if sales_order.date else "",
            "grand_total_fmt": _money_fmt(sales_order.grand_total, currency),
        }
    if extra:
        merged = dict(extra)
        if merged.get("project_value") and not merged.get("project_value_fmt"):
            merged["project_value_fmt"] = _money_fmt(merged["project_value"], currency)
        ctx.update({k: v for k, v in merged.items() if v is not None})
    if not ctx.get("project_value_fmt") and quotation:
        ctx["project_value_fmt"] = _money_fmt(quotation.grand_total, currency)
    return ctx


def render_template_html(template: ClientDocumentTemplate, context: dict) -> str:
    env = Environment(autoescape=True)
    tmpl = env.from_string(template.template_html)
    return tmpl.render(**context)


def wrap_client_document_html(body_html: str, company: Company) -> str:
    gst_line = (
        f'<div style="font-size:9pt; color:#555;">GSTIN: {company.gstin}</div>'
        if company.gstin else ""
    )
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body {{ font-family: Arial, sans-serif; font-size: 11pt; margin: 36px 48px; color: #111; line-height: 1.55; }}
  h2, h3 {{ color: #1f2937; }}
  table {{ border-collapse: collapse; }}
</style></head>
<body>
  <div style="text-align:center; border-bottom:2px solid #e5e7eb; padding-bottom:12px; margin-bottom:24px;">
    <div style="font-size:14pt; font-weight:bold;">{company.legal_name or company.name}</div>
    {gst_line}
  </div>
  {body_html}
</body></html>"""


def render_document_pdf(document: ClientDocument) -> bytes:
    from django.conf import settings

    company = document.company
    body = document.body_html or ""
    full_html = wrap_client_document_html(body, company)
    try:
        from xhtml2pdf import pisa
        import io

        buf = io.BytesIO()
        pisa.CreatePDF(full_html, dest=buf, encoding="utf-8")
        return buf.getvalue()
    except Exception:
        return full_html.encode("utf-8")


@transaction.atomic
def seed_default_client_doc_templates(company: Company) -> tuple[int, int]:
    created = skipped = 0
    existing = set(
        ClientDocumentTemplate.objects.filter(company=company).values_list("doc_type", flat=True)
    )
    for doc_type in DEFAULT_CLIENT_DOC_TEMPLATES:
        if doc_type in existing:
            skipped += 1
            continue
        ClientDocumentTemplate.objects.create(
            company=company,
            doc_type=doc_type,
            name=get_default_name(doc_type),
            template_html=get_default_html(doc_type),
            is_active=True,
        )
        created += 1
    return created, skipped


def _resolve_template(company: Company, *, doc_type: str = "sow", template_id: int | None = None):
    if template_id:
        return ClientDocumentTemplate.objects.get(pk=template_id, company=company, is_active=True)
    template = ClientDocumentTemplate.objects.filter(
        company=company, doc_type=doc_type, is_active=True
    ).first()
    if template:
        return template
    seed_default_client_doc_templates(company)
    return ClientDocumentTemplate.objects.filter(
        company=company, doc_type=doc_type, is_active=True
    ).first()


@transaction.atomic
def create_client_document(
    *,
    company: Company,
    customer: Party,
    doc_type: str = "sow",
    template: ClientDocumentTemplate | None = None,
    quotation: Quotation | None = None,
    sales_order: SalesOrder | None = None,
    extra_context: dict | None = None,
    title: str = "",
) -> ClientDocument:
    template = template or _resolve_template(company, doc_type=doc_type)
    if not template:
        raise ValueError("No client document template found.")

    doc_no = peek_next(company, "client_document")

    ctx = build_document_context(
        company=company,
        customer=customer,
        doc_no=doc_no,
        quotation=quotation,
        sales_order=sales_order,
        extra=extra_context,
    )
    body = render_template_html(template, ctx)
    if not title:
        title = f"{template.get_doc_type_display()} — {customer.name}"

    return ClientDocument.objects.create(
        company=company,
        template=template,
        doc_type=template.doc_type,
        doc_no=doc_no,
        title=title,
        customer=customer,
        quotation=quotation,
        sales_order=sales_order,
        body_html=body,
        extra_context=extra_context or {},
        status=ClientDocument.Status.DRAFT,
    )


@transaction.atomic
def create_from_quotation(
    quotation: Quotation,
    *,
    doc_type: str = "sow",
    template_id: int | None = None,
    extra_context: dict | None = None,
) -> ClientDocument:
    quotation = Quotation.objects.prefetch_related("lines").select_related(
        "customer", "company"
    ).get(pk=quotation.pk)
    extra = dict(extra_context or {})
    if not extra.get("project_name"):
        extra["project_name"] = quotation.notes or f"Engagement per {quotation.quote_no}"
    if not extra.get("project_value"):
        extra["project_value"] = str(quotation.grand_total)
    template = _resolve_template(quotation.company, doc_type=doc_type, template_id=template_id)
    return create_client_document(
        company=quotation.company,
        customer=quotation.customer,
        doc_type=doc_type,
        template=template,
        quotation=quotation,
        extra_context=extra,
    )


def update_document_body(document: ClientDocument, body_html: str) -> ClientDocument:
    if document.status == ClientDocument.Status.FINAL:
        raise ValueError("Final documents cannot be edited.")
    document.body_html = body_html
    document.save(update_fields=["body_html", "updated_at"])
    return document


def finalize_document(document: ClientDocument) -> ClientDocument:
    from django.utils import timezone

    document.status = ClientDocument.Status.FINAL
    document.finalized_at = timezone.now()
    document.save(update_fields=["status", "finalized_at", "updated_at"])
    return document
