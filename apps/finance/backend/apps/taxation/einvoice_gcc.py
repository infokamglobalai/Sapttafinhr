"""GCC e-invoice document builders.

Produces simplified-but-well-formed UBL 2.1 XML for KSA ZATCA and UAE Peppol
PINT AE, plus the ZATCA base64 TLV QR payload.

Scope note: real ZATCA clearance also embeds an ECDSA cryptographic stamp signed
by the CSID certificate (QR tags 7-9 and a UBL ds:Signature). Those are omitted
until certificates are configured — the structure here is the extension point.
"""
import base64
import hashlib
from xml.sax.saxutils import escape


def compute_hash(xml: str) -> str:
    """SHA-256 hex digest of the canonical invoice XML."""
    return hashlib.sha256(xml.encode("utf-8")).hexdigest()


def _tlv(tag: int, value: str) -> bytes:
    v = (value or "").encode("utf-8")
    return bytes([tag, len(v)]) + v


def build_zatca_qr(*, seller_name: str, vat_number: str, timestamp: str,
                   total: str, vat_total: str, invoice_hash: str) -> str:
    """ZATCA TLV QR (base64). Tags 1-6; signature tags 7-9 require a CSID."""
    payload = (
        _tlv(1, seller_name)
        + _tlv(2, vat_number)
        + _tlv(3, timestamp)
        + _tlv(4, total)
        + _tlv(5, vat_total)
        + _tlv(6, base64.b64encode(invoice_hash.encode()).decode())
    )
    return base64.b64encode(payload).decode()


def _line_xml(idx: int, line, currency: str) -> str:
    return f"""  <cac:InvoiceLine>
    <cbc:ID>{idx}</cbc:ID>
    <cbc:InvoicedQuantity>{line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="{currency}">{line.taxable_amount}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="{currency}">{line.vat}</cbc:TaxAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>{escape(line.description)}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="{currency}">{line.unit_price}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>"""


def _build_ubl(invoice, doc_uuid: str, previous_hash: str, *,
               profile_id: str, customization_id: str, type_code: str) -> str:
    company = invoice.company
    customer = invoice.customer
    currency = company.base_currency or "AED"
    lines = list(invoice.lines.all())
    lines_xml = "\n".join(_line_xml(i + 1, l, currency) for i, l in enumerate(lines))
    customization = (
        f"  <cbc:CustomizationID>{customization_id}</cbc:CustomizationID>\n"
        if customization_id else ""
    )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
{customization}  <cbc:ProfileID>{profile_id}</cbc:ProfileID>
  <cbc:ID>{escape(invoice.invoice_no)}</cbc:ID>
  <cbc:UUID>{doc_uuid}</cbc:UUID>
  <cbc:IssueDate>{invoice.date.isoformat()}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>{type_code}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>{currency}</cbc:DocumentCurrencyCode>
  <cbc:PreviousInvoiceHash>{previous_hash}</cbc:PreviousInvoiceHash>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>{escape(company.name)}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>{escape(company.tax_id or "")}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>{escape(customer.name)}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>{escape(customer.gstin or "")}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="{currency}">{invoice.vat}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="{currency}">{invoice.taxable_amount}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="{currency}">{invoice.taxable_amount}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="{currency}">{invoice.grand_total}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="{currency}">{invoice.grand_total}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
{lines_xml}
</Invoice>"""


def build_zatca_xml(invoice, doc_uuid: str, previous_hash: str = "") -> str:
    """KSA ZATCA Fatoora UBL (simplified)."""
    return _build_ubl(
        invoice, doc_uuid, previous_hash,
        profile_id="reporting:1.0", customization_id="", type_code="388",
    )


def build_pint_ae_xml(invoice, doc_uuid: str, previous_hash: str = "") -> str:
    """UAE Peppol PINT AE UBL (simplified)."""
    return _build_ubl(
        invoice, doc_uuid, previous_hash,
        profile_id="urn:peppol:bis:billing",
        customization_id="urn:peppol:pint:billing-1@ae-1",
        type_code="380",
    )
