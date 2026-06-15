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

from .forms import SetPasswordForm
from .platform import platform_login_url, platform_logout_url
from .ratelimit import is_locked_out, record_failure  # used by password reset

User = get_user_model()


@require_http_methods(["GET"])
def login_view(request):
    """HR has no login of its own — send the user to the platform single sign-on.

    Authenticated users go straight to their dashboard; everyone else is bounced
    to the platform login, which signs them in and hands them back via SSO.
    """
    if request.user.is_authenticated:
        return redirect("tenants:dashboard")
    return redirect(platform_login_url("hr"))


@require_http_methods(["POST"])
def logout_view(request):
    """Full sign-out. Clears the HR session, then hands off to the platform's
    single logout endpoint so the platform session (a different origin, which HR
    can't clear) is ended too — landing the user on the login page."""
    logout(request)
    return redirect(platform_logout_url())


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
    return render(request, "auth/profile.html", {"user": request.user})


# ────────────────────────────────────────────────────────────────────────────
# Password reset (forgot password flow)
# ────────────────────────────────────────────────────────────────────────────
def _send_password_reset_email(user, request):
    """Build a signed reset URL and email it to the user."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = request.build_absolute_uri(
        reverse("accounts:password_reset_confirm", kwargs={"uidb64": uid, "token": token})
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
def password_reset_request(request):
    """Step 1: user enters email, we send them a reset link."""
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
            return redirect("accounts:login")
        else:
            tenant = getattr(request, "tenant", None)
            qs = User.objects.filter(email__iexact=email, is_active=True)
            if tenant:
                qs = qs.filter(tenant=tenant)
            user = qs.first()
            if user:
                try:
                    _send_password_reset_email(user, request)
                except Exception:
                    pass
            # Count every reset attempt (real or not) to throttle email spam.
            record_failure("pwreset", request, email,
                           max_attempts=5, window_seconds=3600, lockout_seconds=3600)
            messages.success(
                request,
                "If an account exists for that email, a reset link has been sent.",
            )
            return redirect("accounts:login")
    return render(request, "auth/password_reset_request.html")


@require_http_methods(["GET", "POST"])
def password_reset_confirm(request, uidb64, token):
    """Step 2: user clicks email link, lands here, sets new password."""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is None or not default_token_generator.check_token(user, token):
        messages.error(request, "That reset link is invalid or has expired. Request a new one.")
        return redirect("accounts:password_reset_request")

    if request.method == "POST":
        form = SetPasswordForm(data=request.POST)
        if form.is_valid():
            user.set_password(form.cleaned_data["password1"])
            user.save()
            messages.success(request, "Your password has been updated. Please log in.")
            return redirect("accounts:login")
    else:
        form = SetPasswordForm()

    return render(request, "auth/password_reset_confirm.html", {"form": form, "user_obj": user})
