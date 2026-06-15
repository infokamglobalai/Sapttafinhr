"""
Process exit requests whose last working day has passed.

Usage:
    python manage.py process_due_exits
    python manage.py process_due_exits --tenant sapttadev
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Auto-finalize exits on or after last working day (disable login, mark exited)"

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="Limit to one tenant subdomain")

    def handle(self, *args, **options):
        from apps.tenants.models import Tenant
        from apps.hr_ops.exit_services import process_due_exits

        today = timezone.localdate()
        tenants = Tenant.objects.filter(status__in=["active", "trial"])
        if options["tenant"]:
            tenants = tenants.filter(subdomain=options["tenant"])

        total = 0
        for tenant in tenants:
            results = process_due_exits(tenant, today)
            total += len(results)
            for r in results:
                self.stdout.write(self.style.SUCCESS(
                    f"{tenant.subdomain}: finalized {r['employee']} (exit #{r['exit_id']})"
                ))

        if total == 0:
            self.stdout.write("No exits due for finalization today.")
        else:
            self.stdout.write(self.style.SUCCESS(f"Done — {total} exit(s) finalized."))
