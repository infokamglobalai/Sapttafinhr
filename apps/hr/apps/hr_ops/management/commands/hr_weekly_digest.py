"""Send weekly HR digest to HR admins.

Usage:
    python manage.py hr_weekly_digest
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Send weekly HR metrics digest to HR admins"

    def handle(self, *args, **options):
        from apps.tenants.models import Tenant
        from apps.hr_ops.automation import send_weekly_hr_digest

        total = 0
        for tenant in Tenant.objects.filter(status__in=["active", "trial"]):
            count = send_weekly_hr_digest(tenant)
            self.stdout.write(f"{tenant.subdomain}: {count} digest(s) sent")
            total += count

        self.stdout.write(self.style.SUCCESS(f"Done — {total} digest(s) sent"))
