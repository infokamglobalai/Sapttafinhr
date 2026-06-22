"""Super-admin platform endpoints: company directory + global stats.

These power the Super Admin Dashboard (web SPA at /superadmin). They live in the
public/shared schema alongside the rest of the SaaS layer and are restricted to
platform super-admins.
"""
from decimal import Decimal

from django.db.models import Sum
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Tenant

from .models import ProductCode, SaasInvoice, Subscription, SubscriptionEntitlement
from .permissions import IsSuperAdmin

_PRODUCT_SLUG = {ProductCode.FIN: "finance", ProductCode.HR: "hrms"}


def _subscription_summary(sub: Subscription | None) -> dict | None:
    if sub is None:
        return None
    return {
        "id": sub.id,
        "status": sub.status,
        "is_active": sub.is_commercially_active,
        "plan_code": sub.plan.code,
        "plan_name": sub.plan.name,
        "monthly_price": str(sub.plan.monthly_price),
        "current_period_end": sub.current_period_end,
        "products": [
            _PRODUCT_SLUG[e.product]
            for e in sub.entitlements.all()
            if e.product in _PRODUCT_SLUG and e.status in SubscriptionEntitlement.ACTIVE_STATUSES
        ],
    }


class AdminCompaniesView(APIView):
    """GET /api/v1/saas/admin/companies/ → every tenant + its subscription."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        tenants = (
            Tenant.objects.exclude(schema_name="public")
            .select_related("subscription", "subscription__plan")
            .prefetch_related("subscription__entitlements")
            .order_by("-created_on")
        )
        data = [
            {
                "schema_name": t.schema_name,
                "name": t.name,
                "billing_email": t.billing_email,
                "created_on": t.created_on,
                "is_active": t.is_active,
                "subscription": _subscription_summary(getattr(t, "subscription", None)),
            }
            for t in tenants
        ]
        return Response(data)


class AdminStatsView(APIView):
    """GET /api/v1/saas/admin/stats/ → platform-wide KPIs for the dashboard."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        active_subs = Subscription.objects.filter(
            status__in=[Subscription.Status.ACTIVE, Subscription.Status.TRIAL]
        ).select_related("plan")

        mrr = sum((sub.plan.monthly_price for sub in active_subs), Decimal("0"))

        def ent_count(product):
            return SubscriptionEntitlement.objects.filter(
                product=product, status__in=SubscriptionEntitlement.ACTIVE_STATUSES
            ).count()

        paid_revenue = (
            SaasInvoice.objects.filter(status=SaasInvoice.Status.PAID).aggregate(t=Sum("amount"))["t"]
            or Decimal("0")
        )

        return Response(
            {
                "total_companies": Tenant.objects.exclude(schema_name="public").count(),
                "active_subscriptions": active_subs.count(),
                "pending_subscriptions": Subscription.objects.filter(
                    status=Subscription.Status.PENDING
                ).count(),
                "cancelled_subscriptions": Subscription.objects.filter(
                    status=Subscription.Status.CANCELLED
                ).count(),
                "mrr": str(mrr),
                "finance_seats": ent_count(ProductCode.FIN),
                "hr_seats": ent_count(ProductCode.HR),
                "open_invoices": SaasInvoice.objects.filter(status=SaasInvoice.Status.OPEN).count(),
                "paid_revenue": str(paid_revenue),
            }
        )
