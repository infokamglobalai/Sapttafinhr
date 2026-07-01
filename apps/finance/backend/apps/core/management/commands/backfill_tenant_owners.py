"""Backfill each tenant's billing owner as an OWNER TenantMember.

Older tenants provisioned via the superadmin console or bootstrap never seeded a
TenantMember for the workspace owner, so the owner resolved to VIEWER and got a
403 ("You do not have permission to perform this action in this workspace") on
the forced setup wizard. This command repairs those tenants. Idempotent.

    python manage.py backfill_tenant_owners            # all non-public tenants
    python manage.py backfill_tenant_owners --schema kuwait
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context

from apps.core.models import Tenant
from apps.identity.models import User
from apps.team.membership import ensure_owner_member


class Command(BaseCommand):
    help = "Seed each tenant's billing owner as an OWNER TenantMember (unblocks setup-wizard RBAC)."

    def add_arguments(self, parser):
        parser.add_argument("--schema", help="Only this schema (default: all non-public tenants).")

    def handle(self, *args, **opts):
        only = opts.get("schema")
        qs = Tenant.objects.exclude(schema_name="public")
        if only:
            qs = qs.filter(schema_name=only)

        seeded = 0
        for t in qs.order_by("schema_name"):
            email = (t.billing_email or "").strip()
            if not email:
                self.stdout.write(self.style.WARNING(f"{t.schema_name}: no billing_email — skipped"))
                continue
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                self.stdout.write(self.style.WARNING(f"{t.schema_name}: no user for {email} — skipped"))
                continue
            with schema_context(t.schema_name):
                ensure_owner_member(user_id=user.id, email=user.email, full_name=user.full_name)
            seeded += 1
            self.stdout.write(self.style.SUCCESS(f"{t.schema_name}: owner {email} seeded"))

        self.stdout.write(self.style.SUCCESS(f"Done — {seeded} tenant owner(s) seeded."))
