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
    """TRIAL subscriptions past trial_ends_at -> PAST_DUE. Returns count changed."""
    from .models import Subscription

    today = timezone.now().date()
    qs = Subscription.objects.filter(
        status=Subscription.Status.TRIAL,
        trial_ends_at__isnull=False,
        trial_ends_at__lt=today,
    )
    count = 0
    for sub in qs.select_related("tenant"):
        sub.status = Subscription.Status.PAST_DUE
        sub.save(update_fields=["status", "updated_at"])
        _email(
            sub,
            "Your Saptta trial has ended",
            "Your free trial has ended. Add a payment method to keep your "
            "workspace active. Access is paused until you subscribe.",
        )
        count += 1
    if count:
        logger.info("expire_trials: %s trials moved to PAST_DUE", count)
    return count


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
    """Nudge trials ending in TRIAL_REMINDER_DAYS days."""
    from .models import Subscription

    target = timezone.now().date() + timedelta(days=TRIAL_REMINDER_DAYS)
    qs = Subscription.objects.filter(
        status=Subscription.Status.TRIAL, trial_ends_at=target
    ).select_related("tenant")
    count = 0
    for sub in qs:
        _email(
            sub,
            f"Your Saptta trial ends in {TRIAL_REMINDER_DAYS} days",
            "Your free trial is ending soon. Subscribe now to keep your "
            "workspace running without interruption.",
        )
        count += 1
    return count
