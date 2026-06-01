"""URLs for tenant schemas — full app surface."""
from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.saas.portal_views import MySubscriptionView

urlpatterns = [
    path("admin/", admin.site.urls),

    # Customer billing portal — resolves the subscription from the workspace
    # subdomain (request.tenant). saas models live in the public schema.
    path("api/v1/saas/my-subscription/", MySubscriptionView.as_view(), name="my_subscription"),

    path("api/v1/auth/", include("apps.identity.urls")),
    path("api/v1/masters/", include("apps.masters.urls")),
    path("api/v1/ledger/", include("apps.ledger.urls")),
    path("api/v1/billing/", include("apps.billing.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/procurement/", include("apps.procurement.urls")),
    path("api/v1/taxation/", include("apps.taxation.urls")),
    path("api/v1/banking/", include("apps.banking.urls")),
    path("api/v1/inventory/", include("apps.inventory.urls")),
    path("api/v1/assets/", include("apps.assets.urls")),
    path("api/v1/expenses/", include("apps.expenses.urls")),
    path("api/v1/public/", include("apps.publicapi.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/portal/", include("apps.portal.urls")),

    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]
