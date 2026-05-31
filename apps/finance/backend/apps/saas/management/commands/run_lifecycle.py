"""Run the subscription-lifecycle tasks synchronously (for ops/testing).

    python manage.py run_lifecycle

Runs the same logic Celery beat schedules, but inline so you can verify trial
expiry / dunning without waiting for the scheduler.
"""
from django.core.management.base import BaseCommand

from apps.saas.tasks import (
    expire_overdue_subscriptions,
    expire_trials,
    send_trial_ending_reminders,
)


class Command(BaseCommand):
    help = "Run subscription lifecycle transitions (trial expiry, dunning) now."

    def handle(self, *args, **opts):
        expired = expire_trials()
        overdue = expire_overdue_subscriptions()
        reminded = send_trial_ending_reminders()
        self.stdout.write(self.style.SUCCESS(
            f"lifecycle: {expired} trial(s) expired, {overdue} overdue transitioned, "
            f"{reminded} reminder(s) sent."
        ))
