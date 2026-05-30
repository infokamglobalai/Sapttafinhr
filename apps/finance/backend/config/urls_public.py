"""URLs for the public (shared) schema — admin + auth + tenant signup + SaaS layer."""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.identity.urls")),
    path("api/v1/saas/", include("apps.saas.urls")),
]
