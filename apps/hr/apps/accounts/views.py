from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, get_user_model
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib import messages
from django.views.decorators.http import require_http_methods, require_POST
from django.http import HttpResponse
from django.urls import reverse
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

from .forms import SetPasswordForm, LoginForm
from .platform import platform_login_url, platform_logout_url, platform_forgot_password_url
from .ratelimit import is_locked_out, record_failure, clear_failures

User = get_user_model()


@require_http_methods(["GET"])
def login_view(request):
    """HR has no login of its own — send the user to the platform single sign-on.

    Authenticated users go straight to their dashboard; everyone else is bounced
    to the platform login, which signs them in and hands them back via SSO.
    """
    if request.user.is_authenticated:
        return redirect("tenants:dashboard")
    return redirect(platform_login_url("hr", request))


@require_http_methods(["GET", "POST"])
def employee_login(request):
    """HR-native login for self-service employees.

    Company/owner accounts live in the Finance platform and sign in there. HR
    employees, though, exist only in HR's database — so once they've set a
    password via their invite link, this is where they sign in again. It checks
    HR's own user store (TenantAuthBackend) with the same brute-force throttling
    as the rest of the auth surface.
    """
    if request.user.is_authenticated:
        return redirect("tenants:dashboard")

    if request.method == "POST":
        email = (request.POST.get("email") or "").strip().lower()
        if is_locked_out("emplogin", request, email):
            messages.error(request, "Too many attempts. Please wait a few minutes and try again.")
            return render(request, "auth/employee_login.html", {
                "form": LoginForm(request),
                "platform_login_url": platform_login_url("hr", request),
                "hide_app_chrome": True,
            })

        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            from utils import mfa as mfa_service
            from .mfa_views import begin_mfa_pending

            if mfa_service.user_needs_mfa_setup(user):
                begin_mfa_pending(request, user, setup=True)
                clear_failures("emplogin", request, email)
                next_q = request.GET.urlencode()
                url = reverse("accounts:employee_mfa_setup")
                if next_q:
                    url = f"{url}?{next_q}"
                return redirect(url)
            if mfa_service.user_needs_mfa_verify(user):
                begin_mfa_pending(request, user, setup=False)
                clear_failures("emplogin", request, email)
                next_q = request.GET.urlencode()
                url = reverse("accounts:employee_mfa_verify")
                if next_q:
                    url = f"{url}?{next_q}"
                return redirect(url)

            from apps.employees.profile_link import ensure_user_employee_profile

            ensure_user_employee_profile(user, tenant=user.tenant)
            login(request, user, backend="apps.accounts.backends.TenantAuthBackend")
            clear_failures("emplogin", request, email)
            next_url = request.GET.get("next") or reverse("tenants:dashboard")
            return redirect(next_url)
        record_failure("emplogin", request, email)
    else:
        form = LoginForm(request)

    return render(request, "auth/employee_login.html", {
        "form": form,
        "platform_login_url": platform_login_url("hr", request),
        "hide_app_chrome": True,
    })


@require_http_methods(["GET", "POST"])
def employee_invite(request, token):
    """Accept an admin-issued employee invite link: set a password and sign in.

    This is the only way a freshly-provisioned employee gets in. Their account is
    created locked (inactive, no usable password), so the normal login refuses it
    until this link is used. The link is signed + self-expiring (see invites.py),
    so it can't be forged and stops working after a week."""
    from .invites import read_invite_token

    uid = read_invite_token(token)
    user = User.objects.filter(pk=uid).first() if uid is not None else None
    if user is None:
        messages.error(
            request,
            "This invite link is invalid or has expired. Ask your administrator to send a new one.",
        )
        return redirect("accounts:employee_login")

    if request.method == "POST":
        form = SetPasswordForm(data=request.POST)
        if form.is_valid():
            user.set_password(form.cleaned_data["password1"])
            user.is_active = True
            user.save(update_fields=["password", "is_active"])
            login(request, user, backend="apps.accounts.backends.TenantAuthBackend")
            messages.success(request, "Welcome! Your password is set — you're signed in.")
            return redirect("tenants:dashboard")
    else:
        form = SetPasswordForm()

    return render(request, "auth/employee_invite.html", {"form": form, "invited_user": user, "hide_app_chrome": True})


@require_http_methods(["POST"])
def logout_view(request):
    """Full sign-out. Clears the HR session, then hands off to the platform's
    single logout endpoint so the platform session (a different origin, which HR
    can't clear) is ended too — landing the user on the login page."""
    logout(request)
    return redirect(platform_logout_url(request))


@login_required
def change_password(request):
    if request.method == "POST":
        form = SetPasswordForm(data=request.POST)
        if form.is_valid():
            request.user.set_password(form.cleaned_data["password1"])
            request.user.save()
            messages.success(request, "Password changed successfully. Please log in again.")
            logout(request)
            if request.htmx:
                return HttpResponse(
                    headers={"HX-Redirect": "/auth/login/"}
                )
            return redirect("accounts:login")
    else:
        form = SetPasswordForm()

    if request.htmx:
        return render(request, "auth/partials/change_password_form.html", {"form": form})
    return render(request, "auth/change_password.html", {"form": form})


@login_required
def profile(request):
    """Legacy URL — unified settings page."""
    return redirect("/auth/settings/?tab=profile")


def _ensure_self_employee(user, tenant):
    from apps.employees.profile_link import ensure_user_employee_profile

    return ensure_user_employee_profile(user, tenant=tenant)


# ────────────────────────────────────────────────────────────────────────────
# Password reset (forgot password flow)
# ────────────────────────────────────────────────────────────────────────────

@require_http_methods(["GET"])
def password_reset_request(request):
    """Employer / standard tenant password reset redirects to the platform forgot password page."""
    return redirect(platform_forgot_password_url(request))


def _send_employee_password_reset_email(user, request):
    """Build a signed reset URL and email it to the employee."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = request.build_absolute_uri(
        reverse("accounts:employee_password_reset_confirm", kwargs={"uidb64": uid, "token": token})
    )
    html = render_to_string("auth/emails/password_reset.html", {
        "user": user,
        "reset_url": reset_url,
        "tenant": user.tenant,
    })
    email = EmailMultiAlternatives(
        subject=f"Reset your {user.tenant.name if user.tenant else 'HRMS'} password",
        body=strip_tags(html),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html, "text/html")
    email.send(fail_silently=False)


@require_http_methods(["GET", "POST"])
def employee_password_reset_request(request):
    """Step 1 for employees: enter email, we send them a reset link."""
    if request.method == "POST":
        email = (request.POST.get("email") or "").strip().lower()
        if not email:
            messages.error(request, "Please enter your email.")
        elif is_locked_out("pwreset", request, email):
            # Don't leak that this email is being throttled — just show success.
            messages.success(
                request,
                "If an account exists for that email, a reset link has been sent.",
            )
            return redirect("accounts:employee_login")
        else:
            tenant = getattr(request, "tenant", None)
            qs = User.objects.filter(email__iexact=email, is_active=True)
            if tenant:
                qs = qs.filter(tenant=tenant)
            user = qs.first()
            if user:
                try:
                    _send_employee_password_reset_email(user, request)
                except Exception:
                    pass
            # Count every reset attempt (real or not) to throttle email spam.
            record_failure("pwreset", request, email,
                           max_attempts=5, window_seconds=3600, lockout_seconds=3600)
            messages.success(
                request,
                "If an account exists for that email, a reset link has been sent.",
            )
            return redirect("accounts:employee_login")
    return render(request, "auth/password_reset_request.html", {"hide_app_chrome": True})


@require_http_methods(["GET", "POST"])
def employee_password_reset_confirm(request, uidb64, token):
    """Step 2 for employees: click email link, land here, set new password."""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is None or not default_token_generator.check_token(user, token):
        messages.error(request, "That reset link is invalid or has expired. Request a new one.")
        return redirect("accounts:employee_password_reset_request")

    if request.method == "POST":
        form = SetPasswordForm(data=request.POST)
        if form.is_valid():
            user.set_password(form.cleaned_data["password1"])
            user.save()
            messages.success(request, "Your password has been updated. Please log in.")
            return redirect("accounts:employee_login")
    else:
        form = SetPasswordForm()

    return render(request, "auth/password_reset_confirm.html", {"form": form, "user_obj": user, "hide_app_chrome": True})
