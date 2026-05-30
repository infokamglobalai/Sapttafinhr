from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ReceiptCreateView, ReceiptViewSet

router = DefaultRouter()
router.register("receipts", ReceiptViewSet)

urlpatterns = [
    path("receipts/create/", ReceiptCreateView.as_view(), name="receipt-create"),
] + router.urls
