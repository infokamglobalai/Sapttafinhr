"""Super-admin observability — the "is the platform healthy & what's happening?" layer.

Phase 9 of the /superadmin build. All is_staff-gated (IsSuperAdmin). Read-only
except the explicit "run job now" trigger, which is audited. No new models: this
surfaces data that already exists (two audit logs, webhook receipts, invoices,
Celery tasks) plus live infra probes.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import AuditLog

from .audit import record_audit
from .models import (
    ProcessedWebhookEvent,
    SaasAuditLog,
    SaasInvoice,
    Subscription,
    SubscriptionEntitlement,
    ProductCode,
)
from .permissions import IsSuperAdmin

logger = logging.getLogger(__name__)


# ───────────────────────────── 9a. Unified activity feed ─────────────────────────────
class AdminActivityView(APIView):
    """GET /api/v1/saas/admin/activity/ — merged feed of both platform audit logs.

    Unions `saas.SaasAuditLog` (console actions) and the pre-existing
    `core.AuditLog` (automated/control-plane actions, e.g. Celery dunning) into a
    single time-ordered stream. Filters: actor, action, target/schema, since.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        actor = (request.query_params.get("actor") or "").strip()
        action = (request.query_params.get("action") or "").strip()
        target = (request.query_params.get("target") or request.query_params.get("schema") or "").strip()
        since = (request.query_params.get("since") or "").strip()
        try:
            limit = min(int(request.query_params.get("limit", 100)), 500)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except (TypeError, ValueError):
            limit, offset = 100, 0
        window = offset + limit

        saas_qs = SaasAuditLog.objects.all()
        core_qs = AuditLog.objects.all()
        if actor:
            saas_qs = saas_qs.filter(actor_email__icontains=actor)
            core_qs = core_qs.filter(actor_email__icontains=actor)
        if action:
            saas_qs = saas_qs.filter(action__icontains=action)
            core_qs = core_qs.filter(action__icontains=action)
        if target:
            saas_qs = saas_qs.filter(target_schema=target)
            core_qs = core_qs.filter(target=target)
        if since:
            try:
                dt = datetime.fromisoformat(since)
                saas_qs = saas_qs.filter(created_at__gte=dt)
                core_qs = core_qs.filter(created_at__gte=dt)
            except ValueError:
                pass

        rows = []
        for a in saas_qs[:window]:
            rows.append({
                "source": "console", "actor": a.actor_email, "action": a.action,
                "target": a.target_schema, "label": a.target_label,
                "detail": a.detail, "at": a.created_at,
            })
        for a in core_qs[:window]:
            rows.append({
                "source": "system", "actor": a.actor_email, "action": a.action,
                "target": a.target, "label": "",
                "detail": a.detail, "at": a.created_at,
            })
        rows.sort(key=lambda r: r["at"], reverse=True)
        return Response({"count": len(rows), "results": rows[offset:offset + limit]})


# ───────────────────────────── 9b. Payments & webhooks log ─────────────────────────────
class AdminPaymentsView(APIView):
    """GET /api/v1/saas/admin/payments/ — SaaS invoices + inbound webhook receipts."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        invoices = (
            SaasInvoice.objects.select_related("subscription__tenant")
            .order_by("-created_at")[:100]
        )
        inv_rows = [{
            "id": i.id, "number": i.number,
            "company": i.subscription.tenant.name if i.subscription_id else "",
            "schema": i.subscription.tenant.schema_name if i.subscription_id else "",
            "amount": str(i.amount), "status": i.status,
            "period_start": i.period_start, "period_end": i.period_end,
            "paid_at": i.paid_at, "created_at": i.created_at,
        } for i in invoices]

        events = ProcessedWebhookEvent.objects.order_by("-received_at")[:100]
        evt_rows = [{"id": e.id, "event_id": e.event_id, "received_at": e.received_at} for e in events]

        return Response({
            "invoices": inv_rows,
            "webhook_events": evt_rows,
            "summary": {
                "paid": SaasInvoice.objects.filter(status=SaasInvoice.Status.PAID).count(),
                "open": SaasInvoice.objects.filter(status=SaasInvoice.Status.OPEN).count(),
                "void": SaasInvoice.objects.filter(status=SaasInvoice.Status.VOID).count(),
                "webhook_events": ProcessedWebhookEvent.objects.count(),
            },
        })


# ───────────────────────────── 9c. System health ─────────────────────────────
def _probe(fn) -> dict:
    """Run a health probe defensively; never raise. Returns status + latency_ms."""
    start = time.monotonic()
    try:
        detail = fn() or ""
        return {"status": "up", "latency_ms": round((time.monotonic() - start) * 1000, 1), "detail": str(detail)}
    except Exception as e:  # noqa: BLE001 — a probe failure must not 500 the panel
        return {"status": "down", "latency_ms": round((time.monotonic() - start) * 1000, 1), "detail": str(e)[:200]}


def _check_db() -> str:
    with connection.cursor() as c:
        c.execute("SELECT 1")
        c.fetchone()
    return "SELECT 1 ok"


def _check_redis() -> str:
    import redis
    client = redis.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=1, socket_timeout=1)
    client.ping()
    return "PING ok"


def _check_worker() -> str:
    from config.celery import app
    replies = app.control.ping(timeout=1.0) or []
    if not replies:
        raise RuntimeError("no workers responded")
    return f"{len(replies)} worker(s)"


def _check_hr() -> str:
    base = getattr(settings, "HR_INTERNAL_BASE_URL", "")
    if not base:
        raise RuntimeError("HR_INTERNAL_BASE_URL unset")
    import requests
    # Reachability only: any HTTP response means HR is up. Don't follow the
    # login redirect (it points at the public host, unreachable server-side).
    r = requests.get(base.rstrip("/") + "/", headers={"Host": "localhost"},
                     timeout=2, allow_redirects=False)
    return f"HTTP {r.status_code}"


def _hr_headcount_rollup() -> dict:
    """Best-effort total employees across HR-entitled tenants. Cached 5 min, capped."""
    cached = cache.get("admin_hr_headcount")
    if cached is not None:
        return cached
    result = {"total_employees": 0, "tenants_counted": 0, "reachable": False}
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    base = getattr(settings, "HR_INTERNAL_BASE_URL", "")
    if not (secret and base):
        cache.set("admin_hr_headcount", result, 300)
        return result
    schemas = list(
        SubscriptionEntitlement.objects.filter(
            product=ProductCode.HR, status__in=SubscriptionEntitlement.ACTIVE_STATUSES
        ).select_related("subscription__tenant")
        .values_list("subscription__tenant__schema_name", flat=True)
        .distinct()[:60]
    )
    try:
        import requests
        for schema in schemas:
            if not schema:
                continue
            try:
                r = requests.get(
                    base.rstrip("/") + "/internal/stats/",
                    params={"workspace": schema},
                    headers={"Authorization": f"Bearer {secret}", "Host": "localhost"},
                    timeout=2,
                )
                if r.status_code == 200:
                    result["total_employees"] += int(r.json().get("total_employees", 0) or 0)
                    result["tenants_counted"] += 1
                    result["reachable"] = True
            except Exception:  # noqa: BLE001 — skip a slow/down tenant
                continue
    except Exception:  # noqa: BLE001
        pass
    cache.set("admin_hr_headcount", result, 300)
    return result


class AdminHealthView(APIView):
    """GET /api/v1/saas/admin/health/ — infra probes + HR headcount rollup."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        services = {
            "postgres": _probe(_check_db),
            "redis": _probe(_check_redis),
            "celery_worker": _probe(_check_worker),
            "fin_backend": {"status": "up", "latency_ms": 0.0, "detail": "serving"},
            "hr_backend": _probe(_check_hr),
        }
        overall = "up" if all(s["status"] == "up" for s in services.values()) else "degraded"
        payload = {"overall": overall, "services": services, "checked_at": timezone.now()}
        if request.query_params.get("hr_rollup"):
            payload["hr_headcount"] = _hr_headcount_rollup()
        return Response(payload)


# ───────────────────────────── 9d. Automation / jobs ─────────────────────────────
_RUNNABLE = {"expire_overdue_subscriptions"}


class AdminJobsView(APIView):
    """GET → beat schedule + live candidate counts; POST run/ → run a task now."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        schedule = getattr(settings, "CELERY_BEAT_SCHEDULE", {}) or {}
        jobs = []
        for name, cfg in schedule.items():
            jobs.append({
                "name": name,
                "task": cfg.get("task", ""),
                "schedule": str(cfg.get("schedule", "")),
            })

        today = timezone.now().date()
        grace_days = getattr(settings, "SUBSCRIPTION_GRACE_DAYS", 7)
        candidates = {
            "active_lapsed": Subscription.objects.filter(
                status=Subscription.Status.ACTIVE,
                current_period_end__isnull=False,
                current_period_end__lt=today,
            ).count(),
            "past_due_to_cancel": Subscription.objects.filter(
                status=Subscription.Status.PAST_DUE,
                updated_at__date__lt=today - timedelta(days=grace_days),
            ).count(),
        }
        last_runs = list(
            AuditLog.objects.filter(action__startswith="subscription.auto")
            .order_by("-created_at")[:5]
            .values("action", "target", "created_at")
        )
        return Response({"jobs": jobs, "candidates": candidates, "recent_auto_actions": last_runs})

    def post(self, request):
        task = (request.data.get("task") or "").strip()
        if task not in _RUNNABLE:
            return Response({"detail": f"Unknown or non-runnable task: {task}"}, status=400)
        from .tasks import expire_overdue_subscriptions

        changed = expire_overdue_subscriptions()
        record_audit(request, "job.run", target_label=task, detail={"changed": changed})
        return Response({"task": task, "changed": changed})
