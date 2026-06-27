"""Access control for the SaaS platform layer.

These endpoints (plans, subscriptions, entitlements, invoices, company admin)
manage the PLATFORM — they must be restricted to platform super-admins, never
exposed to ordinary tenant users. Super-admin == Django ``is_staff`` (the only
such account is the platform owner; company admins created via signup are not
staff).

Optional ``platform_role`` scopes write access:
  OWNER / empty  → full console
  BILLING        → revenue, coupons, invoices, refunds
  SUPPORT        → companies read, impersonate, notes, extend trial
  READONLY       → stats/health/analytics read only
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.identity.models import User


def _platform_role(user) -> str:
    if not user or not user.is_authenticated or not user.is_staff:
        return ""
    role = getattr(user, "platform_role", "") or ""
    return role or User.PlatformRole.OWNER


class IsSuperAdmin(BasePermission):
    """Allow only authenticated platform super-admins (is_staff)."""

    message = "Super admin access required."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_staff):
            return False
        role = _platform_role(user)
        if request.method in SAFE_METHODS:
            return True
        if role == User.PlatformRole.READONLY:
            return False
        scoped = getattr(view, "platform_roles", None)
        if scoped and role not in scoped and role != User.PlatformRole.OWNER:
            return False
        return True


class ReadAuthWriteSuperAdmin(BasePermission):
    """Authenticated users may read; only super-admins may write.

    Used on Subscriptions: ordinary users read their OWN subscription (the
    queryset already scopes that) to learn their products, but nobody except a
    super-admin may create/modify/delete a subscription.
    """

    message = "Super admin access required to modify this resource."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(user.is_staff)
