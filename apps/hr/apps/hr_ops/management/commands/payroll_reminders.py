"""Send payroll reminders to HR admins before month-end.

Usage:
    python manage.py payroll_reminders
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Notify HR admins to run payroll if not started"

    def handle(self, *args, **options):
        from apps.tenants.models import Tenant
        from apps.hr_ops.automation import send_payroll_reminders

        total = 0
        for tenant in Tenant.objects.filter(status__in=["active", "trial"]):
            count = send_payroll_reminders(tenant)
            if count:
                self.stdout.write(f"{tenant.subdomain}: {count} reminder(s) sent")
            total += count

        self.stdout.write(self.style.SUCCESS(f"Done — {total} reminder(s) sent"))
