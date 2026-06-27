"""High-level GST services that use the adapters + build GSTR exports."""
from collections import defaultdict
from datetime import date as _date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from apps.billing.models import Invoice
from apps.masters.jurisdictions import (
    EINVOICE_PEPPOL_PINT_AE, EINVOICE_ZATCA, get_jurisdiction,
)
from apps.masters.models import Company

from .einvoice_gcc import build_pint_ae_xml, build_zatca_qr, build_zatca_xml, compute_hash
from .integrations.eway import get_ewb_client
from .integrations.nic_irp import get_irp_client
from .integrations.peppol import get_peppol_client
from .integrations.zatca import get_zatca_client
from .models import EInvoiceIRN, EWayBill, GSTR2BLine


def generate_einvoice(invoice: Invoice) -> EInvoiceIRN:
    """Generate IRN for an invoice via NIC IRP (or stub)."""
    if hasattr(invoice, "einvoice"):
        return invoice.einvoice
    client = get_irp_client()
    from .integrations.nic_irp_payload import payload_from_invoice
    nic_payload = payload_from_invoice(invoice)
    res = client.generate_irn(
        supplier_gstin=invoice.company.gstin or "27ACMEX0000X1Z0",
        invoice_no=invoice.invoice_no,
        invoice_date=invoice.date.isoformat(),
        total=str(invoice.grand_total),
        payload=nic_payload,
    )
    return EInvoiceIRN.objects.create(
        company=invoice.company, invoice=invoice,
        irn=res.irn, ack_no=res.ack_no, ack_date=res.ack_date,
        signed_qr=res.signed_qr, signed_invoice=res.signed_invoice,
    )


def generate_gcc_einvoice(invoice: Invoice):
    """Generate a GCC e-invoice (KSA ZATCA or UAE Peppol PINT AE) for a VAT invoice.

    Idempotent per invoice. Builds the UBL XML + invoice hash (chained to the
    previous invoice's hash), and — for ZATCA — the base64 TLV QR. Submission
    runs through the feature-flagged stub adapters until real creds are wired.
    """
    from .models import GccEInvoice

    if hasattr(invoice, "gcc_einvoice"):
        return invoice.gcc_einvoice

    company = invoice.company
    if company.tax_regime != Company.TaxRegime.GCC_VAT:
        raise ValidationError("E-invoicing applies only to GCC VAT companies.")

    scheme_code = (get_jurisdiction(company.country) or {}).get("einvoice_scheme")
    if scheme_code == EINVOICE_ZATCA:
        scheme = GccEInvoice.Scheme.ZATCA
    elif scheme_code == EINVOICE_PEPPOL_PINT_AE:
        scheme = GccEInvoice.Scheme.PEPPOL_PINT_AE
    else:
        raise ValidationError("This jurisdiction has no e-invoicing scheme yet.")

    doc_uuid = str(uuid4())
    prev = GccEInvoice.objects.filter(company=company).order_by("-id").first()
    previous_hash = prev.invoice_hash if prev else ""

    if scheme == GccEInvoice.Scheme.ZATCA:
        xml = build_zatca_xml(invoice, doc_uuid, previous_hash)
        invoice_hash = compute_hash(xml)
        qr = build_zatca_qr(
            seller_name=company.name, vat_number=company.tax_id or "",
            timestamp=datetime.now(timezone.utc).isoformat(),
            total=str(invoice.grand_total), vat_total=str(invoice.vat),
            invoice_hash=invoice_hash,
        )
        res = get_zatca_client().clear(xml=xml, invoice_hash=invoice_hash)
        status, cleared_at, response = res.status, res.cleared_at, res.response
    else:
        xml = build_pint_ae_xml(invoice, doc_uuid, previous_hash)
        invoice_hash = compute_hash(xml)
        qr = ""
        res = get_peppol_client().send(xml=xml)
        status, cleared_at, response = res.status, res.delivered_at, res.response

    return GccEInvoice.objects.create(
        company=company, invoice=invoice, scheme=scheme, uuid=doc_uuid,
        invoice_hash=invoice_hash, previous_hash=previous_hash,
        xml=xml, qr=qr, status=status, cleared_at=cleared_at, response=response,
    )


def generate_eway_bill(invoice: Invoice, *, distance_km: int, vehicle_no: str = "",
                       transporter_id: str = "", transporter_name: str = "") -> EWayBill:
    client = get_ewb_client()
    res = client.generate(
        distance_km=distance_km, vehicle_no=vehicle_no,
        invoice_no=invoice.invoice_no, total=str(invoice.grand_total),
    )
    return EWayBill.objects.create(
        company=invoice.company, invoice=invoice,
        eway_no=res.eway_no, generated_on=res.generated_on,
        valid_until=res.valid_until, distance_km=distance_km,
        vehicle_no=vehicle_no, transporter_id=transporter_id,
        transporter_name=transporter_name,
    )


# ---------- HSN Summary ----------

def hsn_summary(company_id: int, start: _date, end: _date) -> dict:
    """HSN-wise outward supplies summary (mandatory for GSTR-1)."""
    from apps.billing.models import InvoiceLine

    qs = InvoiceLine.objects.filter(
        invoice__company_id=company_id,
        invoice__status=Invoice.Status.POSTED,
        invoice__date__gte=start, invoice__date__lte=end,
    ).values("hsn_code", "tax_rate").annotate(
        qty=Sum("quantity"),
        taxable=Sum("taxable_amount"),
        cgst=Sum("cgst"), sgst=Sum("sgst"), igst=Sum("igst"),
    ).order_by("hsn_code")
    rows = [
        {
            "hsn": r["hsn_code"] or "—",
            "rate": str(r["tax_rate"]),
            "qty": str(r["qty"] or 0),
            "taxable": str(r["taxable"] or 0),
            "cgst": str(r["cgst"] or 0),
            "sgst": str(r["sgst"] or 0),
            "igst": str(r["igst"] or 0),
        }
        for r in qs
    ]
    return {"period": {"start": start.isoformat(), "end": end.isoformat()}, "rows": rows}


# ---------- GSTR-1 JSON ----------

def gstr1_json(company_id: int, period_mmyyyy: str) -> dict:
    """Build a simplified GSTR-1 payload (B2B + B2CS sections).

    Real GSTR-1 has 13+ sections; this is enough for a dev export to feed
    into an offline filing tool.
    """
    from apps.billing.models import Invoice as Inv
    # Period parsing
    month, year = int(period_mmyyyy[:2]), int(period_mmyyyy[2:])
    start = _date(year, month, 1)
    end = (_date(year + (month // 12), (month % 12) + 1, 1) - __import__("datetime").timedelta(days=1))

    qs = Inv.objects.filter(
        company_id=company_id, status=Inv.Status.POSTED,
        date__gte=start, date__lte=end,
    ).select_related("customer")

    b2b: dict[str, list] = defaultdict(list)
    b2cs: list = []

    for inv in qs:
        if inv.customer.gstin:
            b2b[inv.customer.gstin].append({
                "inum": inv.invoice_no,
                "idt": inv.date.strftime("%d-%m-%Y"),
                "val": str(inv.grand_total),
                "pos": inv.place_of_supply,
                "rchrg": "N",
                "inv_typ": "R",
                "itms": [{
                    "num": 1, "itm_det": {
                        "txval": str(inv.taxable_amount), "rt": str(inv.lines.first().tax_rate if inv.lines.exists() else 0),
                        "iamt": str(inv.igst), "camt": str(inv.cgst), "samt": str(inv.sgst),
                    }
                }]
            })
        else:
            b2cs.append({
                "sply_ty": "INTRA" if inv.cgst else "INTER",
                "rt": str(inv.lines.first().tax_rate if inv.lines.exists() else 0),
                "typ": "OE",
                "pos": inv.place_of_supply,
                "txval": str(inv.taxable_amount),
                "iamt": str(inv.igst), "camt": str(inv.cgst), "samt": str(inv.sgst),
            })

    return {
        "gstin": "company-gstin-here",
        "fp": period_mmyyyy,
        "version": "GST3.0.4",
        "hash": "hash-here",
        "b2b": [{"ctin": gstin, "inv": invs} for gstin, invs in b2b.items()],
        "b2cs": b2cs,
        "hsn": {"data": hsn_summary(company_id, start, end)["rows"]},
    }


# ---------- GSTR-3B JSON ----------

def gstr3b_json(company_id: int, period_mmyyyy: str) -> dict:
    from apps.billing.models import Invoice as Inv
    from apps.procurement.models import VendorBill

    month, year = int(period_mmyyyy[:2]), int(period_mmyyyy[2:])
    start = _date(year, month, 1)
    end = (_date(year + (month // 12), (month % 12) + 1, 1) - __import__("datetime").timedelta(days=1))

    out = Inv.objects.filter(
        company_id=company_id, status=Inv.Status.POSTED,
        date__gte=start, date__lte=end,
    ).aggregate(
        taxable=Sum("taxable_amount"),
        cgst=Sum("cgst"), sgst=Sum("sgst"), igst=Sum("igst"),
    )
    inp = VendorBill.objects.filter(
        company_id=company_id, status=VendorBill.Status.POSTED,
        date__gte=start, date__lte=end,
    ).aggregate(
        taxable=Sum("taxable_amount"),
        cgst=Sum("cgst"), sgst=Sum("sgst"), igst=Sum("igst"),
    )

    def s(v): return str(v or Decimal("0"))

    return {
        "gstin": "company-gstin-here",
        "ret_period": period_mmyyyy,
        "sup_details": {
            "osup_det": {
                "txval": s(out["taxable"]),
                "iamt": s(out["igst"]), "camt": s(out["cgst"]), "samt": s(out["sgst"]),
                "csamt": "0",
            },
        },
        "itc_elg": {
            "itc_avl": [{
                "ty": "OTH",
                "iamt": s(inp["igst"]), "camt": s(inp["cgst"]), "samt": s(inp["sgst"]),
                "csamt": "0",
            }],
        },
    }


# ---------- GSTR-2B reconciliation ----------

def reconcile_gstr2b(company_id: int) -> dict:
    """Auto-match GSTR2BLine rows against VendorBill on gstin + invoice_no + amount.
    Returns counts.
    """
    from apps.procurement.models import VendorBill
    matched = 0
    disputed = 0
    rows = GSTR2BLine.objects.filter(
        company_id=company_id, match_status=GSTR2BLine.MatchStatus.UNMATCHED,
    )
    for r in rows:
        candidate = VendorBill.objects.filter(
            company_id=company_id,
            vendor__gstin=r.supplier_gstin,
            bill_no=r.invoice_no,
        ).first()
        if not candidate:
            continue
        same_amount = abs(candidate.taxable_amount - r.taxable) < Decimal("1.00")
        r.matched_bill = candidate
        r.match_status = (
            GSTR2BLine.MatchStatus.MATCHED if same_amount else GSTR2BLine.MatchStatus.DISPUTED
        )
        r.save(update_fields=["matched_bill", "match_status", "updated_at"])
        matched += int(same_amount)
        disputed += int(not same_amount)
    return {"matched": matched, "disputed": disputed}
