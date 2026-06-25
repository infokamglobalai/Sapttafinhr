from django.urls import path
from . import views
from . import settings_views
from . import billing_views
from . import product_launch
from .sso import sso_login

app_name = "accounts"

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("employee-login/", views.employee_login, name="employee_login"),
    path("invite/<str:token>/", views.employee_invite, name="employee_invite"),
    path("sso/", sso_login, name="sso_login"),
    path("logout/", views.logout_view, name="logout"),
    path("change-password/", views.change_password, name="change_password"),
    path("settings/", settings_views.account_settings, name="settings"),
    path("launch/finance/", product_launch.launch_finance, name="launch_finance"),
    path("billing/invoices/<int:invoice_id>/", billing_views.invoice_view, name="invoice_view"),
    path("billing/invoices/<int:invoice_id>/pdf/", billing_views.invoice_pdf, name="invoice_pdf"),
    path("profile/", views.profile, name="profile"),
    path("password-reset/", views.password_reset_request, name="password_reset_request"),
    path("employee-password-reset/", views.employee_password_reset_request, name="employee_password_reset_request"),
    path("employee-password-reset/<uidb64>/<token>/", views.employee_password_reset_confirm, name="employee_password_reset_confirm"),
]
