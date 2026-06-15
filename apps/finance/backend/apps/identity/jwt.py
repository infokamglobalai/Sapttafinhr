"""Custom JWT token serializer — embeds identity claims in the access token.

Adds `email`/`full_name` plus the user's `workspace` so the SPA targets the right
tenant after login (without it, the SPA fell back to the default workspace and
showed another tenant's data). FIN users live in the public schema with no FK to
a tenant, so we resolve the workspace by matching the owner's email to
Tenant.billing_email (set at signup). Best-effort; null if no match.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


def resolve_workspace_for(user) -> str | None:
    """Best-effort: the tenant this user owns (billing_email match)."""
    try:
        from apps.core.models import Tenant

        t = (
            Tenant.objects.exclude(schema_name="public")
            .filter(billing_email__iexact=user.email)
            .order_by("created_on")
            .first()
        )
        return t.schema_name if t else None
    except Exception:  # noqa: BLE001
        return None


class SapttaTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = getattr(user, "full_name", "")
        # Tenant binding: which workspace (schema) this token is allowed to act on.
        # Enforced per-request by TokenWorkspaceMatchesSchema so a token can't be
        # replayed against another tenant's subdomain. Null for users with no
        # resolved workspace (non-owners) — see the per-user membership follow-up.
        token["workspace"] = resolve_workspace_for(user)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Optionally block login until the email is verified.
        from django.conf import settings

        if getattr(settings, "REQUIRE_EMAIL_VERIFICATION", False) and not getattr(
            self.user, "is_verified", True
        ):
            raise serializers.ValidationError(
                {"detail": "Please verify your email address before signing in."}
            )
        data["workspace"] = resolve_workspace_for(self.user)
        data["user"] = {
            "id": self.user.id,
            "email": self.user.email,
            "full_name": getattr(self.user, "full_name", ""),
            "is_staff": self.user.is_staff,
            "is_verified": getattr(self.user, "is_verified", True),
        }
        return data


class SapttaTokenObtainPairView(TokenObtainPairView):
    serializer_class = SapttaTokenObtainPairSerializer
    throttle_scope = "login"  # brute-force protection (ScopedRateThrottle)
