"""Multi-tenant isolation regression (H1).

The SaaS viewsets live on the public schema and serve every tenant. Before the
fix, `entitlements` and `invoices` returned `.all()`, leaking every tenant's
billing data to any authenticated user. These tests assert each viewset's
get_queryset() scopes to the caller's own tenant (and that staff see all).

Tested at the queryset level (not over HTTP) to avoid django-tenants host→schema
routing in tests — see conftest.py for why full API tests are avoided here.
"""
import pytest
from django_tenants.utils import get_public_schema_name, schema_context

from apps.core.models import Tenant
from apps.identity.models import User
from apps.saas.models import (
    Plan,
    ProductCode,
    SaasInvoice,
    Subscription,
    SubscriptionEntitlement,
)
from apps.saas.views import (
    PlanViewSet,
    SaasInvoiceViewSet,
    SubscriptionEntitlementViewSet,
    SubscriptionViewSet,
)


def _tenant(schema, email):
    """A tenant row WITHOUT creating a Postgres schema (we only touch public-schema rows)."""
    t = Tenant(schema_name=schema, name=schema, billing_email=email)
    t.auto_create_schema = False
    t.save()
    return t


def _request_for(user):
    class _Req:
        pass

    r = _Req()
    r.user = user
    return r


def _viewset(cls, user):
    vs = cls()
    vs.request = _request_for(user)
    return vs


@pytest.fixture
def two_tenants(db):
    # SaaS + Tenant + User are SHARED_APPS (public schema). The conftest runs each
    # DB test inside the 'test' tenant schema, but tenants can only be created in
    # the public schema — so build all rows there. Shared-model reads from the
    # 'test' context still resolve to public, so the viewset tests see them.
    with schema_context(get_public_schema_name()):
        plan = Plan.objects.create(code="iso-plan", name="Iso Plan")
        a = _tenant("iso_a", "owner_a@example.com")
        b = _tenant("iso_b", "owner_b@example.com")
        sub_a = Subscription.objects.create(tenant=a, plan=plan, status=Subscription.Status.ACTIVE)
        sub_b = Subscription.objects.create(tenant=b, plan=plan, status=Subscription.Status.ACTIVE)
        ent_a = SubscriptionEntitlement.objects.create(
            subscription=sub_a, product=ProductCode.FIN, status=SubscriptionEntitlement.Status.ACTIVE
        )
        ent_b = SubscriptionEntitlement.objects.create(
            subscription=sub_b, product=ProductCode.FIN, status=SubscriptionEntitlement.Status.ACTIVE
        )
        inv_a = SaasInvoice.objects.create(
            subscription=sub_a, period_start="2026-01-01", period_end="2026-01-31",
            amount=100, due_date="2026-02-15",
        )
        inv_b = SaasInvoice.objects.create(
            subscription=sub_b, period_start="2026-01-01", period_end="2026-01-31",
            amount=200, due_date="2026-02-15",
        )
        owner_a = User.objects.create_user(email="owner_a@example.com", password="x", full_name="A")
        staff = User.objects.create_user(email="staff@example.com", password="x", full_name="S")
        staff.is_staff = True
        staff.save(update_fields=["is_staff"])
    return locals()


def test_subscriptions_scoped_to_own_tenant(two_tenants):
    t = two_tenants
    ids = set(_viewset(SubscriptionViewSet, t["owner_a"]).get_queryset().values_list("id", flat=True))
    assert ids == {t["sub_a"].id}


def test_entitlements_scoped_to_own_tenant(two_tenants):
    t = two_tenants
    ids = set(_viewset(SubscriptionEntitlementViewSet, t["owner_a"]).get_queryset().values_list("id", flat=True))
    assert ids == {t["ent_a"].id}, "owner A must not see tenant B's entitlements"


def test_invoices_scoped_to_own_tenant(two_tenants):
    t = two_tenants
    ids = set(_viewset(SaasInvoiceViewSet, t["owner_a"]).get_queryset().values_list("id", flat=True))
    assert ids == {t["inv_a"].id}, "owner A must not see tenant B's SaaS invoices"


def test_staff_sees_all_tenants(two_tenants):
    t = two_tenants
    ent_ids = set(_viewset(SubscriptionEntitlementViewSet, t["staff"]).get_queryset().values_list("id", flat=True))
    inv_ids = set(_viewset(SaasInvoiceViewSet, t["staff"]).get_queryset().values_list("id", flat=True))
    assert {t["ent_a"].id, t["ent_b"].id} <= ent_ids
    assert {t["inv_a"].id, t["inv_b"].id} <= inv_ids


# ── Write-protection (payment-bypass) regression ────────────────────────────
# A tenant user must not be able to PATCH their own subscription to ACTIVE, flip
# an entitlement on, mark an invoice PAID, or rewrite a Plan's price. The
# viewsets are ReadOnly, so no create/update/destroy actions exist at all.
@pytest.mark.parametrize(
    "viewset",
    [PlanViewSet, SubscriptionViewSet, SubscriptionEntitlementViewSet, SaasInvoiceViewSet],
)
def test_saas_viewsets_are_read_only(viewset):
    for write_action in ("create", "update", "partial_update", "destroy"):
        assert not hasattr(viewset, write_action), (
            f"{viewset.__name__}.{write_action} exists — billing state is "
            f"writable over the API (payment-bypass risk)."
        )
