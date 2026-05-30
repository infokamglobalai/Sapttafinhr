"""
Nightly job to recompute attrition risk scores.

Usage:
    python manage.py compute_attrition                 # all tenants
    python manage.py compute_attrition --tenant demo   # one tenant
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Recompute attrition / flight-risk scores for every active employee"

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="Optional: limit to one tenant subdomain")
        parser.add_argument("--quiet", action="store_true")

    def handle(self, *args, **opts):
        from apps.tenants.models import Tenant
        from apps.employees.attrition import recompute_all

        tenants = Tenant.objects.filter(status__in=["active", "trial"])
        if opts["tenant"]:
            tenants = tenants.filter(subdomain=opts["tenant"])

        for t in tenants:
            counts = recompute_all(t)
            if not opts["quiet"]:
                total = sum(counts.values())
                self.stdout.write(self.style.SUCCESS(
                    f"{t.subdomain}: scored {total} employees "
                    f"(high={counts['high']} medium={counts['medium']} low={counts['low']})"
                ))
