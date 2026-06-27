"""Document number suggestion.

The next number for a series is derived from the highest existing document of that
type for the company, so it stays correct with no stored counter to drift and no
changes to the document create flows. Callers use it to *prefill* the number field;
the document's own ``unique_together(company, <no>)`` remains the source of truth.
"""
import re

from django.apps import apps as django_apps

from .models import NumberSeries

# doc_type -> ("app_label.Model", number_field)
DOC_MAP = {
    "invoice": ("billing.Invoice", "invoice_no"),
    "credit_note": ("billing.CreditNote", "note_no"),
    "quotation": ("billing.Quotation", "quote_no"),
    "sales_order": ("billing.SalesOrder", "so_no"),
    "purchase_order": ("procurement.PurchaseOrder", "po_no"),
    "vendor_bill": ("procurement.VendorBill", "bill_no"),
    "receipt": ("payments.Receipt", "receipt_no"),
    "vendor_payment": ("procurement.VendorPayment", "payment_no"),
    "client_document": ("billing.ClientDocument", "doc_no"),
}

# Sensible default prefixes when a company hasn't customised its series yet.
DEFAULT_PREFIX = {
    "invoice": "INV-",
    "credit_note": "CN-",
    "quotation": "QT-",
    "sales_order": "SO-",
    "purchase_order": "PO-",
    "vendor_bill": "BILL-",
    "receipt": "RCPT-",
    "vendor_payment": "PAY-",
    "client_document": "CTR-",
}

_TRAILING_DIGITS = re.compile(r"(\d+)(?!.*\d)")  # last run of digits in the string


def _last_number_for(company, doc_type: str, prefix: str):
    """Return the highest trailing integer among existing documents, or None."""
    spec = DOC_MAP.get(doc_type)
    if not spec:
        return None
    try:
        Model = django_apps.get_model(spec[0])
    except LookupError:
        return None
    field = spec[1]
    qs = Model.objects.filter(company=company)
    if prefix:
        qs = qs.filter(**{f"{field}__startswith": prefix})
    # Most documents are created in order, so the latest by id is the highest
    # number in practice; fall back to scanning a small recent window for safety.
    best = None
    for value in qs.order_by("-id").values_list(field, flat=True)[:200]:
        m = _TRAILING_DIGITS.search(value or "")
        if m:
            n = int(m.group(1))
            if best is None or n > best:
                best = n
    return best


def get_or_default_series(company, doc_type: str) -> NumberSeries:
    """Return the company's series for doc_type, creating a default if absent."""
    series, _ = NumberSeries.objects.get_or_create(
        company=company,
        doc_type=doc_type,
        defaults={"prefix": DEFAULT_PREFIX.get(doc_type, ""), "padding": 4, "start_number": 1},
    )
    return series


def peek_next(company, doc_type: str) -> str:
    """Suggest the next document number for company + doc_type (no side effects on docs)."""
    series = get_or_default_series(company, doc_type)
    last = _last_number_for(company, doc_type, series.prefix)
    n = series.start_number if last is None else last + 1
    if last is not None and n < series.start_number:
        n = series.start_number
    return series.format(n)


def ensure_defaults(company) -> int:
    """Seed default series rows for every doc type (used at setup). Returns count created."""
    created = 0
    for doc_type in DOC_MAP:
        _, was_created = NumberSeries.objects.get_or_create(
            company=company,
            doc_type=doc_type,
            defaults={"prefix": DEFAULT_PREFIX.get(doc_type, ""), "padding": 4, "start_number": 1},
        )
        created += int(was_created)
    return created
