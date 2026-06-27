from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .auth_views import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
    VerifyEmailConfirmView,
    VerifyEmailRequestView,
)
from .general_ai_views import GeneralAIChatView, GuestAIChatView
from .hr_sso import HrSsoTokenView, HrStaffLoginView, HrStaffLoginMfaView, HrStatsView
from .jwt import SapttaTokenObtainPairView
from .mfa_views import MfaSetupConfirmView, MfaSetupStartView, MfaVerifyLoginView
from .views import MeView

urlpatterns = [
    path("login/", SapttaTokenObtainPairView.as_view(), name="token_obtain"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("mfa/verify/", MfaVerifyLoginView.as_view(), name="mfa_verify"),
    path("mfa/setup/start/", MfaSetupStartView.as_view(), name="mfa_setup_start"),
    path("mfa/setup/confirm/", MfaSetupConfirmView.as_view(), name="mfa_setup_confirm"),
    path("hr-sso-token/", HrSsoTokenView.as_view(), name="hr_sso_token"),
    path("hr-staff-login/", HrStaffLoginView.as_view(), name="hr_staff_login"),
    path("hr-staff-login/mfa/", HrStaffLoginMfaView.as_view(), name="hr_staff_login_mfa"),
    path("hr-stats/", HrStatsView.as_view(), name="hr_stats"),
    path("general-chat/", GeneralAIChatView.as_view(), name="general_ai_chat"),
    path("guest-chat/", GuestAIChatView.as_view(), name="guest_ai_chat"),

    # Email verification
    path("verify-email/request/", VerifyEmailRequestView.as_view(), name="verify_email_request"),
    path("verify-email/confirm/", VerifyEmailConfirmView.as_view(), name="verify_email_confirm"),

    # Password reset
    path("password/reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
