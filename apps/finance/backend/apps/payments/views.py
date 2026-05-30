from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Receipt
from .serializers import ReceiptCreateSerializer, ReceiptReadSerializer


class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Receipt.objects.select_related("customer", "deposit_account").prefetch_related("allocations").all()
    serializer_class = ReceiptReadSerializer
    filterset_fields = ("company", "customer", "status", "fiscal_year")
    search_fields = ("receipt_no", "customer__name", "reference")
    ordering = ("-date", "-id")


class ReceiptCreateView(APIView):
    def post(self, request):
        serializer = ReceiptCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        receipt = serializer.save()
        return Response(ReceiptReadSerializer(receipt).data, status=status.HTTP_201_CREATED)
