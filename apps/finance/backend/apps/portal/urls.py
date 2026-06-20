from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    PortalAccessViewSet,
    PortalInvoicesView,
    RazorpayCreateOrderView,
    RazorpayVerifySignatureView,
)

router = DefaultRouter()
router.register("access", PortalAccessViewSet)

urlpatterns = [
    path("invoices/", PortalInvoicesView.as_view()),
    path("razorpay/create-order/", RazorpayCreateOrderView.as_view()),
    path("razorpay/verify-signature/", RazorpayVerifySignatureView.as_view()),
] + router.urls
