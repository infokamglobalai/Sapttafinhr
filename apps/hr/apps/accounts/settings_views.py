"""Unified Account & Settings for all HR users."""
from __future__ import annotations

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from .settings_forms import (
    CompanyBrandingForm,
    EmailTestForm,
    ProfileEditForm,
    describe_email_backend,
    get_subscription_snapshot,
    send_test_invite_email,
)
from .billing_services import fetch_platform_billing, merge_billing_snapshot
from .product_access import tenant_has_finance
from .security_trust import get_security_trust_context
from .views import _ensure_self_employee

VALID_TABS = ("profile", "company", "billing", "email", "security", "support")


@login_required
@require_http_methods(["GET", "POST"])
def account_settings(request):
    tenant = getattr(request, "tenant", None)
    user = request.user
    tab = (request.GET.get("tab") or request.POST.get("tab") or "profile").strip().lower()
    if tab not in VALID_TABS:
        tab = "profile"

    is_owner = user.is_company_owner
    is_admin = user.is_hr_admin

    if tab in ("company", "billing", "email") and not is_owner:
        tab = "profile"
        messages.info(request, "Company and billing settings are only available to the workspace owner.")

    employee = _ensure_self_employee(user, tenant) if tenant else None
    profile_form = ProfileEditForm(instance=employee) if employee else None
    company_form = CompanyBrandingForm(instance=tenant) if tenant and is_owner else None
    email_form = EmailTestForm(initial={"recipient": user.email}) if is_owner else None
    email_info = describe_email_backend()

    if request.method == "POST":
        action = request.POST.get("action", "")

        if action == "save_profile" and employee:
            profile_form = ProfileEditForm(request.POST, request.FILES, instance=employee)
            if profile_form.is_valid():
                profile_form.save()
                messages.success(request, "Profile updated.")
                return redirect(f"/auth/settings/?tab=profile")

        elif action == "save_company" and tenant and is_owner:
            company_form = CompanyBrandingForm(request.POST, request.FILES, instance=tenant)
            if company_form.is_valid():
                company_form.save()
                messages.success(request, "Company branding updated.")
                return redirect("/auth/settings/?tab=company")

        elif action == "send_test_email" and is_owner and email_form:
            email_form = EmailTestForm(request.POST)
            if email_form.is_valid():
                try:
                    result = send_test_invite_email(
                        tenant=tenant,
                        recipient=email_form.cleaned_data["recipient"],
                        requested_by=user,
                    )
                    messages.success(request, result["message"])
                except Exception as exc:
                    messages.error(
                        request,
                        f"Could not send test email: {exc}. "
                        "Check EMAIL_HOST / SMTP settings in your server environment.",
                    )
                return redirect("/auth/settings/?tab=email")

    subscription = None
    if tenant and is_owner:
        local = get_subscription_snapshot(tenant)
        platform = fetch_platform_billing(tenant)
        subscription = merge_billing_snapshot(local, platform)
    platform_base = request.build_absolute_uri("/").replace("/auth/settings/", "").rstrip("/")
    from .platform import platform_base_for_request
    platform_url = platform_base_for_request(request)

    return render(request, "auth/settings.html", {
        "user": user,
        "employee": employee,
        "tenant": tenant,
        "tab": tab,
        "is_owner": is_owner,
        "is_admin": is_admin,
        "profile_form": profile_form,
        "company_form": company_form,
        "email_form": email_form,
        "email_info": email_info,
        "subscription": subscription,
        "platform_url": platform_url,
        "billing_url": f"{platform_url}/app/billing",
        "finance_url": (
            "/auth/launch/finance/"
            if tenant_has_finance(tenant)
            else f"{platform_url}/app/billing"
        ),
        "can_access_finance": tenant_has_finance(tenant) if tenant else False,
        "security_trust": get_security_trust_context(),
    })
