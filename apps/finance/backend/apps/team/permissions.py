"""Finance tenant RBAC — enforces TenantMember roles on API requests."""
from __future__ import annotations

from django.db import connection
from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.team.membership import resolve_tenant_role, role_rank
from apps.team.models import TenantMember


# Minimum role for write operations by URL prefix (tenant APIs under /api/v1/).
_WRITE_MIN_BY_PREFIX: list[tuple[str, str]] = [
    ("/team/", TenantMember.Role.ADMIN),
    ("/public/", TenantMember.Role.ADMIN),
    ("/masters/", TenantMember.Role.ACCOUNTANT),
    ("/ledger/", TenantMember.Role.ACCOUNTANT),
    ("/billing/", TenantMember.Role.ACCOUNTANT),
    ("/payments/", TenantMember.Role.ACCOUNTANT),
    ("/procurement/", TenantMember.Role.ACCOUNTANT),
    ("/banking/", TenantMember.Role.ACCOUNTANT),
    ("/inventory/", TenantMember.Role.ACCOUNTANT),
    ("/assets/", TenantMember.Role.ACCOUNTANT),
    ("/taxation/", TenantMember.Role.ACCOUNTANT),
    ("/expenses/", TenantMember.Role.EMPLOYEE),
    ("/portal/", TenantMember.Role.ADMIN),
    ("/notifications/", TenantMember.Role.VIEWER),
    ("/reports/", TenantMember.Role.VIEWER),
    ("/ai/", TenantMember.Role.ADMIN),
]

_READ_MIN_BY_PREFIX: list[tuple[str, str]] = [
    ("/team/", TenantMember.Role.ADMIN),
    ("/public/", TenantMember.Role.ADMIN),
    ("/portal/", TenantMember.Role.VIEWER),
    ("/ai/", TenantMember.Role.ADMIN),
]


def _path_tail(request) -> str:
    path = request.path or ""
    marker = "/api/v1/"
    if marker in path:
        return path[path.index(marker) + len(marker) - 1 :]
    return path


def _min_role_for_path(path: str, *, write: bool) -> str:
    table = _WRITE_MIN_BY_PREFIX if write else _READ_MIN_BY_PREFIX
    for prefix, role in table:
        if path.startswith(prefix):
            return role
    return TenantMember.Role.VIEWER if not write else TenantMember.Role.ACCOUNTANT


class TenantRolePermission(BasePermission):
    """Require sufficient TenantMember role for tenant-scoped finance APIs."""

    message = "You do not have permission to perform this action in this workspace."

    def has_permission(self, request, view):
        schema = getattr(connection, "schema_name", "public")
        if schema == "public":
            return True

        if request.method in SAFE_METHODS:
            min_role = getattr(view, "fin_min_role_read", None) or _min_role_for_path(
                _path_tail(request), write=False
            )
        else:
            action = getattr(view, "action", None)
            if action in ("approve", "reject"):
                min_role = TenantMember.Role.MANAGER
            elif action in ("submit",):
                min_role = TenantMember.Role.EMPLOYEE
            else:
                min_role = getattr(view, "fin_min_role_write", None) or _min_role_for_path(
                    _path_tail(request), write=True
                )

        role = resolve_tenant_role(request.user)
        # JWT fin_role is minted on public schema; inside a tenant always use live membership.
        if schema == "public":
            try:
                token = getattr(request, "auth", None)
                if token is not None:
                    role = token.get("fin_role") or role
            except (AttributeError, TypeError):
                pass

        return role_rank(role) >= role_rank(min_role)
