from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import AdminCompaniesView, AdminStatsView
from .billing import ConfirmPaymentView, CreateOrderView, DevActivateView, WebhookView
from .internal_billing import billing_snapshot, invoice_detail
from .internal_payroll import payroll_journal
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
    # Super-admin platform management (web SPA /superadmin).
    path("admin/companies/", AdminCompaniesView.as_view(), name="admin_companies"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin_stats"),
    # Server-to-server billing for embedded HR (Bearer SSO_SHARED_SECRET).
    path("internal/billing-snapshot/", billing_snapshot, name="internal_billing_snapshot"),
    path("internal/invoices/<int:invoice_id>/", invoice_detail, name="internal_invoice_detail"),
    path("internal/payroll-journal/", payroll_journal, name="internal_payroll_journal"),
] + router.urls
