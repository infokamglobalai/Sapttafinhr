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
    from .limits import DEFAULT_INCLUDED_EMPLOYEES
    from .jurisdiction import locale_defaults_for_country, normalise_jurisdiction
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
        country = normalise_jurisdiction(data.get("country") or data.get("payroll_jurisdiction"))
        locale = locale_defaults_for_country(country)
        tenant_kwargs = {
            "name": name,
            "subdomain": subdomain,
            "status": "trial",
            "max_employees": DEFAULT_INCLUDED_EMPLOYEES,
            "country": locale["country"],
            "currency": locale["currency"],
            "timezone": locale["timezone"],
            "payroll_jurisdiction": locale["payroll_jurisdiction"],
        }
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

        from .regional_packs import seed_regional_defaults
        seed_regional_defaults(tenant)

    return JsonResponse(
        {"detail": "Workspace provisioned.", "subdomain": subdomain, "created": True},
        status=201,
    )


@csrf_exempt
@require_http_methods(["POST"])
def sync_subscription(request):
    """POST /internal/sync-subscription/  (Bearer SSO_SHARED_SECRET)

    Body: {
      subdomain, max_employees?, subscription_id?, status?, plan_code?
    }
    Updates tenant headcount cap and HR entitlement from platform billing.
    """
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    try:
        data = json.loads(request.body.decode() or "{}")
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    from .limits import DEFAULT_INCLUDED_EMPLOYEES, sync_employee_count
    from .models import ProductCode, ProductEntitlement, Tenant

    subdomain = (data.get("subdomain") or "").strip().lower()
    if not subdomain:
        return JsonResponse({"detail": "subdomain is required."}, status=400)

    tenant = Tenant.objects.filter(subdomain=subdomain).first()
    if not tenant:
        return JsonResponse({"detail": "Workspace not found."}, status=404)

    max_employees = data.get("max_employees")
    if max_employees is not None:
        try:
            tenant.max_employees = max(int(max_employees), 1)
        except (TypeError, ValueError):
            return JsonResponse({"detail": "max_employees must be a positive integer."}, status=400)
    elif tenant.max_employees < DEFAULT_INCLUDED_EMPLOYEES:
        tenant.max_employees = DEFAULT_INCLUDED_EMPLOYEES

    if data.get("status") == "active":
        tenant.status = "active"
    tenant.save(update_fields=["max_employees", "status", "updated_at"])

    ent_defaults = {}
    subscription_id = (data.get("subscription_id") or "").strip()
    if subscription_id:
        ent_defaults["external_subscription_id"] = subscription_id
    ent_status = (data.get("entitlement_status") or data.get("status") or "").strip().lower()
    if ent_status in ProductEntitlement.Status.values:
        ent_defaults["status"] = ent_status
    elif data.get("status") == "active":
        ent_defaults["status"] = ProductEntitlement.Status.ACTIVE

    if ent_defaults:
        ProductEntitlement.objects.update_or_create(
            tenant=tenant,
            product=ProductCode.HR,
            defaults=ent_defaults,
        )

    sync_employee_count(tenant)
    return JsonResponse(
        {
            "detail": "Subscription synced.",
            "subdomain": subdomain,
            "max_employees": tenant.max_employees,
            "employee_count": tenant.employee_count,
        },
        status=200,
    )
