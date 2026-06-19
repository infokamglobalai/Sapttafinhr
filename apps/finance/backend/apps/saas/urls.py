from django.urls import path
from rest_framework.routers import DefaultRouter

from .billing import ConfirmPaymentView, CreateOrderView, DevActivateView, WebhookView
from .signup_views import SignupView
from .views import PlanViewSet, SaasInvoiceViewSet, SubscriptionEntitlementViewSet, SubscriptionViewSet

router = DefaultRouter()
router.register("plans", PlanViewSet)
router.register("subscriptions", SubscriptionViewSet, basename="subscription")
router.register("entitlements", SubscriptionEntitlementViewSet)
router.register("invoices", SaasInvoiceViewSet)

urlpatterns = [
    path("signup/", SignupView.as_view(), name="saas_signup"),
    path("billing/order/", CreateOrderView.as_view(), name="billing_order"),
    path("billing/confirm/", ConfirmPaymentView.as_view(), name="billing_confirm"),
    path("billing/webhook/", WebhookView.as_view(), name="billing_webhook"),
    path("dev/activate/", DevActivateView.as_view(), name="dev_activate"),
] + router.urls
