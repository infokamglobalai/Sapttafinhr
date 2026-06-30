"""Tests for finance tenant RBAC."""
import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django_tenants.utils import get_public_schema_name, schema_context
from rest_framework.test import APIRequestFactory

from apps.core.models import Tenant
from apps.team.membership import resolve_tenant_role
from apps.team.models import TenantMember
from apps.team.permissions import TenantRolePermission

User = get_user_model()


@pytest.mark.django_db
def test_resolve_tenant_role_owner_on_public_schema():
    user = User.objects.create_user(email="owner@acme.test", password="pass")
    with schema_context(get_public_schema_name()):
        Tenant.objects.create(
            name="Acme",
            schema_name="acme",
            billing_email="owner@acme.test",
        )
        assert resolve_tenant_role(user) == TenantMember.Role.OWNER


@pytest.mark.django_db
def test_tenant_permission_ignores_stale_jwt_viewer_claim():
    user = User.objects.create_user(email="owner@acme.test", password="pass")
    with schema_context(get_public_schema_name()):
        tenant = Tenant.objects.create(
            name="Acme",
            schema_name="acme",
            billing_email="owner@acme.test",
        )

    with schema_context(tenant.schema_name):
        factory = APIRequestFactory()
        request = factory.post("/api/v1/ledger/journal-entries/")
        request.user = user
        request.auth = {"fin_role": TenantMember.Role.VIEWER}

        perm = TenantRolePermission()
        assert perm.has_permission(request, view=object()) is True
