from django.urls import path
from . import views

app_name = "tenants"

urlpatterns = [
    path("signup/", views.signup, name="signup"),
    path("legal/privacy/", views.legal_privacy, name="legal_privacy"),
    path("legal/terms/", views.legal_terms, name="legal_terms"),
    path("legal/dpa/", views.legal_dpa, name="legal_dpa"),
    path("", views.dashboard, name="dashboard"),
    path("dashboard/", views.dashboard, name="dashboard_explicit"),
]
