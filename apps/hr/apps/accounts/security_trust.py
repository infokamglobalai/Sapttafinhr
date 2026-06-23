"""Security & trust content for the Account Settings tab."""
from __future__ import annotations

from django.conf import settings


def get_security_trust_context() -> dict:
    """Structured security measures shown to customers in-app."""
    encryption_on = bool(getattr(settings, "FIELD_ENCRYPTION_KEY", ""))
    sso_on = bool(getattr(settings, "SSO_SHARED_SECRET", ""))

    categories = [
        {
            "id": "access",
            "title": "Authentication & access",
            "icon": "shield",
            "items": [
                {
                    "title": "Unified platform login",
                    "detail": "Sign in once on Saptta; HR opens via a signed, short-lived SSO handoff.",
                    "status": "active" if sso_on else "configured",
                },
                {
                    "title": "Tenant-scoped accounts",
                    "detail": "Users can only access their own company workspace — no cross-tenant login.",
                    "status": "active",
                },
                {
                    "title": "Role-based access control",
                    "detail": "Owner, HR Admin, Manager, and Employee roles with granular permissions.",
                    "status": "active",
                },
                {
                    "title": "Invite-only employee onboarding",
                    "detail": "Signed invite links (7-day expiry). No shared passwords for staff.",
                    "status": "active",
                },
                {
                    "title": "Password policy & hashing",
                    "detail": "Minimum length and complexity rules; Argon2/PBKDF2 password hashing.",
                    "status": "active",
                },
                {
                    "title": "Brute-force protection",
                    "detail": "Rate limiting and lockout on login and password-reset attempts.",
                    "status": "active",
                },
            ],
        },
        {
            "id": "data",
            "title": "Data protection",
            "icon": "lock",
            "items": [
                {
                    "title": "Workspace data isolation",
                    "detail": "Each company's HR data is isolated at the application and database layer.",
                    "status": "active",
                },
                {
                    "title": "Sensitive field encryption",
                    "detail": "PAN, Aadhaar, and bank account numbers encrypted at rest (Fernet/AES).",
                    "status": "active" if encryption_on else "configured",
                },
                {
                    "title": "Private file storage",
                    "detail": "Profile photos and documents served via signed URLs — not public buckets.",
                    "status": "active",
                },
                {
                    "title": "India data residency",
                    "detail": "Production deployments target India-region hosting (DigitalOcean Bangalore, AWS Mumbai).",
                    "status": "configured",
                },
            ],
        },
        {
            "id": "app",
            "title": "Application security",
            "icon": "server",
            "items": [
                {
                    "title": "HTTPS & hardened cookies",
                    "detail": "TLS in production with secure, HttpOnly, SameSite session cookies.",
                    "status": "active",
                },
                {
                    "title": "CSRF & clickjacking protection",
                    "detail": "Cross-site request forgery tokens on all state-changing actions.",
                    "status": "active",
                },
                {
                    "title": "Payment webhook verification",
                    "detail": "Razorpay webhooks verified with HMAC-SHA256; replay events ignored.",
                    "status": "active",
                },
                {
                    "title": "Internal API authentication",
                    "detail": "Server-to-server calls (billing sync, provisioning) use shared secrets.",
                    "status": "active" if sso_on else "configured",
                },
            ],
        },
        {
            "id": "audit",
            "title": "Audit & monitoring",
            "icon": "clipboard",
            "items": [
                {
                    "title": "HR audit log",
                    "detail": "Who changed what — logins, exports, salary updates, role grants, and more.",
                    "status": "active",
                },
                {
                    "title": "Change history",
                    "detail": "Key records keep a version history for compliance review.",
                    "status": "active",
                },
                {
                    "title": "Error monitoring",
                    "detail": "Production error tracking with PII scrubbing (Sentry).",
                    "status": "configured",
                },
                {
                    "title": "GST-compliant invoices",
                    "detail": "Platform billing invoices with SAC codes and tax breakup.",
                    "status": "active",
                },
            ],
        },
        {
            "id": "compliance",
            "title": "Compliance & legal",
            "icon": "document",
            "items": [
                {
                    "title": "Privacy policy",
                    "detail": "How employee data is collected, used, and retained in this workspace.",
                    "status": "active",
                },
                {
                    "title": "Terms of service",
                    "detail": "Subscription and platform usage terms for your organisation.",
                    "status": "active",
                },
                {
                    "title": "Data Processing Addendum (DPA)",
                    "detail": "Processor obligations aligned with India DPDPA — for enterprise procurement.",
                    "status": "active",
                },
                {
                    "title": "72-hour breach notification",
                    "detail": "Documented incident-response commitment in our DPA.",
                    "status": "configured",
                },
            ],
        },
    ]

    highlights = [
        "Your data is isolated per company — no cross-tenant access.",
        "Sensitive IDs and bank details are encrypted at rest.",
        "Employees join via signed invite links, not shared passwords.",
        "Every sensitive HR action is logged with who, what, and when.",
    ]

    return {
        "categories": categories,
        "highlights": highlights,
        "encryption_enabled": encryption_on,
        "sso_enabled": sso_on,
    }
