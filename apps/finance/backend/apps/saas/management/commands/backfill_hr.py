from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from apps.core.models import Tenant
from apps.saas.models import Subscription, SubscriptionEntitlement, ProductCode
from apps.saas.tasks import _provision_hr
from apps.saas.hr_sync import sync_hr_subscription
from apps.masters.models import Company


class Command(BaseCommand):
    help = "Idempotently backfills HR tenants/entitlements for all active-HR subscribers."

    def handle(self, *args, **opts):
        # Find all subscription entitlements that grant HR access and are active/trial
        hr_entitlements = SubscriptionEntitlement.objects.filter(
            product=ProductCode.HR,
            status__in=[
                SubscriptionEntitlement.Status.ACTIVE,
                SubscriptionEntitlement.Status.TRIAL,
            ],
        ).select_related("subscription__tenant")

        self.stdout.write(
            f"Found {hr_entitlements.count()} active HR subscription entitlement(s) to process."
        )

        success_count = 0
        for ent in hr_entitlements:
            sub = ent.subscription
            tenant = sub.tenant

            self.stdout.write(f"Processing tenant {tenant.schema_name}...")

            # 1. Resolve country from Company model inside tenant's schema
            country = "IN"
            try:
                with schema_context(tenant.schema_name):
                    c = Company.objects.first()
                    if c and c.country:
                        country = c.country
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(
                        f"  Could not read Company from schema {tenant.schema_name} (error: {e}). Defaulting country to 'IN'."
                    )
                )

            # 2. Call _provision_hr to idempotently create the tenant on HR side
            try:
                self.stdout.write(f"  Calling _provision_hr for {tenant.schema_name}...")
                _provision_hr(
                    name=tenant.name,
                    subdomain=tenant.schema_name,
                    email=tenant.billing_email,
                    country=country,
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"  Failed to provision HR tenant for {tenant.schema_name}: {e}"
                    )
                )
                continue

            # 3. Call sync_hr_subscription to sync subscription status and limits
            try:
                self.stdout.write(f"  Calling sync_hr_subscription for {tenant.schema_name}...")
                status_val = (
                    "active"
                    if ent.status == SubscriptionEntitlement.Status.ACTIVE
                    else "trial"
                )
                synced = sync_hr_subscription(
                    tenant.schema_name,
                    plan_code=sub.plan.code,
                    subscription_id=str(sub.id),
                    status=status_val,
                )
                if synced:
                    self.stdout.write(
                        self.style.SUCCESS(f"  Successfully processed {tenant.schema_name}")
                    )
                    success_count += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  Sync finished, but API returned failure for {tenant.schema_name}"
                        )
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"  Failed to sync HR subscription for {tenant.schema_name}: {e}"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Backfill complete: {success_count} tenant(s) successfully processed/synced."
            )
        )
