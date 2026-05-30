"""
Tenant provisioning service — extracted from the create_tenant management
command so it can be reused by the self-service signup view.
"""
import re
from django.db import transaction


SUBDOMAIN_RE = re.compile(r"^[a-z][a-z0-9-]{2,49}$")
RESERVED_SUBDOMAINS = {
    "www", "api", "app", "admin", "superadmin", "auth", "mail", "email",
    "static", "media", "support", "help", "blog", "docs", "status", "billing",
    "dashboard", "console", "portal", "secure", "ftp", "smtp", "pop", "imap",
    "ns1", "ns2", "test", "staging", "dev", "demo", "localhost",
}


def validate_subdomain(subdomain: str) -> str | None:
    """Return an error message if invalid, else None."""
    if not subdomain:
        return "Please choose a workspace URL."
    if not SUBDOMAIN_RE.match(subdomain):
        return ("Use 3-50 characters: lowercase letters, numbers and dashes only. "
                "Must start with a letter.")
    if subdomain in RESERVED_SUBDOMAINS:
        return "That subdomain is reserved. Please choose another."
    return None


@transaction.atomic
def provision_tenant(*, company_name: str, subdomain: str, admin_email: str, admin_password: str):
    """
    Create a new Tenant + system roles + HR admin user in a single transaction.
    Returns the created tenant. Raises ValueError on validation failures.
    """
    from .models import ProductCode, ProductEntitlement, Tenant
    from apps.accounts.models import User, Role, Permission, RolePermission, UserRole

    company_name = (company_name or "").strip()
    subdomain = (subdomain or "").strip().lower()
    admin_email = (admin_email or "").strip().lower()

    if not company_name:
        raise ValueError("Company name is required.")
    err = validate_subdomain(subdomain)
    if err:
        raise ValueError(err)
    if Tenant.objects.filter(subdomain=subdomain).exists():
        raise ValueError("That workspace URL is already taken.")
    if not admin_email:
        raise ValueError("Admin email is required.")
    if User.objects.filter(email__iexact=admin_email, tenant__isnull=True).exists():
        # Don't block — platform superusers live in the same table but with no tenant
        pass
    if not admin_password or len(admin_password) < 8:
        raise ValueError("Password must be at least 8 characters.")

    tenant = Tenant.objects.create(name=company_name, subdomain=subdomain, status="trial")
    ProductEntitlement.objects.create(
        tenant=tenant,
        product=ProductCode.HR,
        status=ProductEntitlement.Status.TRIAL,
    )

    # ── System roles ──────────────────────────────────────────────────────
    all_perms = list(Permission.objects.all())
    roles_config = {
        "super_admin": all_perms,
        "hr_admin": all_perms,
        "manager": [p for p in all_perms if p.codename in (
            "employees.view", "attendance.view", "attendance.regularize_others",
            "leaves.approve_own_team", "payroll.view_own",
        )],
        "employee": [p for p in all_perms if p.codename in (
            "attendance.regularize_own", "leaves.apply", "payroll.view_own",
        )],
    }
    for role_name, perms in roles_config.items():
        role, _ = Role.objects.get_or_create(
            tenant=tenant, name=role_name, defaults={"is_system": True}
        )
        for perm in perms:
            RolePermission.objects.get_or_create(role=role, permission=perm)

    # ── HR admin user ─────────────────────────────────────────────────────
    user = User.objects.create_user(email=admin_email, tenant=tenant, password=admin_password)
    admin_role = Role.objects.get(tenant=tenant, name="super_admin")
    UserRole.objects.create(user=user, role=admin_role)

    return tenant, user
