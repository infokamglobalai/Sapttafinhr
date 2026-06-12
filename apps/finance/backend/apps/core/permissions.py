from rest_framework.permissions import BasePermission
from django_tenants.utils import schema_context, get_public_schema_name
from apps.team.models import TenantMember


class HasWorkspacePermission(BasePermission):
    """
    Ensure the authenticated user has access to the active tenant.
    - Public schema requests: allow all authenticated users.
    - Tenant schema requests: allow platform superadmins (is_staff) or 
      users who are active members (TenantMember) of that tenant.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        tenant = getattr(request, "tenant", None)
        if not tenant:
            return False

        # If it is the public schema, allow
        if tenant.schema_name == get_public_schema_name():
            return True

        # Platform superadmins can access any tenant
        if user.is_staff:
            return True

        # Otherwise check membership inside the tenant schema
        with schema_context(tenant.schema_name):
            return TenantMember.objects.filter(user_id=user.id, is_active=True).exists()
