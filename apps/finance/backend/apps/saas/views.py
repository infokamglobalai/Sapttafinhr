from django.utils import timezone
from rest_framework import viewsets
from rest_framework import serializers as s
from rest_framework.decorators import action
from rest_framework.response import Response

from .audit import record_audit
from .models import Plan, ProductCode, SaasInvoice, Subscription, SubscriptionEntitlement
from .permissions import IsSuperAdmin


class PlanSer(s.ModelSerializer):
    class Meta: model = Plan; fields = "__all__"


class EntitlementSer(s.ModelSerializer):
    class Meta: model = SubscriptionEntitlement; fields = "__all__"


class SubSer(s.ModelSerializer):
    tenant_name = s.CharField(source="tenant.name", read_only=True)
    tenant_schema = s.CharField(source="tenant.schema_name", read_only=True)
    plan_code = s.CharField(source="plan.code", read_only=True)
    plan_name = s.CharField(source="plan.name", read_only=True)
    entitlements = EntitlementSer(many=True, read_only=True)
    class Meta: model = Subscription; fields = "__all__"


class InvSer(s.ModelSerializer):
    class Meta: model = SaasInvoice; fields = "__all__"


def products_for_plan(plan: Plan) -> list[str]:
    """Derive the product seats a plan grants, from its code (mirrors signup)."""
    code = (plan.code or "").lower()
    if "complete" in code or "combo" in code:
        return [ProductCode.FIN, ProductCode.HR]
    if "hrm" in code or code.startswith("hr"):
        return [ProductCode.HR]
    if "fin" in code or "account" in code:
        return [ProductCode.FIN]
    return [ProductCode.FIN]


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

    # Privileged super-admin operations for the platform-owner dashboard
    # (web SPA /superadmin). Standard CRUD stays disabled (ReadOnly); only
    # these explicit, is_staff-gated POST actions can mutate a subscription.
    @action(detail=True, methods=["post"], permission_classes=[IsSuperAdmin])
    def activate(self, request, pk=None):
        """Flip a subscription (and its entitlements) to ACTIVE for a billing period."""
        sub = self.get_object()
        from .billing import activate_subscription_for_tenant

        activate_subscription_for_tenant(sub.tenant.schema_name)
        sub.refresh_from_db()
        record_audit(request, "subscription.activate", target_schema=sub.tenant.schema_name,
                     target_label=sub.tenant.name, detail={"plan": sub.plan.code})
        return Response(SubSer(sub).data)

    @action(detail=True, methods=["post"], permission_classes=[IsSuperAdmin])
    def suspend(self, request, pk=None):
        """Cancel the subscription and suspend all its product entitlements."""
        sub = self.get_object()
        sub.status = Subscription.Status.CANCELLED
        sub.cancelled_at = timezone.now()
        sub.save(update_fields=["status", "cancelled_at"])
        sub.entitlements.update(status=SubscriptionEntitlement.Status.SUSPENDED)
        record_audit(request, "subscription.suspend", target_schema=sub.tenant.schema_name,
                     target_label=sub.tenant.name, detail={})
        return Response(SubSer(sub).data)

    @action(detail=True, methods=["post"], permission_classes=[IsSuperAdmin])
    def change_plan(self, request, pk=None):
        """Move the subscription to a different plan and re-sync product seats."""
        sub = self.get_object()
        plan_id = request.data.get("plan_id")
        try:
            plan = Plan.objects.get(pk=plan_id)
        except Plan.DoesNotExist:
            return Response({"detail": "Plan not found."}, status=404)

        sub.plan = plan
        sub.save(update_fields=["plan"])

        # Re-sync entitlements to the new plan's products, preserving the
        # subscription's current active/pending status.
        ent_status = (
            SubscriptionEntitlement.Status.ACTIVE
            if sub.is_commercially_active
            else SubscriptionEntitlement.Status.PENDING
        )
        wanted = set(products_for_plan(plan))
        sub.entitlements.exclude(product__in=wanted).delete()
        for product in wanted:
            sub.entitlements.update_or_create(
                product=product, defaults={"status": ent_status}
            )
        sub.refresh_from_db()
        record_audit(request, "subscription.change_plan", target_schema=sub.tenant.schema_name,
                     target_label=sub.tenant.name, detail={"plan": plan.code})
        return Response(SubSer(sub).data)


class PlanAdminViewSet(viewsets.ModelViewSet):
    """Full CRUD on pricing plans — super-admin only (web /superadmin Plans screen).

    Distinct from the public read-only PlanViewSet: this is the catalog editor.
    Plans are never hard-deleted from under live subscriptions; ``destroy`` just
    retires the plan (is_active=False) so historical rows keep resolving.
    """

    queryset = Plan.objects.all().order_by("monthly_price")
    serializer_class = PlanSer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        plan = serializer.save()
        record_audit(self.request, "plan.create", target_label=plan.code, detail={"name": plan.name})

    def perform_update(self, serializer):
        plan = serializer.save()
        record_audit(self.request, "plan.update", target_label=plan.code,
                     detail={"monthly_price": str(plan.monthly_price)})

    def destroy(self, request, *args, **kwargs):
        plan = self.get_object()
        if Subscription.objects.filter(plan=plan).exists():
            plan.is_active = False
            plan.save(update_fields=["is_active"])
            record_audit(request, "plan.retire", target_label=plan.code, detail={})
            return Response(PlanSer(plan).data)
        record_audit(request, "plan.delete", target_label=plan.code, detail={})
        plan.delete()
        return Response(status=204)


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
