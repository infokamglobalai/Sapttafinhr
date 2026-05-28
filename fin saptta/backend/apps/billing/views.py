from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreditNote, Invoice, Quotation, RecurringInvoiceTemplate, SalesOrder
from .quote_so import QuotationService, SalesOrderService
from .serializers import (
    CreditNoteCreateSerializer,
    CreditNoteReadSerializer,
    InvoiceCreateSerializer,
    InvoiceReadSerializer,
    QuotationCreateSerializer,
    QuotationReadSerializer,
    RecurringInvoiceSerializer,
    SOCreateSerializer,
    SalesOrderReadSerializer,
)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.select_related("customer", "fiscal_year").prefetch_related("lines").all()
    serializer_class = InvoiceReadSerializer
    filterset_fields = ("company", "customer", "status", "fiscal_year")
    search_fields = ("invoice_no", "customer__name", "notes")
    ordering_fields = ("date", "invoice_no", "grand_total")
    ordering = ("-date", "-id")


class InvoiceCreateView(APIView):
    def post(self, request):
        serializer = InvoiceCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        return Response(InvoiceReadSerializer(invoice).data, status=status.HTTP_201_CREATED)


class CreditNoteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CreditNote.objects.select_related("invoice", "invoice__customer").all()
    serializer_class = CreditNoteReadSerializer
    filterset_fields = ("company", "invoice", "status")
    search_fields = ("note_no", "reason")
    ordering = ("-date", "-id")


class CreditNoteCreateView(APIView):
    def post(self, request):
        serializer = CreditNoteCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        cn = serializer.save()
        return Response(CreditNoteReadSerializer(cn).data, status=status.HTTP_201_CREATED)


class QuotationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Quotation.objects.select_related("customer").prefetch_related("lines").all()
    serializer_class = QuotationReadSerializer
    filterset_fields = ("company", "customer", "status")
    search_fields = ("quote_no",)
    ordering = ("-date", "-id")

    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        quote = self.get_object()
        so_no = request.data.get("so_no") or f"SO-{quote.quote_no}"
        pos = request.data.get("place_of_supply") or quote.customer.state_code or ""
        so = QuotationService().convert_to_so(quote, so_no=so_no, place_of_supply=pos)
        return Response(SalesOrderReadSerializer(so).data)


class QuotationCreateView(APIView):
    def post(self, request):
        s = QuotationCreateSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        return Response(QuotationReadSerializer(s.save()).data, status=status.HTTP_201_CREATED)


class SalesOrderViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SalesOrder.objects.select_related("customer").prefetch_related("lines").all()
    serializer_class = SalesOrderReadSerializer
    filterset_fields = ("company", "customer", "status")
    search_fields = ("so_no",)
    ordering = ("-date", "-id")

    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        so = self.get_object()
        invoice_no = request.data.get("invoice_no")
        fy_id = request.data.get("fiscal_year")
        date = request.data.get("date")
        due_date = request.data.get("due_date")
        if not all([invoice_no, fy_id, date]):
            return Response({"detail": "invoice_no, fiscal_year, date required"}, status=400)
        inv = SalesOrderService().convert_to_invoice(
            so, invoice_no=invoice_no, fiscal_year_id=int(fy_id),
            date=date, due_date=due_date, user=request.user,
        )
        return Response(InvoiceReadSerializer(inv).data, status=status.HTTP_201_CREATED)


class SalesOrderCreateView(APIView):
    def post(self, request):
        s = SOCreateSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        return Response(SalesOrderReadSerializer(s.save()).data, status=status.HTTP_201_CREATED)


class RecurringInvoiceViewSet(viewsets.ModelViewSet):
    queryset = RecurringInvoiceTemplate.objects.all()
    serializer_class = RecurringInvoiceSerializer
    filterset_fields = ("company", "customer", "is_active", "frequency")
