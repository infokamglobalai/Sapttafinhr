"""
Run daily (via celery-beat or cron) to send people-pulse alerts.

Usage:
    python manage.py daily_alerts                # all tenants
    python manage.py daily_alerts --tenant demo  # one tenant
"""
import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Send daily birthday / anniversary / probation / document-expiry alerts"

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="Optional: limit to one tenant subdomain")

    def handle(self, *args, **options):
        from apps.tenants.models import Tenant
        from apps.employees.models import Employee, EmployeeDocument
        from apps.hr_ops.services import notify

        today = timezone.localdate()

        tenants = Tenant.objects.filter(status__in=["active", "trial"])
        if options["tenant"]:
            tenants = tenants.filter(subdomain=options["tenant"])

        for tenant in tenants:
            counts = {"birthday": 0, "anniv": 0, "probation": 0, "expiry": 0}
            active = Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")

            # ── Birthdays today ──
            for emp in active.exclude(date_of_birth__isnull=True):
                if emp.date_of_birth.month == today.month and emp.date_of_birth.day == today.day:
                    if emp.user:
                        notify(emp.user, "birthday",
                            "Happy Birthday! 🎂",
                            message=f"Wishing you a wonderful day, {emp.first_name}. The whole team at {tenant.name} is celebrating with you today.",
                            action_url="/")
                        counts["birthday"] += 1
                    # Notify reporting manager
                    if emp.reporting_manager and emp.reporting_manager.user:
                        notify(emp.reporting_manager.user, "birthday",
                            f"It's {emp.full_name}'s birthday today 🎂",
                            message="Drop them a note to make their day.",
                            action_url=f"/employees/{emp.pk}/")

            # ── Work anniversaries today ──
            for emp in active.exclude(date_of_joining__isnull=True):
                doj = emp.date_of_joining
                if doj.month == today.month and doj.day == today.day:
                    years = today.year - doj.year
                    if years < 1:
                        continue
                    if emp.user:
                        notify(emp.user, "work_anniversary",
                            f"Congratulations on {years} year{'s' if years > 1 else ''} 🌟",
                            message=f"Hard to believe it's been {years} year{'s' if years > 1 else ''} already, {emp.first_name}. Thank you for everything you've done.",
                            action_url="/")
                        counts["anniv"] += 1
                    if emp.reporting_manager and emp.reporting_manager.user:
                        notify(emp.reporting_manager.user, "work_anniversary",
                            f"{emp.full_name} completes {years} year{'s' if years > 1 else ''} today 🌟",
                            message="A quick note from you would mean a lot.",
                            action_url=f"/employees/{emp.pk}/")

            # ── Probation ending in next 7 days ──
            in_a_week = today + datetime.timedelta(days=7)
            for emp in active.filter(
                probation_end_date__gte=today, probation_end_date__lte=in_a_week,
                date_of_confirmation__isnull=True,
            ):
                if emp.reporting_manager and emp.reporting_manager.user:
                    notify(emp.reporting_manager.user, "probation_ending",
                        f"Probation ending soon for {emp.full_name}",
                        message=f"Their probation ends on {emp.probation_end_date.strftime('%d %b %Y')}. "
                                f"Schedule a confirmation meeting and update their status.",
                        action_url=f"/employees/{emp.pk}/")
                    counts["probation"] += 1

            # ── Documents expiring in next 30 days ──
            in_a_month = today + datetime.timedelta(days=30)
            for doc in EmployeeDocument.objects.filter(
                tenant=tenant, expiry_date__gte=today, expiry_date__lte=in_a_month,
            ).select_related("employee"):
                if doc.employee.user:
                    days = (doc.expiry_date - today).days
                    notify(doc.employee.user, "document_expiring",
                        f"Document expiring in {days} day{'s' if days != 1 else ''}",
                        message=f"Your {doc.get_document_type_display()} ({doc.document_name}) expires on {doc.expiry_date.strftime('%d %b %Y')}. "
                                f"Please share an updated copy with HR.",
                        action_url=f"/employees/{doc.employee.pk}/")
                    counts["expiry"] += 1

            total = sum(counts.values())
            self.stdout.write(self.style.SUCCESS(
                f"{tenant.subdomain}: {total} alerts sent "
                f"(birthdays: {counts['birthday']}, anniversaries: {counts['anniv']}, "
                f"probation: {counts['probation']}, doc expiry: {counts['expiry']})"
            ))
