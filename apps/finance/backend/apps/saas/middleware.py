from django.http import JsonResponse
from django_tenants.utils import get_public_schema_name

from .models import ProductCode


class ProductEntitlementMiddleware:
    """Blocks tenant-schema FIN access unless the subscription includes FIN."""

    EXEMPT_PREFIXES = ("/static/", "/media/")

    FIN_PREFIXES = (
        "/api/v1/masters/",
        "/api/v1/ledger/",
        "/api/v1/billing/",
        "/api/v1/payments/",
        "/api/v1/reports/",
        "/api/v1/procurement/",
        "/api/v1/taxation/",
        "/api/v1/banking/",
        "/api/v1/inventory/",
        "/api/v1/assets/",
        "/api/v1/expenses/",
        "/api/v1/portal/",
        "/api/v1/public/",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant and not self._is_public_schema(tenant) and not self._is_exempt(request.path):
            if any(request.path.startswith(prefix) for prefix in self.FIN_PREFIXES):
                subscription = getattr(tenant, "subscription", None)
                if not subscription or not subscription.allows_product(ProductCode.FIN):
                    return JsonResponse(
                        {
                            "detail": "This organization does not have an active FIN subscription.",
                            "product": ProductCode.FIN,
                        },
                        status=403,
                    )

        return self.get_response(request)

    def _is_public_schema(self, tenant) -> bool:
        return getattr(tenant, "schema_name", None) == get_public_schema_name()

    def _is_exempt(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES)