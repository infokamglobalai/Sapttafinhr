from rest_framework import viewsets
from rest_framework import serializers as s

from .models import Plan, SaasInvoice, Subscription, SubscriptionEntitlement


class PlanSer(s.ModelSerializer):
    class Meta: model = Plan; fields = "__all__"


class EntitlementSer(s.ModelSerializer):
    class Meta: model = SubscriptionEntitlement; fields = "__all__"


class SubSer(s.ModelSerializer):
    tenant_name = s.CharField(source="tenant.name", read_only=True)
    plan_code = s.CharField(source="plan.code", read_only=True)
    entitlements = EntitlementSer(many=True, read_only=True)
    class Meta: model = Subscription; fields = "__all__"


class InvSer(s.ModelSerializer):
    class Meta: model = SaasInvoice; fields = "__all__"


# All SaaS billing state is server-managed: plans are a catalog, and
# subscriptions/entitlements/invoices are mutated ONLY by signup, the payment
# webhook, and activate_subscription_for_tenant(). The browser never legitimately
# writes them, so these are ReadOnlyModelViewSets — a tenant user PATCHing their
# own subscription to ACTIVE (payment bypass) or rewriting a Plan's price now gets
# 405. Privileged changes go through the Django admin / internal code paths.
class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSer


# These viewsets live on the PUBLIC schema and serve every tenant, so a plain
# `queryset = ...all()` would expose all tenants' billing data to any
# authenticated user. Each scopes to the caller's own tenant (matched via
# Tenant.billing_email); platform staff (is_staff) see everything. The
# class-level `queryset` is kept only so the DefaultRouter can derive a basename;
# get_queryset() is what actually serves data. (See H1 in the prod-readiness plan;
# the robust per-user tenant binding is the H2 JWT-claim follow-up.)
def _own_tenant_filter(view, qs, tenant_path: str):
    """Return qs unfiltered for staff, else scoped to the caller's tenant."""
    user = view.request.user
    if getattr(user, "is_staff", False):
        return qs
    return qs.filter(**{f"{tenant_path}__billing_email__iexact": user.email})


class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubSer
    filterset_fields = ("status",)

    def get_queryset(self):
        qs = Subscription.objects.select_related("tenant", "plan").prefetch_related("entitlements").order_by("id")
        return _own_tenant_filter(self, qs, "tenant")


class SubscriptionEntitlementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SubscriptionEntitlement.objects.select_related("subscription", "subscription__tenant").all()
    serializer_class = EntitlementSer
    filterset_fields = ("subscription", "product", "status")

    def get_queryset(self):
        qs = SubscriptionEntitlement.objects.select_related(
            "subscription", "subscription__tenant"
        ).order_by("id")
        return _own_tenant_filter(self, qs, "subscription__tenant")


class SaasInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SaasInvoice.objects.all()
    serializer_class = InvSer
    filterset_fields = ("subscription", "status")

    def get_queryset(self):
        qs = SaasInvoice.objects.select_related(
            "subscription", "subscription__tenant"
        ).order_by("id")
        return _own_tenant_filter(self, qs, "subscription__tenant")
