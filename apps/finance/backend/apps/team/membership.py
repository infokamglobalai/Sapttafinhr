"""Resolve the current user's TenantMember role inside a tenant schema."""
from __future__ import annotations

from django.db import connection

from apps.team.models import TenantMember


ROLE_RANK = {
    TenantMember.Role.VIEWER: 10,
    TenantMember.Role.EMPLOYEE: 20,
    TenantMember.Role.MANAGER: 30,
    TenantMember.Role.ACCOUNTANT: 40,
    TenantMember.Role.ADMIN: 50,
    TenantMember.Role.OWNER: 60,
}


def role_rank(role: str) -> int:
    return ROLE_RANK.get(role, 0)


def resolve_tenant_role(user) -> str:
    """Best-effort role for *user* in the active tenant schema."""
    if not user or not getattr(user, "is_authenticated", False):
        return TenantMember.Role.VIEWER

    schema = getattr(connection, "schema_name", "public")
    if not schema or schema == "public":
        # Platform login runs on public schema — infer owner from billing_email.
        try:
            from apps.core.models import Tenant

            if (
                Tenant.objects.exclude(schema_name="public")
                .filter(billing_email__iexact=user.email)
                .exists()
            ):
                return TenantMember.Role.OWNER
        except Exception:  # noqa: BLE001
            pass
        return TenantMember.Role.VIEWER

    member = (
        TenantMember.objects.filter(user_id=user.id, is_active=True).first()
        or TenantMember.objects.filter(email__iexact=user.email, is_active=True).first()
    )
    if member:
        if not member.user_id:
            TenantMember.objects.filter(pk=member.pk, user_id=0).update(user_id=user.id)
        return member.role

    try:
        from apps.core.models import Tenant

        tenant = Tenant.objects.filter(schema_name=schema).first()
        if tenant and tenant.billing_email and tenant.billing_email.lower() == user.email.lower():
            ensure_owner_member(
                user_id=user.id,
                email=user.email,
                full_name=getattr(user, "full_name", ""),
            )
            return TenantMember.Role.OWNER
    except Exception:  # noqa: BLE001
        pass

    return TenantMember.Role.VIEWER


def ensure_owner_member(*, user_id: int, email: str, full_name: str = "") -> TenantMember:
    """Create or update the workspace owner row (called during provisioning)."""
    member = TenantMember.objects.filter(email__iexact=email).first()
    if member:
        member.user_id = user_id
        member.role = TenantMember.Role.OWNER
        member.is_active = True
        if full_name:
            member.full_name = full_name
        member.save(update_fields=["user_id", "role", "is_active", "full_name", "updated_at"])
        return member
    return TenantMember.objects.create(
        user_id=user_id,
        email=email,
        full_name=full_name,
        role=TenantMember.Role.OWNER,
        is_active=True,
    )
