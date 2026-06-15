"""Tenant binding for JWT-authenticated requests (H2).

django-tenants selects the Postgres schema from the request subdomain, but the
access token itself carries no tenant — so a valid token could be replayed
against another tenant's subdomain and operate on that schema. This permission
ties the two together: the token's `workspace` claim must match the schema being
served.

Scope/limits:
  - Public-schema endpoints (auth, saas — the platform surface) are not
    tenant-scoped, so they're always allowed.
  - Requests without a JWT (e.g. SessionAuthentication) are allowed here; they're
    governed by other auth.
  - Tokens with no resolved workspace (non-owner users — FIN users have no tenant
    FK yet) are allowed, to avoid locking legit users out before the per-user
    membership model lands. Owners' tokens ARE bound, which closes the common
    replay path. Tighten to deny-by-default once memberships exist.
"""
from django.db import connection
from rest_framework.permissions import BasePermission


class TokenWorkspaceMatchesSchema(BasePermission):
    message = "This account does not have access to this workspace."

    def has_permission(self, request, view):
        schema = getattr(connection, "schema_name", "public")
        if schema == "public":
            return True  # platform surface — not tenant-scoped

        token = getattr(request, "auth", None)
        if token is None:
            return True  # not JWT-authenticated; governed elsewhere

        # request.auth is a validated token; claims are dict-accessible.
        try:
            workspace = token.get("workspace")
        except AttributeError:
            return True
        if not workspace:
            return True  # unresolved (non-owner) — see per-user membership follow-up
        return workspace == schema
