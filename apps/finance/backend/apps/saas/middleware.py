from django.core.cache import cache
from django.http import JsonResponse
from django_tenants.utils import get_public_schema_name

from .models import ProductCode


class ProductEntitlementMiddleware:
    """Blocks tenant-schema FIN access unless the subscription includes FIN."""

    EXEMPT_PREFIXES = ("/static/", "/media/")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant and not self._is_public_schema(tenant) and not self._is_exempt(request.path):
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


def mark_setup_complete(schema_name: str) -> None:
    """Flip the cached setup flag for a schema the instant setup finishes,
    so the very next API request is allowed through without a DB round-trip."""
    cache.set(f"{SetupRequiredMiddleware.CACHE_PREFIX}{schema_name}", True, SetupRequiredMiddleware.CACHE_TTL)


class SetupRequiredMiddleware:
    """Server-side enforcement of forced first-run setup for a tenant.

    The React app shows a setup wizard until the workspace's company is
    ``setup_complete``, but that gate is client-side and could be bypassed
    (a failed status check, a direct API call, a stale bundle). This blocks the
    product API for a tenant schema until setup is finished, so a workspace
    genuinely cannot read or create business data before completing setup —
    matching the server-side gate the HR product already enforces.

    Only the endpoints the wizard itself needs (auth, entitlements, and the
    company / fiscal-year / accounts / bank masters it writes) stay open.
    """

    # Path prefixes that must keep working while setup is incomplete.
    EXEMPT_API_PREFIXES = (
        "/api/v1/auth/",
        "/api/v1/saas/",
        "/api/v1/masters/setup/",
        "/api/v1/masters/companies",
        "/api/v1/masters/fiscal-years",
        "/api/v1/masters/accounts",
        "/api/v1/masters/jurisdictions",
        "/api/v1/masters/branches",
        "/api/v1/banking/bank-accounts",
        "/api/v1/banking/ifsc",
    )
    CACHE_PREFIX = "fin_setup_complete:"
    CACHE_TTL = 600  # 10 minutes; setup completion is one-way so a stale True is fine.

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._requires_setup(request):
            return JsonResponse(
                {
                    "detail": "Complete first-run setup before using the product.",
                    "setup_required": True,
                },
                status=403,
            )
        return self.get_response(request)

    def _requires_setup(self, request) -> bool:
        path = request.path
        if not path.startswith("/api/v1/"):
            return False
        tenant = getattr(request, "tenant", None)
        if tenant is None or getattr(tenant, "schema_name", None) == get_public_schema_name():
            return False
        if any(path.startswith(prefix) for prefix in self.EXEMPT_API_PREFIXES):
            return False
        return not self._setup_complete(tenant)

    def _setup_complete(self, tenant) -> bool:
        key = f"{self.CACHE_PREFIX}{tenant.schema_name}"
        if cache.get(key):
            return True
        # Imported lazily: TENANT_APPS models aren't importable at middleware
        # import time during app loading.
        from apps.masters.models import Company

        company = Company.objects.only("setup_complete").order_by("id").first()
        done = bool(company and company.setup_complete)
        if done:
            cache.set(key, True, self.CACHE_TTL)
        return done