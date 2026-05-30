from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BatchViewSet, BinViewSet, ItemByBarcodeView, RecordMovementView, SerialViewSet,
    StockLevelViewSet, StockMovementViewSet, StockSummaryView, TransferStockView, WarehouseViewSet,
)

router = DefaultRouter()
router.register("warehouses", WarehouseViewSet)
router.register("bins", BinViewSet)
router.register("batches", BatchViewSet)
router.register("serials", SerialViewSet)
router.register("movements", StockMovementViewSet)
router.register("stock-levels", StockLevelViewSet)

urlpatterns = [
    path("movements/record/", RecordMovementView.as_view()),
    path("movements/transfer/", TransferStockView.as_view()),
    path("stock-summary/", StockSummaryView.as_view()),
    path("barcode/", ItemByBarcodeView.as_view()),
] + router.urls
