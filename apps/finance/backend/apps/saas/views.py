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


class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSer


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.select_related("tenant", "plan").prefetch_related("entitlements").all()
    serializer_class = SubSer
    filterset_fields = ("status",)


class SubscriptionEntitlementViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionEntitlement.objects.select_related("subscription", "subscription__tenant").all()
    serializer_class = EntitlementSer
    filterset_fields = ("subscription", "product", "status")


class SaasInvoiceViewSet(viewsets.ModelViewSet):
    queryset = SaasInvoice.objects.all()
    serializer_class = InvSer
    filterset_fields = ("subscription", "status")
