from django.urls import path
from . import views
from .provision import provision_tenant
from .setup_views import setup, setup_complete
from .stats_api import hr_stats

app_name = "tenants"

urlpatterns = [
    path("internal/provision/", provision_tenant, name="internal_provision"),
    path("internal/stats/", hr_stats, name="internal_stats"),
    path("setup/", setup, name="setup"),
    path("setup/complete/", setup_complete, name="setup_complete"),
    path("signup/", views.signup, name="signup"),
    path("legal/privacy/", views.legal_privacy, name="legal_privacy"),
    path("legal/terms/", views.legal_terms, name="legal_terms"),
    path("legal/dpa/", views.legal_dpa, name="legal_dpa"),
    path("", views.dashboard, name="dashboard"),
    path("dashboard/", views.dashboard, name="dashboard_explicit"),
]
