"""Migrate only tenant Postgres schemas that already exist.

``migrate_schemas --tenant`` walks every Tenant row, including signups still in
PENDING provisioning (no PG schema yet). That crashes startup with
``MigrationSchemaMissing``. This command skips tenants whose schema has not
been created yet — provisioning creates + migrates them via ``_ensure_schema``.
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django_tenants.utils import schema_exists

from apps.core.models import Tenant


class Command(BaseCommand):
    help = "Run tenant migrations for workspaces that already have a PG schema."

    def handle(self, *args, **options):
        tenants = Tenant.objects.exclude(schema_name="public").order_by("schema_name")
        migrated = 0
        skipped = 0
        for tenant in tenants:
            if not schema_exists(tenant.schema_name):
                skipped += 1
                self.stdout.write(
                    f"Skipping {tenant.schema_name} (no schema yet; status={tenant.provision_status})"
                )
                continue
            call_command(
                "migrate_schemas",
                tenant=True,
                schema_name=tenant.schema_name,
                interactive=False,
                verbosity=options.get("verbosity", 1),
            )
            migrated += 1
        self.stdout.write(self.style.SUCCESS(f"Migrated {migrated} tenant(s); skipped {skipped}."))
