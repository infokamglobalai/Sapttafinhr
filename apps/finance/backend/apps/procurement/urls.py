from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    GRNCreateView,
    GRNViewSet,
    POCreateView,
    POViewSet,
    VendorBillCreateView,
    VendorBillViewSet,
    VendorPaymentCreateView,
    VendorPaymentViewSet,
)

router = DefaultRouter()
router.register("purchase-orders", POViewSet)
router.register("grns", GRNViewSet)
router.register("vendor-bills", VendorBillViewSet)
router.register("vendor-payments", VendorPaymentViewSet)

from .ai_views import VendorBillScanView

urlpatterns = [
    path("purchase-orders/create/", POCreateView.as_view()),
    path("grns/create/", GRNCreateView.as_view()),
    path("vendor-bills/create/", VendorBillCreateView.as_view()),
    path("vendor-bills/scan/", VendorBillScanView.as_view(), name="vendor-bill-scan"),
    path("vendor-payments/create/", VendorPaymentCreateView.as_view()),
] + router.urls
