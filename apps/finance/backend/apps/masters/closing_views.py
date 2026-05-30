"""Books closing endpoints — lock periods, export full company data."""
import csv
import io
import zipfile
from datetime import date as _date

from django.http import HttpResponse
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Company


class BooksClosingView(APIView):
    """POST /api/v1/masters/companies/<id>/close-books/  { until: 'YYYY-MM-DD' }"""

    def post(self, request, company_id):
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            raise ValidationError("Company not found.")
        until = request.data.get("until")
        if not until:
            raise ValidationError({"until": "required"})
        d = _date.fromisoformat(until)
        if company.books_closed_until and company.books_closed_until > d:
            raise ValidationError(
                f"Cannot move closing date backward (current: {company.books_closed_until})"
            )
        company.books_closed_until = d
        company.save(update_fields=["books_closed_until", "updated_at"])
        return Response({"books_closed_until": company.books_closed_until.isoformat()})


class CompanyExportView(APIView):
    """GET /api/v1/masters/companies/<id>/export/  → ZIP of CSV dumps of all core tables."""

    def get(self, request, company_id):
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            raise ValidationError("Company not found.")

        from apps.masters.models import Account, Party
        from apps.billing.models import Invoice
        from apps.payments.models import Receipt
        from apps.procurement.models import VendorBill, VendorPayment

        sets = {
            "accounts.csv":   (Account.objects.filter(company=company), ["code", "name", "type", "is_postable"]),
            "parties.csv":    (Party.objects.filter(company=company), ["name", "kind", "gstin", "email", "phone", "state_code"]),
            "invoices.csv":   (Invoice.objects.filter(company=company), ["invoice_no", "date", "customer_id", "grand_total", "amount_paid", "status"]),
            "receipts.csv":   (Receipt.objects.filter(company=company), ["receipt_no", "date", "customer_id", "amount", "mode"]),
            "bills.csv":      (VendorBill.objects.filter(company=company), ["bill_no", "date", "vendor_id", "grand_total", "amount_paid", "status"]),
            "vpayments.csv":  (VendorPayment.objects.filter(company=company), ["payment_no", "date", "vendor_id", "amount", "mode"]),
        }

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for name, (qs, cols) in sets.items():
                sio = io.StringIO()
                w = csv.writer(sio)
                w.writerow(cols)
                for obj in qs:
                    w.writerow([getattr(obj, c, "") for c in cols])
                zf.writestr(name, sio.getvalue())
        buf.seek(0)
        resp = HttpResponse(buf.read(), content_type="application/zip")
        resp["Content-Disposition"] = f'attachment; filename="{company.name}_export.zip"'
        return resp
