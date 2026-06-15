"""Automation execution engine — evaluates triggers and fires actions."""
from __future__ import annotations

import logging
from datetime import date, timedelta

logger = logging.getLogger(__name__)


def run_automation_for_company(company_id: int) -> dict:
    """Run all active automation rules for a company. Returns counts."""
    from apps.notifications.models import AutomationRule, AutomationLog
    from django.utils import timezone

    rules = AutomationRule.objects.filter(company_id=company_id, is_active=True)
    results = {"fired": 0, "errors": 0}

    for rule in rules:
        try:
            items = _evaluate_trigger(rule, company_id)
            for item in items:
                _fire_action(rule, item, company_id)
                AutomationLog.objects.create(
                    rule=rule,
                    triggered_by=item.get("label", ""),
                    status="success",
                    detail=str(item),
                )
                results["fired"] += 1
            rule.last_run_at = timezone.now()
            rule.run_count += len(items)
            rule.save(update_fields=["last_run_at", "run_count"])
        except Exception as e:
            logger.exception("Automation rule %s failed", rule.id)
            from .automation import AutomationLog
            AutomationLog.objects.create(rule=rule, status="error", detail=str(e))
            results["errors"] += 1

    return results


def _evaluate_trigger(rule, company_id: int) -> list[dict]:
    """Evaluate a trigger rule and return matching items."""
    today = date.today()
    f = rule.trigger_filter or {}

    if rule.trigger == "invoice_overdue":
        from apps.billing.models import Invoice
        min_days = f.get("days_overdue_min", 1)
        max_days = f.get("days_overdue_max", 999)
        invoices = [
            i for i in Invoice.objects.filter(
                company_id=company_id,
                status=Invoice.Status.POSTED,
                due_date__lt=today,
            ).select_related("customer")
            if i.grand_total - i.amount_paid > 0
        ]
        result = []
        for inv in invoices:
            days = (today - inv.due_date).days
            if min_days <= days <= max_days:
                result.append({
                    "label": f"Invoice {inv.invoice_no}",
                    "invoice_no": inv.invoice_no,
                    "customer": inv.customer.name,
                    "customer_email": inv.customer.email,
                    "amount": str(inv.grand_total - inv.amount_paid),
                    "days_overdue": days,
                    "due_date": inv.due_date.isoformat(),
                })
        return result

    elif rule.trigger == "vendor_bill_due":
        from apps.procurement.models import VendorBill
        due_in = f.get("due_in_days", 3)
        target_date = today + timedelta(days=due_in)
        bills = VendorBill.objects.filter(
            company_id=company_id,
            status__in=["POSTED", "PARTIAL"],
            due_date=target_date,
        ).select_related("vendor")
        return [
            {
                "label": f"Bill {b.bill_no}",
                "bill_no": b.bill_no,
                "vendor": b.vendor.name,
                "amount": str(b.balance_due),
                "due_date": b.due_date.isoformat(),
            }
            for b in bills if b.balance_due > 0
        ]

    elif rule.trigger == "low_stock":
        from apps.inventory.models import StockLevel
        items = StockLevel.objects.filter(
            company_id=company_id,
        ).select_related("item")
        result = []
        for s in items:
            if hasattr(s.item, "reorder_level") and s.quantity <= s.item.reorder_level:
                result.append({
                    "label": f"Item {s.item.name}",
                    "item": s.item.name,
                    "quantity": str(s.quantity),
                    "reorder_level": str(s.item.reorder_level),
                })
        return result

    elif rule.trigger == "monthly_report":
        # Only fire on the 1st of the month
        if today.day == 1:
            return [{"label": f"Monthly report {today.strftime('%B %Y')}"}]
        return []

    return []


def _fire_action(rule, item: dict, company_id: int) -> None:
    """Execute the rule's action for a matched item."""
    c = rule.action_config or {}

    if rule.action == "send_notification":
        _notify(company_id, c.get("title", rule.name), c.get("body", str(item)), c.get("level", "INFO"))

    elif rule.action == "send_email":
        to = c.get("to") or item.get("customer_email") or item.get("vendor_email")
        if not to:
            return
        subject = _interpolate(c.get("subject", "Automation: {label}"), item)
        body = _interpolate(c.get("body", "Triggered by: {label}"), item)
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=True)
        except Exception:
            logger.exception("Automation email failed")

    elif rule.action == "webhook":
        url = c.get("url")
        if not url:
            return
        import requests
        from apps.core.net import UnsafeURLError, validate_outbound_url
        try:
            validate_outbound_url(url)  # SSRF guard — block internal/metadata targets
        except UnsafeURLError as exc:
            logger.warning("Automation webhook blocked unsafe URL %s: %s", url, exc)
            return
        try:
            requests.post(url, json={"rule": rule.name, "item": item}, timeout=10)
        except Exception:
            logger.exception("Automation webhook failed for %s", url)


def _notify(company_id: int, title: str, body: str, level: str) -> None:
    from apps.notifications.models import Notification
    from apps.identity.models import User
    from apps.core.models import Tenant
    try:
        tenant = Tenant.objects.exclude(schema_name="public").first()
        if not tenant:
            return
        for user in User.objects.filter(email__iexact=tenant.billing_email):
            Notification.objects.create(user=user, title=title, body=body, level=level)
    except Exception:
        pass


def _interpolate(template: str, data: dict) -> str:
    """Replace {key} placeholders in template with data values."""
    for k, v in data.items():
        template = template.replace(f"{{{k}}}", str(v))
    return template
