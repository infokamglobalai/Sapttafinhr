"""Backfill holiday calendars and leave types for existing GCC tenants."""
from django.core.management.base import BaseCommand

from apps.tenants.jurisdiction import GCC_JURISDICTIONS
from apps.tenants.models import Tenant
from apps.tenants.regional_packs import seed_regional_defaults


class Command(BaseCommand):
    help = "Seed GCC/Kuwait holiday calendars and leave policy packs for tenants."

    def add_arguments(self, parser):
        parser.add_argument("--subdomain", help="Limit to one workspace subdomain")
        parser.add_argument("--year", type=int, help="Holiday calendar year (default: current)")

    def handle(self, *args, **options):
        qs = Tenant.objects.filter(payroll_jurisdiction__in=GCC_JURISDICTIONS)
        if options.get("subdomain"):
            qs = qs.filter(subdomain=options["subdomain"])
        year = options.get("year")
        for tenant in qs:
            result = seed_regional_defaults(tenant, year=year)
            self.stdout.write(
                self.style.SUCCESS(
                    f"{tenant.subdomain} ({result['jurisdiction']}): "
                    f"leave_types+={result['leave_types']}, holidays={result['holidays']}"
                )
            )
