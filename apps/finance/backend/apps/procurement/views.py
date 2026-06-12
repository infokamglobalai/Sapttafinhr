from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import GRN, PurchaseOrder, VendorBill, VendorPayment
from .serializers import (
    GRNCreateSerializer,
    GRNReadSerializer,
    POCreateSerializer,
    POReadSerializer,
    VBillCreateSerializer,
    VBillReadSerializer,
    VPaymentCreateSerializer,
    VPaymentReadSerializer,
)


class POViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PurchaseOrder.objects.select_related("vendor").prefetch_related("lines").all()
    serializer_class = POReadSerializer
    filterset_fields = ("company", "vendor", "status")
    search_fields = ("po_no", "vendor__name")
    ordering = ("-date", "-id")


class POCreateView(APIView):
    def post(self, request):
        s = POCreateSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        return Response(POReadSerializer(s.save()).data, status=status.HTTP_201_CREATED)


class GRNViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GRN.objects.select_related("purchase_order", "purchase_order__vendor").prefetch_related("lines").all()
    serializer_class = GRNReadSerializer
    filterset_fields = ("company", "purchase_order", "status")
    search_fields = ("grn_no",)
    ordering = ("-date", "-id")


class GRNCreateView(APIView):
    def post(self, request):
        s = GRNCreateSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        return Response(GRNReadSerializer(s.save()).data, status=status.HTTP_201_CREATED)


class VendorBillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VendorBill.objects.select_related("vendor").prefetch_related("lines").all()
    serializer_class = VBillReadSerializer
    filterset_fields = ("company", "vendor", "status")
    search_fields = ("bill_no", "vendor__name")
    ordering = ("-date", "-id")


class VendorBillCreateView(APIView):
    def post(self, request):
        s = VBillCreateSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        return Response(VBillReadSerializer(s.save()).data, status=status.HTTP_201_CREATED)


class VendorPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VendorPayment.objects.select_related("vendor", "paid_from_account").prefetch_related("allocations").all()
    serializer_class = VPaymentReadSerializer
    filterset_fields = ("company", "vendor", "status")
    search_fields = ("payment_no", "vendor__name", "reference")
    ordering = ("-date", "-id")


class VendorPaymentCreateView(APIView):
    def post(self, request):
        s = VPaymentCreateSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        return Response(VPaymentReadSerializer(s.save()).data, status=status.HTTP_201_CREATED)
