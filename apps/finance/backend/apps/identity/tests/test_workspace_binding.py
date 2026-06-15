"""H2: the JWT carries a `workspace` claim and is bound to the tenant schema.

Verifies the claim is embedded (and propagates to the access token), and that
TokenWorkspaceMatchesSchema only allows a token on its own workspace's schema.
Tests run inside the conftest 'test' schema, so connection.schema_name == 'test'.
"""
import pytest
from django_tenants.utils import get_public_schema_name, schema_context
from rest_framework_simplejwt.tokens import AccessToken

from apps.core.models import Tenant
from apps.identity.jwt import SapttaTokenObtainPairSerializer
from apps.identity.models import User
from apps.identity.permissions import TokenWorkspaceMatchesSchema


class _Req:
    def __init__(self, auth):
        self.auth = auth


@pytest.mark.django_db
def test_jwt_embeds_and_propagates_workspace_claim():
    with schema_context(get_public_schema_name()):
        t = Tenant(schema_name="ws_bind", name="WS", billing_email="ws@example.com")
        t.auto_create_schema = False
        t.save()
        u = User.objects.create_user(email="ws@example.com", password="x", full_name="WS")
        token = SapttaTokenObtainPairSerializer.get_token(u)
    assert token["workspace"] == "ws_bind"
    # The claim must reach the ACCESS token (what API requests carry).
    assert token.access_token["workspace"] == "ws_bind"


@pytest.mark.django_db
def test_permission_binds_token_to_schema():
    perm = TokenWorkspaceMatchesSchema()  # conftest runs in the 'test' schema

    matching = AccessToken()
    matching["workspace"] = "test"
    assert perm.has_permission(_Req(matching), None) is True

    foreign = AccessToken()
    foreign["workspace"] = "other"
    assert perm.has_permission(_Req(foreign), None) is False, "token must not act on another tenant's schema"

    unresolved = AccessToken()  # no workspace claim (non-owner) → allowed (pre-membership)
    assert perm.has_permission(_Req(unresolved), None) is True

    assert perm.has_permission(_Req(None), None) is True  # session auth / no JWT
