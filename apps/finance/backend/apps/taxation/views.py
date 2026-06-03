from datetime import date as _date

from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import Invoice

from rest_framework import serializers
from .models import EInvoiceIRN, EWayBill, GSTR2BLine, TDSDeduction, TDS_DEFAULT_RATES
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


# ── TDS ─────────────────────────────────────────────────────────────────────

class TDSDeductionSerializer(serializers.ModelSerializer):
    vendor_bill_no = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()

    class Meta:
        model = TDSDeduction
        fields = [
            "id", "vendor_bill", "vendor_bill_no", "vendor_name",
            "section", "rate", "base_amount", "tds_amount",
            "deduction_date", "pan", "fy", "quarter",
            "challan_no", "deposited_date", "is_deposited", "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "vendor_bill_no", "vendor_name"]

    def get_vendor_bill_no(self, obj):
        return obj.vendor_bill.bill_no if obj.vendor_bill else None

    def get_vendor_name(self, obj):
        return obj.vendor_bill.vendor.name if obj.vendor_bill else None


class TDSViewSet(viewsets.ModelViewSet):
    serializer_class = TDSDeductionSerializer
    filterset_fields = ["section", "quarter", "fy", "is_deposited"]

    def get_queryset(self):
        qs = TDSDeduction.objects.select_related("vendor_bill", "vendor_bill__vendor")
        cid = self.request.query_params.get("company")
        if cid:
            qs = qs.filter(company_id=cid)
        return qs

    def perform_create(self, serializer):
        from apps.masters.models import Company
        company_id = self.request.data.get("company")
        serializer.save(company_id=company_id)


class TDSSectionsView(APIView):
    """Return TDS sections list with default rates."""
    def get(self, request):
        from .models import TDS_SECTIONS
        return Response([
            {"code": code, "label": label, "default_rate": TDS_DEFAULT_RATES.get(code, "0")}
            for code, label in TDS_SECTIONS
        ])


class TDSSummaryView(APIView):
    """TDS liability summary by section and quarter."""
    def get(self, request):
        cid = request.query_params.get("company")
        fy = request.query_params.get("fy")
        if not cid:
            raise ValidationError({"company": "required"})
        qs = TDSDeduction.objects.filter(company_id=cid)
        if fy:
            qs = qs.filter(fy=fy)
        from django.db.models import Sum
        summary = qs.values("section", "quarter").annotate(
            total_base=Sum("base_amount"),
            total_tds=Sum("tds_amount"),
            total_deposited=Sum("tds_amount", filter=__import__("django.db.models", fromlist=["Q"]).Q(is_deposited=True)),
        ).order_by("quarter", "section")
        total = qs.aggregate(t=Sum("tds_amount"))
        deposited = qs.filter(is_deposited=True).aggregate(t=Sum("tds_amount"))
        return Response({
            "by_section_quarter": list(summary),
            "total_deducted": str(total["t"] or 0),
            "total_deposited": str(deposited["t"] or 0),
            "total_pending": str((total["t"] or 0) - (deposited["t"] or 0)),
        })
