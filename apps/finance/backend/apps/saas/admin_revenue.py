"""Super-admin revenue analytics, dunning queue, and CSV exports (Phase 8)."""
from __future__ import annotations

import csv
from datetime import date, timedelta
from decimal import Decimal

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .audit import record_audit
from .models import SaasInvoice, Subscription, SubscriptionEntitlement
from .permissions import IsSuperAdmin


class AdminRevenueView(APIView):
    """GET /api/v1/saas/admin/revenue/ — MRR/ARR, paid revenue, GST, churn, trend."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        active = Subscription.objects.filter(
            status__in=[Subscription.Status.ACTIVE, Subscription.Status.TRIAL]
        ).select_related("plan")
        mrr = sum((s.plan.monthly_price for s in active), Decimal("0"))

        paid = SaasInvoice.objects.filter(status=SaasInvoice.Status.PAID)
        paid_revenue = sum((i.amount for i in paid), Decimal("0"))
        gst_collected = sum((i.cgst + i.sgst + i.igst for i in paid), Decimal("0"))

        today = timezone.now()
        cancelled_this_month = Subscription.objects.filter(
            status=Subscription.Status.CANCELLED,
            cancelled_at__year=today.year, cancelled_at__month=today.month,
        ).count()
        active_now = active.count()
        churn_rate = (
            round(cancelled_this_month / (active_now + cancelled_this_month) * 100, 1)
            if (active_now + cancelled_this_month) else 0.0
        )

        # Paid revenue by month (last 12), keyed by paid_at (fallback created_at).
        buckets: dict[str, Decimal] = {}
        for inv in paid:
            when = inv.paid_at or inv.created_at
            key = f"{when.year}-{when.month:02d}"
            buckets[key] = buckets.get(key, Decimal("0")) + inv.amount
        cursor = (today.date().replace(day=1) - timedelta(days=365)).replace(day=1)
        revenue_by_month = []
        for _ in range(13):
            key = f"{cursor.year}-{cursor.month:02d}"
            revenue_by_month.append({"month": key, "amount": str(buckets.get(key, Decimal("0")))})
            cursor = (cursor.replace(day=28) + timedelta(days=7)).replace(day=1)

        return Response({
            "mrr": str(mrr),
            "arr": str(mrr * 12),
            "paid_revenue": str(paid_revenue),
            "gst_collected": str(gst_collected),
            "active_subscriptions": active_now,
            "cancelled_this_month": cancelled_this_month,
            "churn_rate": churn_rate,
            "revenue_by_month": revenue_by_month,
        })


class AdminDunningView(APIView):
    """GET /api/v1/saas/admin/dunning/ — past-due + expiring-soon subscriptions."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        today = date.today()
        soon = today + timedelta(days=int(request.query_params.get("within", 7)))
        subs = (
            Subscription.objects.select_related("tenant", "plan")
            .filter(status__in=[Subscription.Status.PAST_DUE, Subscription.Status.ACTIVE])
            .filter(current_period_end__isnull=False, current_period_end__lte=soon)
            .order_by("current_period_end")
        )
        rows = [{
            "id": s.id,
            "company": s.tenant.name,
            "schema": s.tenant.schema_name,
            "billing_email": s.tenant.billing_email,
            "status": s.status,
            "plan": s.plan.name,
            "current_period_end": s.current_period_end,
            "days_overdue": (today - s.current_period_end).days,
        } for s in subs]
        return Response({"count": len(rows), "results": rows})


class AdminSubscriptionRemindView(APIView):
    """POST /api/v1/saas/admin/subscriptions/<id>/remind/ — send a dunning email."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, sub_id):
        sub = Subscription.objects.select_related("tenant").filter(pk=sub_id).first()
        if not sub:
            return Response({"detail": "Subscription not found."}, status=404)
        from .tasks import _email
        _email(
            sub,
            "Action needed: renew your Saptta subscription",
            "Your Saptta subscription needs attention. Please renew to keep your "
            "workspace active. Contact support if you need help.",
        )
        record_audit(request, "subscription.remind", target_schema=sub.tenant.schema_name,
                     target_label=sub.tenant.name, detail={})
        return Response({"status": "sent", "to": sub.tenant.billing_email})


class AdminSubscriptionExtendView(APIView):
    """POST /api/v1/saas/admin/subscriptions/<id>/extend/ {days} — extend the paid period."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, sub_id):
        sub = Subscription.objects.select_related("tenant").filter(pk=sub_id).first()
        if not sub:
            return Response({"detail": "Subscription not found."}, status=404)
        try:
            days = max(int(request.data.get("days", 30)), 1)
        except (TypeError, ValueError):
            days = 30
        base = sub.current_period_end or date.today()
        sub.current_period_end = base + timedelta(days=days)
        if sub.status == Subscription.Status.PAST_DUE:
            sub.status = Subscription.Status.ACTIVE
            sub.entitlements.update(status=SubscriptionEntitlement.Status.ACTIVE)
        sub.save(update_fields=["current_period_end", "status", "updated_at"])
        record_audit(request, "subscription.extend", target_schema=sub.tenant.schema_name,
                     target_label=sub.tenant.name, detail={"days": days, "until": str(sub.current_period_end)})
        return Response({"status": "extended", "current_period_end": sub.current_period_end, "subscription_status": sub.status})


class AdminInvoiceExportView(APIView):
    """GET /api/v1/saas/admin/exports/invoices.csv — all SaaS invoices as CSV."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        resp = HttpResponse(content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="saas_invoices.csv"'
        w = csv.writer(resp)
        w.writerow(["number", "company", "status", "period_start", "period_end",
                    "taxable", "cgst", "sgst", "igst", "total", "paid_at"])
        for i in SaasInvoice.objects.select_related("subscription__tenant").order_by("-created_at"):
            company = i.subscription.tenant.name if i.subscription_id else ""
            w.writerow([i.number, company, i.status, i.period_start, i.period_end,
                        i.taxable_amount, i.cgst, i.sgst, i.igst, i.amount, i.paid_at or ""])
        record_audit(request, "export.invoices", detail={})
        return resp


class AdminGstExportView(APIView):
    """GET /api/v1/saas/admin/exports/gst.csv — GST summary of PAID SaaS invoices."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        resp = HttpResponse(content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="saas_gst_summary.csv"'
        w = csv.writer(resp)
        w.writerow(["number", "date", "gstin", "place_of_supply", "sac",
                    "taxable", "cgst", "sgst", "igst", "total"])
        for i in SaasInvoice.objects.filter(status=SaasInvoice.Status.PAID).order_by("period_end"):
            w.writerow([i.number, i.period_end, i.customer_gstin, i.place_of_supply, i.sac_code,
                        i.taxable_amount, i.cgst, i.sgst, i.igst, i.amount])
        record_audit(request, "export.gst", detail={})
        return resp
