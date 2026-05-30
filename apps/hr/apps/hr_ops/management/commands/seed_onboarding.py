"""
Seed a sensible default onboarding template for a tenant.

Usage:
    python manage.py seed_onboarding --tenant demo
"""
from django.core.management.base import BaseCommand
from django.db import transaction


DEFAULT_TASKS = [
    # (sequence, task_name, description, responsible_party, due_days_offset)
    (10,  "Send offer letter",                "Issue and email the signed offer letter.",       "hr",       -7),
    (20,  "Collect signed documents",         "Aadhaar, PAN, education certificates, previous experience letter.", "hr", 0),
    (30,  "Set up email + Slack accounts",    "Provision official email and chat workspace.",    "it",       0),
    (40,  "Assign laptop & access card",      "Hand over equipment and verify functionality.",   "it",       0),
    (50,  "Add to payroll",                   "Capture bank details, PAN, and create salary record.", "hr",  1),
    (60,  "Add to PF / ESIC",                 "Register with statutory portals if applicable.",  "hr",       3),
    (70,  "Office tour & introductions",      "Show around the workspace, introduce key teams.", "hr",       0),
    (80,  "Manager 1:1 kickoff",              "First meeting with reporting manager to set expectations.", "manager", 1),
    (90,  "Team introduction",                "Manager introduces the new hire to the team.",    "manager", 1),
    (100, "Goals for first 30 days",          "Define what success looks like in the first month.", "manager", 7),
    (110, "First payslip walkthrough",        "Walk through payslip components on first pay run.", "hr",     30),
    (120, "30-day check-in",                  "Manager + HR check on how the new hire is settling in.", "manager", 30),
    (130, "90-day probation review",          "Confirmation evaluation at end of probation.",     "manager", 90),
]


class Command(BaseCommand):
    help = "Seed a default onboarding template with 13 standard tasks"

    def add_arguments(self, parser):
        parser.add_argument("--tenant", required=True, help="Tenant subdomain")
        parser.add_argument("--name", default="Standard New Hire Onboarding", help="Template name")
        parser.add_argument("--reset", action="store_true", help="Delete existing tasks and replace")

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.tenants.models import Tenant
        from apps.hr_ops.models import OnboardingTemplate, OnboardingTask

        tenant = Tenant.objects.get(subdomain=options["tenant"])

        tmpl, created = OnboardingTemplate.objects.get_or_create(
            tenant=tenant, name=options["name"],
            defaults={"is_default": True},
        )
        if not created and options["reset"]:
            tmpl.tasks.all().delete()
            self.stdout.write("  Removed existing tasks.")

        # Make this template the default (unset others)
        OnboardingTemplate.objects.filter(tenant=tenant).exclude(pk=tmpl.pk).update(is_default=False)
        tmpl.is_default = True
        tmpl.save()

        added = 0
        for seq, name, desc, owner, due in DEFAULT_TASKS:
            _, c = OnboardingTask.objects.get_or_create(
                template=tmpl, task_name=name,
                defaults={
                    "description": desc, "responsible_party": owner,
                    "due_days_offset": due, "sequence_order": seq, "is_required": True,
                }
            )
            if c:
                added += 1

        self.stdout.write(self.style.SUCCESS(
            f'Template "{tmpl.name}" {"created" if created else "updated"} for tenant {tenant.subdomain}: {added} new task(s) of {len(DEFAULT_TASKS)} total.'
        ))
