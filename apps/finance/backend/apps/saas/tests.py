from types import SimpleNamespace

from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase

from .middleware import ProductEntitlementMiddleware
from .models import ProductCode, Subscription, SubscriptionEntitlement


class ProductEntitlementMiddlewareTest(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def _run_middleware(self, subscription):
        request = self.factory.get("/api/v1/billing/invoices/")
        request.tenant = SimpleNamespace(schema_name="acme", subscription=subscription)
        middleware = ProductEntitlementMiddleware(lambda req: HttpResponse("ok"))
        return middleware(request)

    def _subscription_with_entitlement(self, status):
        subscription = Subscription(status=Subscription.Status.ACTIVE)
        entitlement = SubscriptionEntitlement(
            subscription=subscription,
            product=ProductCode.FIN,
            status=status,
        )
        subscription._prefetched_objects_cache = {"entitlements": [entitlement]}
        return subscription

    def test_allows_active_fin_entitlement(self):
        response = self._run_middleware(
            self._subscription_with_entitlement(SubscriptionEntitlement.Status.ACTIVE)
        )
        self.assertEqual(response.status_code, 200)

    def test_blocks_inactive_fin_entitlement(self):
        response = self._run_middleware(
            self._subscription_with_entitlement(SubscriptionEntitlement.Status.CANCELLED)
        )
        self.assertEqual(response.status_code, 403)