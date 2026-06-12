"""Internal HR tenant provisioning — called server-to-server by FIN at signup.

When a customer buys a plan that includes HR, FIN provisions the FIN side then
calls this endpoint (over the internal Docker network) so the customer also gets
a ready HR workspace: tenant + system roles + admin user + active HR entitlement.

Auth: the same SSO_SHARED_SECRET, sent as a Bearer header. This endpoint is NOT
exposed to end users (no UI links to it); it's an internal control-plane call.
Idempotent: if the subdomain already exists, it returns the existing workspace.

Plain Django (no DRF — HR doesn't depend on it).
"""
from __future__ import annotations

import hmac
import json

from django.conf import settings
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


def _authorized(request) -> bool:
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        return False
    header = request.headers.get("Authorization", "")
    prefix = "Bearer "
    presented = header[len(prefix):] if header.startswith(prefix) else ""
    return bool(presented) and hmac.compare_digest(presented, secret)


@csrf_exempt
@require_http_methods(["POST"])
def provision_tenant(request):
    """POST /internal/provision/  (Bearer SSO_SHARED_SECRET)

    Body: { name, subdomain, email, password?, customer_uid? }
    Creates (or returns) an HR tenant with an active HR entitlement + admin user.
    """
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    try:
        data = json.loads(request.body.decode() or "{}")
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    from apps.accounts.models import Permission, Role, RolePermission, User, UserRole
    from .models import ProductCode, ProductEntitlement, Tenant

    subdomain = (data.get("subdomain") or "").strip().lower()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    if not (subdomain and name and email):
        return JsonResponse({"detail": "name, subdomain and email are required."}, status=400)

    existing = Tenant.objects.filter(subdomain=subdomain).first()
    if existing:
        ProductEntitlement.objects.update_or_create(
            tenant=existing, product=ProductCode.HR,
            defaults={"status": ProductEntitlement.Status.TRIAL},
        )
        return JsonResponse(
            {"detail": "Workspace already exists.", "subdomain": subdomain, "created": False},
            status=200,
        )

    with transaction.atomic():
        tenant_kwargs = {"name": name, "subdomain": subdomain, "status": "trial"}
        customer_uid = data.get("customer_uid")
        if customer_uid:
            tenant_kwargs["customer_uid"] = customer_uid
        tenant = Tenant.objects.create(**tenant_kwargs)

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

        user = User.objects.create_user(
            email=email, tenant=tenant, password=data.get("password") or None
        )
        if not data.get("password"):
            user.set_unusable_password()  # SSO-only until they set one via reset
            user.save(update_fields=["password"])
        UserRole.objects.create(
            user=user, role=Role.objects.get(tenant=tenant, name="super_admin")
        )

        ProductEntitlement.objects.update_or_create(
            tenant=tenant, product=ProductCode.HR,
            defaults={"status": ProductEntitlement.Status.TRIAL},
        )

        # Seed default shifts, departments, and leave types
        from .seeding import seed_tenant_defaults
        seed_tenant_defaults(tenant)

    return JsonResponse(
        {"detail": "Workspace provisioned.", "subdomain": subdomain, "created": True},
        status=201,
    )
