"""Account & workspace settings — forms and email helpers."""
from __future__ import annotations

from django import forms
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from apps.employees.models import Employee
from apps.tenants.models import Tenant

CSS = "input input-bordered w-full"
SELECT_CSS = "select select-bordered w-full"


class ProfileEditForm(forms.ModelForm):
    class Meta:
        model = Employee
        fields = [
            "first_name", "middle_name", "last_name", "preferred_name",
            "date_of_birth", "gender", "blood_group",
            "personal_email", "phone_primary", "phone_alternate",
            "profile_photo",
        ]
        widgets = {
            "first_name": forms.TextInput(attrs={"class": CSS}),
            "middle_name": forms.TextInput(attrs={"class": CSS}),
            "last_name": forms.TextInput(attrs={"class": CSS}),
            "preferred_name": forms.TextInput(attrs={
                "class": CSS,
                "placeholder": "Nickname shown to colleagues (optional)",
            }),
            "date_of_birth": forms.DateInput(attrs={"class": CSS, "type": "date"}),
            "gender": forms.Select(attrs={"class": SELECT_CSS}),
            "blood_group": forms.TextInput(attrs={"class": CSS, "placeholder": "e.g. O+"}),
            "personal_email": forms.EmailInput(attrs={"class": CSS}),
            "phone_primary": forms.TextInput(attrs={"class": CSS}),
            "phone_alternate": forms.TextInput(attrs={"class": CSS}),
            "profile_photo": forms.FileInput(attrs={"class": "file-input file-input-bordered w-full", "accept": "image/*"}),
        }


class CompanyBrandingForm(forms.ModelForm):
    class Meta:
        model = Tenant
        fields = ["name", "company_logo", "address", "gstin", "pan", "timezone", "ui_language"]
        widgets = {
            "name": forms.TextInput(attrs={"class": CSS}),
            "company_logo": forms.FileInput(attrs={"class": "file-input file-input-bordered w-full", "accept": "image/*"}),
            "address": forms.Textarea(attrs={"class": "textarea textarea-bordered w-full", "rows": 3}),
            "gstin": forms.TextInput(attrs={"class": CSS, "placeholder": "22AAAAA0000A1Z5"}),
            "pan": forms.TextInput(attrs={"class": CSS, "placeholder": "AAAAA0000A"}),
            "timezone": forms.Select(attrs={"class": SELECT_CSS}, choices=[
                ("Asia/Kolkata", "India (IST)"),
                ("Asia/Dubai", "UAE (GST)"),
                ("Asia/Kuwait", "Kuwait"),
                ("Asia/Riyadh", "Saudi Arabia"),
                ("Asia/Singapore", "Singapore"),
                ("UTC", "UTC"),
            ]),
            "ui_language": forms.Select(attrs={"class": SELECT_CSS}),
        }


class EmailTestForm(forms.Form):
    recipient = forms.EmailField(
        widget=forms.EmailInput(attrs={"class": CSS, "placeholder": "you@company.com"}),
        label="Send test to",
    )


def get_subscription_snapshot(tenant) -> dict:
    """Read-only billing snapshot from HR entitlements (owner-facing)."""
    from apps.tenants.models import ProductEntitlement, ProductCode

    ent = (
        tenant.product_entitlements.filter(product=ProductCode.HR)
        .order_by("-updated_at")
        .first()
    )
    plan_labels = dict(Tenant.PLAN_CHOICES)
    status_labels = dict(Tenant.STATUS_CHOICES)
    return {
        "plan": plan_labels.get(tenant.plan, tenant.plan.title()),
        "status": status_labels.get(tenant.status, tenant.status.title()),
        "entitlement_status": ent.get_status_display() if ent else "—",
        "period_start": ent.current_period_start if ent else None,
        "period_end": ent.current_period_end if ent else None,
        "seats_used": tenant.employee_count,
        "seats_max": tenant.max_employees,
        "subdomain": tenant.subdomain,
        "has_entitlement": ent is not None and ent.is_active,
    }


def describe_email_backend() -> dict:
    backend = getattr(settings, "EMAIL_BACKEND", "")
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "")
    if "console" in backend:
        mode = "development"
        label = "Console (dev only — emails print to server logs)"
        delivers = False
    elif "dummy" in backend:
        mode = "disabled"
        label = "Disabled (no emails sent)"
        delivers = False
    elif "smtp" in backend.lower() or "anymail" in backend.lower() or "ses" in backend.lower():
        mode = "production"
        label = "SMTP / provider (live delivery)"
        delivers = True
    else:
        mode = "unknown"
        label = backend or "Not configured"
        delivers = False
    return {
        "mode": mode,
        "label": label,
        "from_email": from_email,
        "delivers": delivers,
        "backend": backend,
    }


def send_test_invite_email(*, tenant, recipient: str, requested_by) -> dict:
    """Send a test email so admins can verify invites will deliver."""
    info = describe_email_backend()
    subject = f"[Test] {tenant.name} — employee invites are ready"
    body = (
        f"Hi,\n\n"
        f"This is a test message from {tenant.name}'s HR workspace on Saptta.\n"
        f"If you received this email, employee invite messages will be delivered correctly.\n\n"
        f"From address: {info['from_email']}\n"
        f"Requested by: {requested_by.email}\n"
    )
    html = f"""<p>Hi,</p>
<p>This is a <strong>test message</strong> from <strong>{tenant.name}</strong>'s HR workspace on Saptta.</p>
<p>If you received this email, <strong>employee invite links</strong> will be delivered to your team.</p>
<p style="color:#64748B;font-size:13px;">From: {info['from_email']} · Requested by: {requested_by.email}</p>"""

    if not info["delivers"]:
        # Still exercise the mail stack so admins see output in dev logs.
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=info["from_email"] or "noreply@saptta.local",
            to=[recipient],
        )
        msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=True)
        return {
            "ok": True,
            "delivered": False,
            "message": (
                "Dev mode: email was written to the server console only (not sent over the internet). "
                "Configure SMTP or Amazon SES in production — see apps/hr/.env.example."
            ),
        }

    msg = EmailMultiAlternatives(
        subject=subject,
        body=body,
        from_email=info["from_email"],
        to=[recipient],
    )
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)
    return {
        "ok": True,
        "delivered": True,
        "message": f"Test email sent to {recipient}. Check your inbox (and spam folder).",
    }
