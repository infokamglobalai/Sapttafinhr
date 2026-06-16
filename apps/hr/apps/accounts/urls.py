from django.urls import path
from . import views
from .sso import sso_login

app_name = "accounts"

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("employee-login/", views.employee_login, name="employee_login"),
    path("invite/<str:token>/", views.employee_invite, name="employee_invite"),
    path("sso/", sso_login, name="sso_login"),
    path("logout/", views.logout_view, name="logout"),
    path("change-password/", views.change_password, name="change_password"),
    path("profile/", views.profile, name="profile"),
    path("password-reset/", views.password_reset_request, name="password_reset_request"),
    path("password-reset/<uidb64>/<token>/", views.password_reset_confirm, name="password_reset_confirm"),
]
