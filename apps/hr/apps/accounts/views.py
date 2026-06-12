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

from .forms import LoginForm, SetPasswordForm
from .ratelimit import is_locked_out, record_failure, clear_failures

User = get_user_model()


@require_http_methods(["GET", "POST"])
def login_view(request):
    if request.user.is_authenticated:
        return redirect("tenants:dashboard")

    submitted_email = (request.POST.get("email") or "").strip().lower()

    # Check lockout BEFORE validating form so we don't leak whether the email is real
    if request.method == "POST" and submitted_email and is_locked_out("login", request, submitted_email):
        messages.error(
            request,
            "Too many failed attempts. Try again in 15 minutes, or use the forgot-password link.",
        )
        return render(request, "auth/login.html", {"form": LoginForm(request=request)})

    form = LoginForm(request=request, data=request.POST or None)

    if request.method == "POST":
        if form.is_valid():
            user = form.get_user()
            remember = form.cleaned_data.get("remember_me")
            if not remember:
                request.session.set_expiry(0)  # session expires on browser close
            clear_failures("login", request, submitted_email)
            login(request, user, backend="apps.accounts.backends.TenantAuthBackend")
            next_url = request.GET.get("next", "tenants:dashboard")
            return redirect(next_url)
        else:
            # Form failed — record the failed attempt
            if submitted_email:
                attempts, remaining = record_failure(
                    "login", request, submitted_email, max_attempts=5,
                )
                if remaining <= 2 and remaining > 0:
                    messages.warning(
                        request,
                        f"{remaining} attempt{'s' if remaining != 1 else ''} remaining "
                        f"before this account is temporarily locked.",
                    )

    return render(request, "auth/login.html", {"form": form})


@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return redirect("accounts:login")


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
    from apps.tenants.services import get_tenant_email_connection

    connection, from_email = get_tenant_email_connection(user.tenant)

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
        from_email=from_email,
        to=[user.email],
        connection=connection,
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
