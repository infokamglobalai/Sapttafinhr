"""Customer billing portal — "my subscription" for the signed-in workspace.

Mounted on the TENANT url conf, so django-tenants' TenantMainMiddleware has
resolved `request.tenant` from the subdomain. saas models are SHARED (public
schema), so we can read the tenant's Subscription / entitlements / invoices
directly. This fills the "no my-subscription endpoint" gap: the SPA no longer
has to infer products from the global subscription list.
"""
from __future__ import annotations

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.http import HttpResponse

from .invoice_docs import render_invoice_html, render_invoice_pdf
from .models import SaasInvoice, Subscription, SubscriptionEntitlement


def _tenant_for_request(request):
    """Resolve customer tenant from subdomain or owner billing_email."""
    tenant = getattr(request, "tenant", None)
    if tenant and tenant.schema_name != "public":
        return tenant
    from apps.core.models import Tenant

    email = getattr(request.user, "email", "")
    if not email:
        return tenant
    return (
        Tenant.objects.exclude(schema_name="public")
        .filter(billing_email__iexact=email)
        .order_by("created_on")
        .first()
    )


class EntitlementOut(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionEntitlement
        fields = ("product", "status", "current_period_end")


class SaasInvoiceOut(serializers.ModelSerializer):
    class Meta:
        model = SaasInvoice
        fields = (
            "id", "number", "period_start", "period_end",
            "taxable_amount", "cgst", "sgst", "igst", "tax_rate", "sac_code",
            "place_of_supply", "customer_gstin", "amount",
            "due_date", "status", "paid_at",
        )


class MySubscriptionView(APIView):
    """GET /api/v1/saas/my-subscription/ — current workspace's subscription."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = _tenant_for_request(request)
        if tenant is None or tenant.schema_name == "public":
            return Response(
                {"detail": "No workspace found for this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sub = (
            Subscription.objects.select_related("plan")
            .prefetch_related("entitlements", "invoices")
            .filter(tenant=tenant)
            .first()
        )
        if sub is None:
            return Response({"detail": "No subscription found for this workspace."}, status=status.HTTP_404_NOT_FOUND)

        products = [
            e.product for e in sub.entitlements.all()
            if e.status in SubscriptionEntitlement.ACTIVE_STATUSES
        ]
        invoices = sub.invoices.order_by("-period_end")

        return Response({
            "workspace": tenant.schema_name,
            "company": tenant.name,
            "plan": {
                "code": sub.plan.code,
                "name": sub.plan.name,
                "monthly_price": sub.plan.monthly_price,
                "annual_price": sub.plan.annual_price,
            },
            "status": sub.status,
            "is_active": sub.is_commercially_active,
            "trial_ends_at": sub.trial_ends_at,
            "current_period_start": sub.current_period_start,
            "current_period_end": sub.current_period_end,
            "cancelled_at": sub.cancelled_at,
            "products": products,
            "entitlements": EntitlementOut(sub.entitlements.all(), many=True).data,
            "invoices": SaasInvoiceOut(invoices, many=True).data,
        })


class MyInvoicePdfView(APIView):
    """GET /api/v1/saas/my-subscription/invoices/<id>/pdf/ — download GST invoice."""

    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id: int):
        tenant = _tenant_for_request(request)
        if tenant is None or tenant.schema_name == "public":
            return Response({"detail": "No workspace found."}, status=status.HTTP_400_BAD_REQUEST)

        sub = Subscription.objects.filter(tenant=tenant).first()
        if not sub:
            return Response({"detail": "No subscription."}, status=status.HTTP_404_NOT_FOUND)

        inv = SaasInvoice.objects.filter(id=invoice_id, subscription=sub).first()
        if not inv:
            return Response({"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        fmt = (request.query_params.get("format") or "pdf").lower()
        if fmt == "html":
            return HttpResponse(render_invoice_html(inv), content_type="text/html; charset=utf-8")

        pdf = render_invoice_pdf(inv)
        if pdf[:4] == b"%PDF":
            resp = HttpResponse(pdf, content_type="application/pdf")
            resp["Content-Disposition"] = f'attachment; filename="{inv.number}.pdf"'
            return resp
        return HttpResponse(pdf, content_type="text/html; charset=utf-8")
