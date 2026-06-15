"""Run monthly automation tasks manually (dev / ops)."""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run monthly HR automation: kickoff, report pack, or payroll reminders"

    def add_arguments(self, parser):
        parser.add_argument(
            "--action",
            choices=["kickoff", "report-pack", "reminders", "all"],
            default="all",
        )
        parser.add_argument("--tenant", default="", help="Subdomain (default: all tenants)")
        parser.add_argument("--year", type=int, default=0)
        parser.add_argument("--month", type=int, default=0)

    def handle(self, *args, **options):
        from apps.tenants.models import Tenant

        tenants = Tenant.objects.filter(status__in=["active", "trial"])
        sub = (options["tenant"] or "").strip().lower()
        if sub:
            tenants = tenants.filter(subdomain=sub)

        action = options["action"]
        for tenant in tenants:
            self.stdout.write(f"Tenant: {tenant.subdomain}")
            if action in ("kickoff", "all"):
                from apps.hr_ops.monthly_kickoff import send_monthly_payroll_kickoff
                n = send_monthly_payroll_kickoff(tenant, force=True)
                self.stdout.write(self.style.SUCCESS(f"  Kickoff emails: {n}"))
            if action in ("report-pack", "all"):
                import datetime
                from apps.hr_ops.monthly_report_email import send_monthly_report_pack
                today = datetime.date.today()
                year = options["year"] or (today.year if today.month > 1 else today.year - 1)
                month = options["month"] or (today.month - 1 if today.month > 1 else 12)
                n = send_monthly_report_pack(tenant, year, month)
                self.stdout.write(self.style.SUCCESS(f"  Report pack ({year}-{month:02d}): {n} emails"))
            if action in ("reminders", "all"):
                from apps.hr_ops.automation import send_payroll_reminders
                n = send_payroll_reminders(tenant)
                self.stdout.write(self.style.SUCCESS(f"  Payroll reminders: {n}"))
