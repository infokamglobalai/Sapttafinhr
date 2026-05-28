"""Celery tasks for billing automation.

- run_recurring_invoices : materialize subscription invoices
- generate_einvoice_for_invoice : enqueued by post_save signal when an invoice is POSTED
- send_overdue_reminders : daily — emails customers with past-due invoices, escalates
"""
from datetime import date as _date, timedelta
from decimal import Decimal

from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context

from apps.core.tenants import iter_tenant_schemas

from .models import Invoice, RecurringInvoiceTemplate
from .services import InvoiceService


# ---------- Recurring invoices ----------

def _next_date(base: _date, frequency: str) -> _date:
    if frequency == "WEEKLY":
        return base + timedelta(days=7)
    if frequency == "MONTHLY":
        m = base.month + 1
        y = base.year + (1 if m > 12 else 0)
        m = ((m - 1) % 12) + 1
        return base.replace(year=y, month=m)
    if frequency == "QUARTERLY":
        return _next_date(_next_date(_next_date(base, "MONTHLY"), "MONTHLY"), "MONTHLY")
    if frequency == "YEARLY":
        return base.replace(year=base.year + 1)
    return base


@shared_task
def run_recurring_invoices():
    today = _date.today()
    total = 0
    for tenant in iter_tenant_schemas():
        with schema_context(tenant.schema_name):
            qs = RecurringInvoiceTemplate.objects.filter(
                is_active=True, next_run_date__lte=today,
            )
            for tmpl in qs:
                if tmpl.end_date and tmpl.end_date < today:
                    tmpl.is_active = False
                    tmpl.save(update_fields=["is_active", "updated_at"])
                    continue

                last = Invoice.objects.filter(company=tmpl.company).order_by("-id").first()
                next_no = f"INV-AUTO-{(last.id if last else 0) + 1:06d}"

                payload = tmpl.template_json
                lines_data = payload.get("lines", [])

                invoice = Invoice(
                    company=tmpl.company, fiscal_year=tmpl.fiscal_year,
                    invoice_no=next_no, date=today,
                    due_date=today + timedelta(days=payload.get("due_days", 30)),
                    customer=tmpl.customer, place_of_supply=tmpl.place_of_supply,
                    notes=f"Auto-generated from recurring: {tmpl.name}",
                )
                inv = InvoiceService().create_and_post(
                    invoice=invoice, lines_data=lines_data, user=None,
                )
                tmpl.last_invoice = inv
                tmpl.runs_completed += 1
                tmpl.next_run_date = _next_date(today, tmpl.frequency)
                tmpl.save(update_fields=["last_invoice", "runs_completed",
                                          "next_run_date", "updated_at"])
                total += 1
    return {"materialized": total}


# ---------- E-Invoice auto-trigger ----------

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_einvoice_for_invoice(self, schema_name: str, invoice_id: int):
    """Called from post_save signal when invoice transitions to POSTED."""
    from apps.taxation.services import generate_einvoice
    try:
        with schema_context(schema_name):
            invoice = Invoice.objects.select_related("company").get(pk=invoice_id)
            if invoice.status != Invoice.Status.POSTED:
                return {"skipped": "not posted"}
            if hasattr(invoice, "einvoice"):
                return {"skipped": "already has IRN"}
            rec = generate_einvoice(invoice)
            return {"irn": rec.irn, "ack": rec.ack_no}
    except Exception as exc:
        raise self.retry(exc=exc)


# ---------- E-Way Bill auto-trigger ----------

EWAY_THRESHOLD = Decimal("50000")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_ewb_for_invoice(self, schema_name: str, invoice_id: int):
    """Generate E-Way Bill if invoice has goods lines and total > ₹50k.
    Uses 100km default distance — real-world systems would compute from address geocoding.
    """
    from apps.taxation.services import generate_eway_bill
    try:
        with schema_context(schema_name):
            invoice = Invoice.objects.select_related("company").get(pk=invoice_id)
            if invoice.status != Invoice.Status.POSTED:
                return {"skipped": "not posted"}
            if invoice.grand_total < EWAY_THRESHOLD:
                return {"skipped": f"under threshold {EWAY_THRESHOLD}"}
            has_goods = invoice.lines.filter(item__kind="GOODS").exists()
            if not has_goods:
                return {"skipped": "no goods lines"}
            if invoice.eway_bills.filter(status="ACTIVE").exists():
                return {"skipped": "already has active EWB"}
            rec = generate_eway_bill(invoice, distance_km=100)
            return {"eway_no": rec.eway_no, "valid_until": rec.valid_until.isoformat()}
    except Exception as exc:
        raise self.retry(exc=exc)


# ---------- Overdue reminders ----------

REMINDER_STAGES_DAYS = [0, 3, 7, 15, 30]  # days past due at which we re-remind


@shared_task
def send_overdue_reminders():
    """Daily — find invoices past due with balance > 0, send escalating reminders."""
    from apps.notifications.channels import send_email
    today = _date.today()
    now = timezone.now()
    sent = 0

    for tenant in iter_tenant_schemas():
        with schema_context(tenant.schema_name):
            invoices = Invoice.objects.filter(
                status=Invoice.Status.POSTED,
                due_date__lt=today,
            ).select_related("customer", "company")

            for inv in invoices:
                if inv.balance_due <= 0:
                    continue
                if not inv.customer.email:
                    continue

                days_overdue = (today - inv.due_date).days
                # Find the highest stage we've passed but not yet reminded for
                stage = max((s for s in REMINDER_STAGES_DAYS if s <= days_overdue), default=None)
                if stage is None:
                    continue

                # Avoid double-reminding same stage: skip if a reminder went out in last 48h
                if inv.last_reminder_at and (now - inv.last_reminder_at) < timedelta(hours=48):
                    continue

                subject = f"Payment reminder: invoice {inv.invoice_no} ({days_overdue} days overdue)"
                body = (
                    f"Hi {inv.customer.name},\n\n"
                    f"This is a reminder that invoice {inv.invoice_no} dated {inv.date} "
                    f"for ₹{inv.grand_total} is now {days_overdue} days past due "
                    f"(was due on {inv.due_date}).\n\n"
                    f"Balance outstanding: ₹{inv.balance_due}\n\n"
                    f"Please arrange payment at your earliest convenience.\n\n"
                    f"— {inv.company.name}"
                )
                send_email(inv.customer.email, subject, body)
                inv.last_reminder_at = now
                inv.reminder_count += 1
                inv.save(update_fields=["last_reminder_at", "reminder_count", "updated_at"])
                sent += 1

    return {"reminders_sent": sent}
