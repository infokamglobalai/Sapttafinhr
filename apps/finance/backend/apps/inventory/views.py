from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.masters.models import Company, Item

from .models import Batch, Bin, SerialNumber, StockLevel, StockMovement, Warehouse
from .serializers import (
    BatchSer, BinSer, MovementInput, MovementSer, SerialSer, StockLevelSer, WarehouseSer,
)
from . import services


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSer
    filterset_fields = ("company", "is_active")


class BinViewSet(viewsets.ModelViewSet):
    queryset = Bin.objects.all()
    serializer_class = BinSer
    filterset_fields = ("warehouse",)


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.select_related("item").all()
    serializer_class = BatchSer
    filterset_fields = ("company", "item")
    search_fields = ("batch_no",)


class SerialViewSet(viewsets.ModelViewSet):
    queryset = SerialNumber.objects.select_related("item", "warehouse").all()
    serializer_class = SerialSer
    filterset_fields = ("company", "item", "warehouse", "status")
    search_fields = ("serial_no",)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.select_related("item", "warehouse", "batch").all()
    serializer_class = MovementSer
    filterset_fields = ("company", "item", "warehouse", "kind")


class RecordMovementView(APIView):
    def post(self, request):
        s = MovementInput(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        try:
            mv = services.record_movement(
                company=Company.objects.get(pk=d["company"]),
                date=d["date"], item=d["item"], warehouse=d["warehouse"],
                kind=d["kind"], quantity=d["quantity"],
                unit_cost=d.get("unit_cost", 0),
                reference=d.get("reference", ""),
            )
        except Exception as e:
            raise ValidationError(str(e))
        return Response(MovementSer(mv).data, status=status.HTTP_201_CREATED)


class TransferStockView(APIView):
    def post(self, request):
        try:
            out_mv, in_mv = services.transfer_stock(
                company=Company.objects.get(pk=int(request.data["company"])),
                date=request.data["date"],
                item=Item.objects.get(pk=int(request.data["item"])),
                from_warehouse=Warehouse.objects.get(pk=int(request.data["from_warehouse"])),
                to_warehouse=Warehouse.objects.get(pk=int(request.data["to_warehouse"])),
                quantity=request.data["quantity"],
                reference=request.data.get("reference", ""),
            )
        except Exception as e:
            raise ValidationError(str(e))
        return Response({
            "out": MovementSer(out_mv).data, "in": MovementSer(in_mv).data,
        }, status=status.HTTP_201_CREATED)


class StockLevelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockLevel.objects.select_related("item", "warehouse").all()
    serializer_class = StockLevelSer
    filterset_fields = ("item", "warehouse")


class StockSummaryView(APIView):
    def get(self, request):
        cid = request.query_params.get("company")
        if not cid:
            raise ValidationError({"company": "required"})
        wh = request.query_params.get("warehouse")
        return Response(services.stock_summary(int(cid), int(wh) if wh else None))


class ItemByBarcodeView(APIView):
    """GET /api/v1/inventory/barcode/?code=<sku>  — used by HID scanners."""
    def get(self, request):
        code = request.query_params.get("code")
        if not code:
            raise ValidationError({"code": "required"})
        item = Item.objects.filter(sku__iexact=code).first()
        if not item:
            return Response({"detail": "not found"}, status=404)
        return Response({
            "id": item.id, "sku": item.sku, "name": item.name,
            "sale_price": str(item.sale_price), "tax_rate": str(item.tax_rate),
        })
