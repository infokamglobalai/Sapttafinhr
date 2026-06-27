"""Issue JWT auth payload after MFA or normal login."""
from rest_framework_simplejwt.tokens import RefreshToken

from apps.team.membership import resolve_tenant_role

from .jwt import resolve_workspace_for


def issue_auth_tokens(user) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["email"] = user.email
    refresh["full_name"] = getattr(user, "full_name", "")
    refresh["workspace"] = resolve_workspace_for(user)
    refresh["fin_role"] = resolve_tenant_role(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "workspace": resolve_workspace_for(user),
        "fin_role": resolve_tenant_role(user),
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": getattr(user, "full_name", ""),
            "is_staff": user.is_staff,
            "is_verified": getattr(user, "is_verified", True),
            "fin_role": resolve_tenant_role(user),
            "mfa_enabled": bool(getattr(user, "mfa_enabled", False)),
        },
    }
