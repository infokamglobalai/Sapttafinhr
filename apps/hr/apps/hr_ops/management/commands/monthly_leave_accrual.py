"""Credit monthly leave accruals for all tenants.

Usage:
    python manage.py monthly_leave_accrual
    python manage.py monthly_leave_accrual --tenant demo
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Credit monthly leave accruals for active employees"

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="Limit to one tenant subdomain")

    def handle(self, *args, **options):
        from apps.tenants.models import Tenant
        from apps.leaves.services import credit_monthly_accrual

        today = timezone.localdate()
        tenants = Tenant.objects.filter(status__in=["active", "trial"])
        if options["tenant"]:
            tenants = tenants.filter(subdomain=options["tenant"])

        total = 0
        for tenant in tenants:
            count = credit_monthly_accrual(tenant, today.year, today.month)
            total += count
            self.stdout.write(f"{tenant.subdomain}: {count} balance(s) credited")

        self.stdout.write(self.style.SUCCESS(f"Done — {total} credit(s) applied"))
