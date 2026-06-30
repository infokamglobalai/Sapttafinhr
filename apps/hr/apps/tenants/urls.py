from django.urls import path
from . import views
from .provision import provision_tenant, sync_subscription
from .setup_views import setup, setup_complete
from .stats_api import hr_stats
from apps.accounts.staff_sso_api import (
    staff_login_api,
    staff_login_mfa_api,
    staff_mfa_resend_api,
    staff_mfa_setup_confirm_api,
    staff_mfa_setup_start_api,
)

app_name = "tenants"

urlpatterns = [
    path("internal/provision/", provision_tenant, name="internal_provision"),
    path("internal/sync-subscription/", sync_subscription, name="internal_sync_subscription"),
    path("internal/stats/", hr_stats, name="internal_stats"),
    path("internal/staff-login/", staff_login_api, name="internal_staff_login"),
    path("internal/staff-login/mfa/", staff_login_mfa_api, name="internal_staff_login_mfa"),
    path("internal/staff-login/mfa/resend/", staff_mfa_resend_api, name="internal_staff_mfa_resend"),
    path("internal/staff-login/mfa/setup/start/", staff_mfa_setup_start_api, name="internal_staff_mfa_setup_start"),
    path("internal/staff-login/mfa/setup/confirm/", staff_mfa_setup_confirm_api, name="internal_staff_mfa_setup_confirm"),
    path("setup/", setup, name="setup"),
    path("setup/complete/", setup_complete, name="setup_complete"),
    path("signup/", views.signup, name="signup"),
    path("legal/privacy/", views.legal_privacy, name="legal_privacy"),
    path("legal/terms/", views.legal_terms, name="legal_terms"),
    path("legal/dpa/", views.legal_dpa, name="legal_dpa"),
    path("", views.dashboard, name="dashboard"),
    path("dashboard/", views.dashboard, name="dashboard_explicit"),
    path("company/", views.company_overview, name="company_overview"),
    path("set-language/", views.set_ui_language, name="set_ui_language"),
]
