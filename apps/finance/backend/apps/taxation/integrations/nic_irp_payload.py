"""Build NIC IRP v1.1 JSON payload from a posted sales invoice."""
from __future__ import annotations

from decimal import Decimal


def build_irn_payload(*, company, invoice, lines) -> dict:
    """Minimal NIC e-invoice JSON (simplified for GSP proxy)."""
    seller = {
        "Gstin": company.gstin or "",
        "LglNm": company.legal_name or company.name,
        "Addr1": getattr(company, "address_line1", "") or "",
        "Loc": getattr(company, "city", "") or "",
        "Pin": int(getattr(company, "pincode", 0) or 0),
        "Stcd": company.state_code or "",
    }
    buyer = invoice.customer
    buyer_block = {
        "Gstin": buyer.gstin or "URP",
        "LglNm": buyer.name,
        "Pos": invoice.place_of_supply or buyer.state_code or "",
        "Stcd": buyer.state_code or invoice.place_of_supply or "",
    }
    item_list = []
    for i, line in enumerate(lines, start=1):
        item_list.append({
            "SlNo": str(i),
            "PrdDesc": line.description,
            "HsnCd": line.hsn_code or "",
            "Qty": float(line.quantity),
            "Unit": "NOS",
            "UnitPrice": float(line.unit_price),
            "TotAmt": float(line.taxable_amount),
            "GstRt": float(line.tax_rate),
            "IgstAmt": float(line.igst),
            "CgstAmt": float(line.cgst),
            "SgstAmt": float(line.sgst),
            "TotItemVal": float(line.line_total),
        })
    val = {
        "AssVal": float(invoice.taxable_amount),
        "CgstVal": float(invoice.cgst),
        "SgstVal": float(invoice.sgst),
        "IgstVal": float(invoice.igst),
        "TotInvVal": float(invoice.grand_total),
    }
    return {
        "Version": "1.1",
        "TranDtls": {"TaxSch": "GST", "SupTyp": "B2B", "RegRev": "N"},
        "DocDtls": {"Typ": "INV", "No": invoice.invoice_no, "Dt": invoice.date.strftime("%d/%m/%Y")},
        "SellerDtls": seller,
        "BuyerDtls": buyer_block,
        "ItemList": item_list,
        "ValDtls": val,
    }


def payload_from_invoice(invoice) -> dict:
    company = invoice.company
    lines = list(invoice.lines.all())
    return build_irn_payload(company=company, invoice=invoice, lines=lines)
