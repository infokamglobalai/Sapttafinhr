from datetime import date as _date

from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import Invoice

from .models import EInvoiceIRN, EWayBill, GSTR2BLine
from . import services


class GenerateEInvoiceView(APIView):
    """POST /api/v1/taxation/einvoice/<invoice_id>/"""
    def post(self, request, invoice_id):
        invoice = Invoice.objects.get(pk=invoice_id)
        rec = services.generate_einvoice(invoice)
        return Response({
            "irn": rec.irn, "ack_no": rec.ack_no,
            "ack_date": rec.ack_date, "signed_qr": rec.signed_qr,
            "status": rec.status,
        }, status=status.HTTP_201_CREATED)


class GenerateEWBView(APIView):
    """POST /api/v1/taxation/eway/<invoice_id>/"""
    def post(self, request, invoice_id):
        invoice = Invoice.objects.get(pk=invoice_id)
        rec = services.generate_eway_bill(
            invoice,
            distance_km=int(request.data.get("distance_km", 100)),
            vehicle_no=request.data.get("vehicle_no", ""),
            transporter_id=request.data.get("transporter_id", ""),
            transporter_name=request.data.get("transporter_name", ""),
        )
        return Response({
            "eway_no": rec.eway_no, "generated_on": rec.generated_on,
            "valid_until": rec.valid_until, "vehicle_no": rec.vehicle_no,
        }, status=status.HTTP_201_CREATED)


class HSNSummaryView(APIView):
    def get(self, request):
        cid = request.query_params.get("company")
        if not cid:
            raise ValidationError({"company": "required"})
        today = _date.today()
        start = _date.fromisoformat(request.query_params.get("start", today.replace(day=1).isoformat()))
        end = _date.fromisoformat(request.query_params.get("end", today.isoformat()))
        return Response(services.hsn_summary(int(cid), start, end))


class GSTR1ExportView(APIView):
    def get(self, request):
        cid = request.query_params.get("company")
        period = request.query_params.get("period")  # MMYYYY
        if not cid or not period:
            raise ValidationError({"detail": "company and period (MMYYYY) required"})
        return Response(services.gstr1_json(int(cid), period))


class GSTR3BExportView(APIView):
    def get(self, request):
        cid = request.query_params.get("company")
        period = request.query_params.get("period")
        if not cid or not period:
            raise ValidationError({"detail": "company and period (MMYYYY) required"})
        return Response(services.gstr3b_json(int(cid), period))


class GSTR2BReconcileView(APIView):
    def post(self, request):
        cid = request.data.get("company")
        if not cid:
            raise ValidationError({"company": "required"})
        return Response(services.reconcile_gstr2b(int(cid)))
