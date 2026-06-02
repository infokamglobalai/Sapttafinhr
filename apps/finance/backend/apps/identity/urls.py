from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .auth_views import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
    VerifyEmailConfirmView,
    VerifyEmailRequestView,
)
from .hr_sso import HrSsoTokenView, HrStatsView
from .jwt import SapttaTokenObtainPairView
from .views import MeView

urlpatterns = [
    path("login/", SapttaTokenObtainPairView.as_view(), name="token_obtain"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("hr-sso-token/", HrSsoTokenView.as_view(), name="hr_sso_token"),
    path("hr-stats/", HrStatsView.as_view(), name="hr_stats"),

    # Email verification
    path("verify-email/request/", VerifyEmailRequestView.as_view(), name="verify_email_request"),
    path("verify-email/confirm/", VerifyEmailConfirmView.as_view(), name="verify_email_confirm"),

    # Password reset
    path("password/reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
