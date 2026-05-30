from rest_framework.routers import DefaultRouter

from .views import PlanViewSet, SaasInvoiceViewSet, SubscriptionEntitlementViewSet, SubscriptionViewSet

router = DefaultRouter()
router.register("plans", PlanViewSet)
router.register("subscriptions", SubscriptionViewSet)
router.register("entitlements", SubscriptionEntitlementViewSet)
router.register("invoices", SaasInvoiceViewSet)

urlpatterns = router.urls
