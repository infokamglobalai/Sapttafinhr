"""Subscription lifecycle automation (Celery beat).

The entitlement middleware already blocks tenants whose subscription is not
`is_commercially_active` (i.e. not TRIAL/ACTIVE). So lifecycle enforcement is
just: move expired trials and unpaid ACTIVE subs to PAST_DUE, then CANCELLED
after a grace period — and send dunning email along the way.

Schedule (see config.settings.base CELERY_BEAT_SCHEDULE):
  - expire_trials                  daily
  - expire_overdue_subscriptions   daily
  - send_trial_ending_reminders    daily

All idempotent; safe to run repeatedly.
"""
from __future__ import annotations

import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)

# Days a PAST_DUE subscription is kept (access blocked) before being CANCELLED.
GRACE_DAYS = getattr(settings, "SUBSCRIPTION_GRACE_DAYS", 7)
# How many days before trial end to send the "ending soon" nudge.
TRIAL_REMINDER_DAYS = getattr(settings, "TRIAL_REMINDER_DAYS", 3)


def _audit(action: str, target: str, **detail) -> None:
    """Record an automated lifecycle action in the audit log (best-effort)."""
    try:
        from apps.core.models import AuditLog
        AuditLog.record(actor_email="system:celery", action=action, target=target, **detail)
    except Exception:  # noqa: BLE001
        logger.exception("audit log write failed for %s/%s", action, target)


def _email(subscription, subject: str, body: str) -> None:
    """Best-effort dunning/notification mail to the tenant billing contact."""
    recipient = getattr(subscription.tenant, "billing_email", None)
    if not recipient:
        logger.info("No billing_email for tenant %s; skipping '%s'", subscription.tenant_id, subject)
        return
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [recipient], fail_silently=True)
    except Exception:  # noqa: BLE001
        logger.exception("Dunning email failed for tenant %s", subscription.tenant_id)


@shared_task
def expire_trials() -> int:
    """No-op: Saptta is pay-first (no free trials).

    Retained so any existing Celery beat entry / legacy reference keeps working.
    New signups never enter TRIAL; access requires a paid (ACTIVE) subscription.
    """
    return 0


@shared_task
def expire_overdue_subscriptions() -> int:
    """ACTIVE subs whose paid period ended -> PAST_DUE; PAST_DUE past grace -> CANCELLED."""
    from .models import Subscription

    today = timezone.now().date()
    changed = 0

    lapsed = Subscription.objects.filter(
        status=Subscription.Status.ACTIVE,
        current_period_end__isnull=False,
        current_period_end__lt=today,
    )
    for sub in lapsed.select_related("tenant"):
        sub.status = Subscription.Status.PAST_DUE
        sub.save(update_fields=["status", "updated_at"])
        _email(
            sub,
            "Payment needed to keep Saptta active",
            "We couldn't renew your subscription. Please update your payment "
            f"method within {GRACE_DAYS} days to avoid cancellation.",
        )
        changed += 1

    cutoff = today - timedelta(days=GRACE_DAYS)
    stale = Subscription.objects.filter(
        status=Subscription.Status.PAST_DUE,
        updated_at__date__lt=cutoff,
    )
    for sub in stale.select_related("tenant"):
        sub.status = Subscription.Status.CANCELLED
        sub.cancelled_at = timezone.now()
        sub.save(update_fields=["status", "cancelled_at", "updated_at"])
        _audit("subscription.auto_cancel", sub.tenant.schema_name)
        _email(
            sub,
            "Your Saptta subscription has been cancelled",
            "Your subscription was cancelled after the grace period. Your data "
            "is retained for now — resubscribe anytime to restore access.",
        )
        changed += 1

    if changed:
        logger.info("expire_overdue_subscriptions: %s subscriptions transitioned", changed)
    return changed


@shared_task
def send_trial_ending_reminders() -> int:
    """No-op: pay-first, no trials to remind about. Retained for beat compat."""
    return 0


# ──────────────────────────────────────────────────────────────────────────
# Async workspace provisioning
#
# Self-serve signup creates the owner User + the Tenant *row* synchronously
# (both fast), then hands the heavy lifting — building the tenant's Postgres
# schema (migrations), seeding the finance company/COA/fiscal-year, and calling
# the HR backend — to ``provision_workspace`` below. That keeps the signup HTTP
# request well under any proxy/load-balancer timeout: it returns immediately
# while the worker provisions in the background and the SPA polls
# ``/saas/provisioning-status/`` until the schema is READY.
#
# ``run_provision`` is also callable inline (see SignupView) as a fallback for
# the rare case where the broker is unreachable at enqueue time.
# ──────────────────────────────────────────────────────────────────────────

# country (ISO-2) → base accounting currency for the seeded company.
_CURRENCY_BY_COUNTRY = {
    "IN": "INR", "KW": "KWD", "AE": "AED", "SA": "SAR",
    "BH": "BHD", "OM": "OMR", "QA": "QAR",
}


def _ensure_schema(tenant) -> None:
    """Create + migrate the tenant schema. Idempotent and retry-safe.

    Fresh tenant → create the schema and run all tenant migrations. Retry
    (schema already exists, possibly half-migrated) → just run the migrations
    again, a no-op when already applied.
    """
    from django.core.management import call_command
    from django_tenants.utils import schema_exists

    if not schema_exists(tenant.schema_name):
        # create_schema() creates the PG schema AND runs migrate_schemas.
        tenant.create_schema(check_if_exists=True)
    else:
        call_command(
            "migrate_schemas", tenant=True, schema_name=tenant.schema_name,
            interactive=False, verbosity=0,
        )


def _seed_finance(schema_name: str, company_name: str, country: str = "IN") -> None:
    from datetime import date
    from django_tenants.utils import schema_context
    from apps.masters.coa_template import seed_coa
    from apps.masters.models import Company, FiscalYear

    with schema_context(schema_name):
        base_currency = _CURRENCY_BY_COUNTRY.get(country, "USD")
        company, created = Company.objects.get_or_create(
            name=company_name,
            defaults={"legal_name": company_name, "base_currency": base_currency, "country": country},
        )
        if created and country == "IN":
            seed_coa(company)

        today = date.today()
        if country == "IN":
            if today.month >= 4:
                start, end = date(today.year, 4, 1), date(today.year + 1, 3, 31)
            else:
                start, end = date(today.year - 1, 4, 1), date(today.year, 3, 31)
        else:
            start, end = date(today.year, 1, 1), date(today.year, 12, 31)

        fy_name = f"FY{str(start.year)[-2:]}-{str(end.year)[-2:]}"
        FiscalYear.objects.get_or_create(
            company=company, name=fy_name,
            defaults={"start_date": start, "end_date": end, "is_active": True},
        )


def _provision_hr(*, name: str, subdomain: str, email: str, country: str = "IN") -> None:
    """Call the HR backend's internal provisioning endpoint (best-effort)."""
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    base = getattr(settings, "HR_INTERNAL_BASE_URL", "")
    if not (secret and base):
        logger.info("HR provisioning skipped (SSO_SHARED_SECRET / HR_INTERNAL_BASE_URL unset)")
        return
    try:
        import requests

        requests.post(
            f"{base.rstrip('/')}/internal/provision/",
            headers={"Authorization": f"Bearer {secret}", "Host": "localhost"},
            json={"name": name, "subdomain": subdomain, "email": email, "country": country},
            timeout=30,
        )
    except Exception:  # noqa: BLE001 — HR outage must not fail FIN provisioning
        logger.exception("HR provisioning call failed for %s", subdomain)


def run_provision(tenant_pk: int, plan_id: str, product_codes: list, country: str) -> None:
    """The actual provisioning work. Idempotent; safe to retry."""
    from datetime import date, timedelta
    from apps.core.models import Tenant
    from .models import Plan, ProductCode, Subscription, SubscriptionEntitlement

    tenant = Tenant.objects.get(pk=tenant_pk)
    Tenant.objects.filter(pk=tenant_pk).update(provision_status=Tenant.ProvisionStatus.PROVISIONING)
    try:
        # 1) Build the tenant schema (the slow part).
        _ensure_schema(tenant)

        # 2) Subscription + per-product entitlements (public schema).
        #    DEBUG → immediately ACTIVE (no payment in dev/test);
        #    production → PENDING until the billing webhook activates it.
        _dev = getattr(settings, "DEBUG", False)
        sub_status = Subscription.Status.ACTIVE if _dev else Subscription.Status.PENDING
        ent_status = SubscriptionEntitlement.Status.ACTIVE if _dev else SubscriptionEntitlement.Status.PENDING
        plan, _ = Plan.objects.get_or_create(
            code=plan_id or "saptta-complete",
            defaults={"name": plan_id or "Saptta Complete"},
        )
        sub, _ = Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={
                "plan": plan,
                "status": sub_status,
                "current_period_start": date.today() if _dev else None,
                "current_period_end": date.today() + timedelta(days=365) if _dev else None,
            },
        )
        # Always grant both FIN and HR in dev so the product switcher shows both.
        all_products = list(dict.fromkeys(
            list(product_codes) + ([ProductCode.FIN, ProductCode.HR] if _dev else [])
        ))
        for product in all_products:
            SubscriptionEntitlement.objects.update_or_create(
                subscription=sub, product=product, defaults={"status": ent_status},
            )

        # 3) Company + COA + fiscal year inside the new tenant schema.
        if ProductCode.FIN in all_products:
            _seed_finance(tenant.schema_name, tenant.name, country)

        # 4) Provision the HR workspace (separate backend service).
        if ProductCode.HR in all_products:
            _provision_hr(name=tenant.name, subdomain=tenant.schema_name,
                          email=tenant.billing_email, country=country)

        Tenant.objects.filter(pk=tenant_pk).update(provision_status=Tenant.ProvisionStatus.READY)
        logger.info("Provisioned workspace %s", tenant.schema_name)
    except Exception:
        Tenant.objects.filter(pk=tenant_pk).update(provision_status=Tenant.ProvisionStatus.FAILED)
        logger.exception("Provisioning failed for %s", tenant.schema_name)
        raise


@shared_task(bind=True, max_retries=2, default_retry_delay=15)
def provision_workspace(self, tenant_pk, plan_id, product_codes, country):
    """Celery entrypoint — retries a couple of times before giving up (FAILED)."""
    try:
        run_provision(tenant_pk, plan_id, product_codes, country)
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc)
