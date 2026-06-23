"""Internal billing JSON for HR — server-to-server only.

HR calls these endpoints with SSO_SHARED_SECRET so workspace owners can see
subscription status, renewal dates, and invoice history inside the HR app without
leaving their account.
"""
from __future__ import annotations

import hmac

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import SaasInvoice, Subscription, SubscriptionEntitlement


def _authorized(request) -> bool:
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        return False
    header = request.headers.get("Authorization", "")
    presented = header[7:] if header.startswith("Bearer ") else ""
    return bool(presented) and hmac.compare_digest(presented, secret)


def _vendor_block() -> dict:
    return {
        "legal_name": getattr(settings, "SAAS_VENDOR_LEGAL_NAME", "Saptta Technologies Private Limited"),
        "gstin": getattr(settings, "SAAS_VENDOR_GSTIN", ""),
        "address": getattr(settings, "SAAS_VENDOR_ADDRESS", ""),
        "state_code": getattr(settings, "SAAS_VENDOR_STATE_CODE", "27"),
    }


def _invoice_payload(inv: SaasInvoice) -> dict:
    return {
        "id": inv.id,
        "number": inv.number,
        "period_start": inv.period_start.isoformat(),
        "period_end": inv.period_end.isoformat(),
        "taxable_amount": str(inv.taxable_amount),
        "cgst": str(inv.cgst),
        "sgst": str(inv.sgst),
        "igst": str(inv.igst),
        "tax_rate": str(inv.tax_rate),
        "sac_code": inv.sac_code,
        "place_of_supply": inv.place_of_supply,
        "customer_gstin": inv.customer_gstin,
        "amount": str(inv.amount),
        "due_date": inv.due_date.isoformat(),
        "status": inv.status,
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
    }


def _subscription_payload(tenant, sub: Subscription) -> dict:
    products = [
        e.product for e in sub.entitlements.all()
        if e.status in SubscriptionEntitlement.ACTIVE_STATUSES
    ]
    invoices = sub.invoices.order_by("-period_end")
    return {
        "workspace": tenant.schema_name,
        "company": tenant.name,
        "plan": {
            "code": sub.plan.code,
            "name": sub.plan.name,
            "monthly_price": str(sub.plan.monthly_price),
            "annual_price": str(sub.plan.annual_price),
        },
        "status": sub.status,
        "is_active": sub.is_commercially_active,
        "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        "current_period_start": (
            sub.current_period_start.isoformat() if sub.current_period_start else None
        ),
        "current_period_end": (
            sub.current_period_end.isoformat() if sub.current_period_end else None
        ),
        "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
        "products": products,
        "invoices": [_invoice_payload(inv) for inv in invoices],
        "vendor": _vendor_block(),
    }


def _lookup(workspace: str):
    from apps.core.models import Tenant

    tenant = Tenant.objects.filter(schema_name=workspace).first()
    if not tenant:
        return None, None
    sub = (
        Subscription.objects.select_related("plan")
        .prefetch_related("entitlements", "invoices")
        .filter(tenant=tenant)
        .first()
    )
    return tenant, sub


@require_http_methods(["GET"])
def billing_snapshot(request):
    """GET /api/v1/saas/internal/billing-snapshot/?workspace=<subdomain>"""
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    workspace = (request.GET.get("workspace") or "").strip().lower()
    if not workspace:
        return JsonResponse({"detail": "workspace is required."}, status=400)

    tenant, sub = _lookup(workspace)
    if not tenant:
        return JsonResponse({"detail": "Unknown workspace."}, status=404)
    if not sub:
        return JsonResponse({"detail": "No subscription found for this workspace."}, status=404)

    return JsonResponse(_subscription_payload(tenant, sub))


@require_http_methods(["GET"])
def invoice_detail(request, invoice_id: int):
    """GET /api/v1/saas/internal/invoices/<id>/?workspace=<subdomain>"""
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    workspace = (request.GET.get("workspace") or "").strip().lower()
    if not workspace:
        return JsonResponse({"detail": "workspace is required."}, status=400)

    tenant, sub = _lookup(workspace)
    if not tenant or not sub:
        return JsonResponse({"detail": "Unknown workspace or subscription."}, status=404)

    inv = SaasInvoice.objects.filter(id=invoice_id, subscription=sub).first()
    if not inv:
        return JsonResponse({"detail": "Invoice not found."}, status=404)

    return JsonResponse({
        "workspace": workspace,
        "company": tenant.name,
        "invoice": _invoice_payload(inv),
        "plan_name": sub.plan.name,
        "vendor": _vendor_block(),
    })
