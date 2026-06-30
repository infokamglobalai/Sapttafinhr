"""Employee email OTP verification (session-based HR login)."""
from __future__ import annotations

from django.contrib.auth import get_user_model, login
from django.contrib import messages
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from utils import mfa as mfa_service
from utils.login_otp import issue_and_send_login_otp

from .ratelimit import clear_failures, is_locked_out, record_failure

User = get_user_model()

MFA_SESSION_KEY = "mfa_pending_user_id"
MFA_SETUP_SESSION_KEY = "mfa_pending_setup"


def _pending_user(request):
    raw = request.session.get(MFA_SESSION_KEY)
    if not raw:
        return None
    return User.objects.filter(pk=raw, is_active=True).select_related("tenant").first()


def begin_mfa_pending(request, user, *, setup: bool) -> None:
    request.session[MFA_SESSION_KEY] = str(user.pk)
    request.session[MFA_SETUP_SESSION_KEY] = setup
    request.session.modified = True


def clear_mfa_pending(request) -> None:
    request.session.pop(MFA_SESSION_KEY, None)
    request.session.pop(MFA_SETUP_SESSION_KEY, None)
    request.session.modified = True


def _finish_login(request, user, email: str):
    from apps.employees.profile_link import ensure_user_employee_profile

    ensure_user_employee_profile(user, tenant=user.tenant)
    login(request, user, backend="apps.accounts.backends.TenantAuthBackend")
    clear_failures("emplogin", request, email)
    clear_mfa_pending(request)


@require_http_methods(["GET", "POST"])
def employee_mfa_verify(request):
    user = _pending_user(request)
    if user is None:
        messages.error(request, "Your sign-in session expired. Please sign in again.")
        return redirect("accounts:employee_login")

    if request.method == "POST":
        if request.POST.get("action") == "resend":
            if is_locked_out("emplogin_mfa_resend", request, user.email):
                messages.error(request, "Please wait a minute before requesting another code.")
            else:
                try:
                    issue_and_send_login_otp(user)
                    record_failure("emplogin_mfa_resend", request, user.email)
                    messages.success(request, f"A new code was sent to {user.email}.")
                except Exception:
                    messages.error(request, "Could not send verification email. Try again later.")
            return redirect(request.get_full_path())

        code = (request.POST.get("code") or "").strip()
        if is_locked_out("emplogin_mfa", request, user.email):
            messages.error(request, "Too many attempts. Please wait a few minutes and try again.")
        elif mfa_service.verify_totp(user, code):
            _finish_login(request, user, user.email)
            next_url = request.GET.get("next") or "/"
            return redirect(next_url)
        else:
            record_failure("emplogin_mfa", request, user.email)
            messages.error(request, "Invalid verification code. Try again.")

    return render(
        request,
        "auth/employee_mfa_verify.html",
        {"email": user.email, "hide_app_chrome": True},
    )


@require_http_methods(["GET"])
def employee_mfa_setup(request):
    """Legacy URL — email OTP has no authenticator setup step."""
    return redirect("accounts:employee_mfa_verify")
