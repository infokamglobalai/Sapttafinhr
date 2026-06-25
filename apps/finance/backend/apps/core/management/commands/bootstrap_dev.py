"""Idempotent dev bootstrap.

Creates:
  - Public 'public' tenant (required by django-tenants)
  - 'acme' tenant + domain (acme.localhost)
  - superuser admin@acme.test / admin12345
  - Acme Pvt Ltd company with Indian COA + current FY
"""
from datetime import date

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection
from django_tenants.utils import schema_context

from apps.core.models import Domain, Tenant
from apps.identity.models import User
from apps.masters.coa_template import seed_coa
from apps.masters.models import Company, FiscalYear, HSNCode, Item, Party
from apps.saas.models import Plan, ProductCode, Subscription, SubscriptionEntitlement


def fy_dates_for(today: date) -> tuple[date, date, str]:
    """Indian FY = Apr 1 → Mar 31. Pick the FY containing `today`."""
    if today.month >= 4:
        start = date(today.year, 4, 1)
        end = date(today.year + 1, 3, 31)
    else:
        start = date(today.year - 1, 4, 1)
        end = date(today.year, 3, 31)
    name = f"FY{str(start.year)[-2:]}-{str(end.year)[-2:]}"
    return start, end, name


class Command(BaseCommand):
    help = "Seed a development tenant, superuser, company, COA, fiscal year."

    def handle(self, *args, **opts):
        # 1. Public tenant (django-tenants requires this on the public schema)
        public, created = Tenant.objects.get_or_create(
            schema_name="public",
            defaults={"name": "Public"},
        )
        if created:
            self.stdout.write(self.style.SUCCESS("Created public tenant."))
        Domain.objects.get_or_create(
            domain="localhost", tenant=public, defaults={"is_primary": True}
        )

        # 2. Acme tenant
        acme, created = Tenant.objects.get_or_create(
            schema_name="acme",
            defaults={"name": "Acme Pvt Ltd", "billing_email": "demo@saptta.com"},
        )
        if not acme.billing_email or acme.billing_email == "admin@acme.test":
            # Needed so dev login resolves the workspace (JWT workspace claim).
            acme.billing_email = "demo@saptta.com"
            acme.save(update_fields=["billing_email"])
        if created:
            self.stdout.write(self.style.SUCCESS("Created Acme tenant + schema."))
        Domain.objects.get_or_create(
            domain="acme.localhost", tenant=acme, defaults={"is_primary": True}
        )

        # Kuwait tenant
        kuwait, created = Tenant.objects.get_or_create(
            schema_name="kuwait",
            defaults={"name": "Kuwait LLC", "billing_email": "kuwit@saptta.com"},
        )
        if not kuwait.billing_email:
            kuwait.billing_email = "kuwit@saptta.com"
            kuwait.save(update_fields=["billing_email"])
        if created:
            self.stdout.write(self.style.SUCCESS("Created Kuwait tenant + schema."))
        Domain.objects.get_or_create(
            domain="kuwait.localhost", tenant=kuwait, defaults={"is_primary": True}
        )

        from apps.saas.plan_catalog import seed_catalog_plans

        n = seed_catalog_plans()
        self.stdout.write(self.style.SUCCESS(f"Ensured {n} catalog plans (hrms, finance, saptta-complete)."))

        plan, _ = Plan.objects.get_or_create(
            code="dev-complete",
            defaults={
                "name": "Development Complete",
                "description": "Local development — FIN + HR",
                "monthly_price": 0,
                "annual_price": 0,
                "features": {"products": [ProductCode.FIN, ProductCode.HR]},
            },
        )
        subscription, created = Subscription.objects.get_or_create(
            tenant=acme,
            defaults={"plan": plan, "status": Subscription.Status.ACTIVE},
        )
        if not created:
            subscription.status = Subscription.Status.ACTIVE
            subscription.plan = plan
            subscription.save(update_fields=["status", "plan", "updated_at"])
        for product in [ProductCode.FIN, ProductCode.HR]:
            SubscriptionEntitlement.objects.update_or_create(
                subscription=subscription,
                product=product,
                defaults={"status": SubscriptionEntitlement.Status.ACTIVE},
            )

        kuwait_subscription, created = Subscription.objects.get_or_create(
            tenant=kuwait,
            defaults={"plan": plan, "status": Subscription.Status.ACTIVE},
        )
        if not created:
            kuwait_subscription.status = Subscription.Status.ACTIVE
            kuwait_subscription.plan = plan
            kuwait_subscription.save(update_fields=["status", "plan", "updated_at"])
        for product in [ProductCode.FIN, ProductCode.HR]:
            SubscriptionEntitlement.objects.update_or_create(
                subscription=kuwait_subscription,
                product=product,
                defaults={"status": SubscriptionEntitlement.Status.ACTIVE},
            )

        # 3. Superuser (lives in public/shared)
        if not User.objects.filter(email="sp@saptta.com").exists():
            User.objects.create_superuser(
                email="sp@saptta.com",
                password="Saptta@2026",
                full_name="Saptta Superadmin",
            )
            self.stdout.write(self.style.SUCCESS("Created superuser sp@saptta.com / Saptta@2026"))

        # Create demo company admin (lives in public/shared, resolves via billing_email)
        if not User.objects.filter(email="demo@saptta.com").exists():
            User.objects.create_user(
                email="demo@saptta.com",
                password="Demo@1234",
                full_name="Demo Admin",
            )
            self.stdout.write(self.style.SUCCESS("Created demo admin demo@saptta.com / Demo@1234"))

        # Create Kuwit demo user
        if not User.objects.filter(email="kuwit@saptta.com").exists():
            User.objects.create_user(
                email="kuwit@saptta.com",
                password="Kuwit@1234",
                full_name="Demo Kuwit",
            )
            self.stdout.write(self.style.SUCCESS("Created demo kuwit kuwit@saptta.com / Kuwit@1234"))

        # 4. Inside Acme schema: Company + COA + FY
        with schema_context("acme"):
            company, created = Company.objects.get_or_create(
                name="Acme Pvt Ltd",
                defaults={
                    "legal_name": "Acme Private Limited",
                    "state_code": "27",  # Maharashtra
                    "base_currency": "INR",
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS("Created Acme company."))

            seed_coa(company)
            self.stdout.write(self.style.SUCCESS("Seeded Indian COA template."))

            start, end, fy_name = fy_dates_for(date.today())
            FiscalYear.objects.get_or_create(
                company=company,
                name=fy_name,
                defaults={"start_date": start, "end_date": end, "is_active": True},
            )
            self.stdout.write(self.style.SUCCESS(f"Ensured fiscal year {fy_name}."))

            # Demo HSN codes + items + sample customer/vendor
            hsn_8523, _ = HSNCode.objects.get_or_create(
                company=company, code="8523",
                defaults={"description": "Software / IT services", "default_tax_rate": 18},
            )
            hsn_4901, _ = HSNCode.objects.get_or_create(
                company=company, code="4901",
                defaults={"description": "Books, printed", "default_tax_rate": 0},
            )
            hsn_8471, _ = HSNCode.objects.get_or_create(
                company=company, code="8471",
                defaults={"description": "Computer hardware", "default_tax_rate": 18},
            )

            Item.objects.get_or_create(
                company=company, sku="SVC-CONSULT",
                defaults={
                    "name": "Consulting (per hour)", "kind": Item.Kind.SERVICE,
                    "hsn": hsn_8523, "unit": "Hrs",
                    "sale_price": 2500, "tax_rate": 18,
                },
            )
            Item.objects.get_or_create(
                company=company, sku="HW-LAPTOP",
                defaults={
                    "name": "Laptop (14-inch)", "kind": Item.Kind.GOODS,
                    "hsn": hsn_8471, "unit": "Nos",
                    "sale_price": 65000, "purchase_price": 55000, "tax_rate": 18,
                },
            )
            Item.objects.get_or_create(
                company=company, sku="BOOK-MNGMT",
                defaults={
                    "name": "Management Handbook", "kind": Item.Kind.GOODS,
                    "hsn": hsn_4901, "unit": "Nos",
                    "sale_price": 750, "tax_rate": 0,
                },
            )

            Party.objects.get_or_create(
                company=company, name="Globex Industries",
                defaults={
                    "kind": Party.Kind.CUSTOMER, "gstin": "27AAACG1234C1Z5",
                    "email": "billing@globex.test", "state_code": "27",  # Maharashtra
                    "billing_address": "Plot 12, MIDC, Pune 411019",
                    "credit_limit": 500000,
                },
            )
            Party.objects.get_or_create(
                company=company, name="Initech Pvt Ltd",
                defaults={
                    "kind": Party.Kind.CUSTOMER, "gstin": "29AAACI5678D1Z8",
                    "email": "ap@initech.test", "state_code": "29",  # Karnataka
                    "billing_address": "5th Floor, Brigade Tower, Bangalore 560001",
                    "credit_limit": 250000,
                },
            )
            Party.objects.get_or_create(
                company=company, name="Reliable Stationers",
                defaults={
                    "kind": Party.Kind.VENDOR, "gstin": "27AAARS9090E1Z2",
                    "email": "sales@reliable.test", "state_code": "27",
                    "billing_address": "Shop 7, FC Road, Pune 411004",
                },
            )
            self.stdout.write(self.style.SUCCESS("Seeded demo HSN codes, items, parties."))

        # 5. Inside Kuwait schema: Company + COA + FY
        with schema_context("kuwait"):
            kuwait_company, created = Company.objects.get_or_create(
                name="Kuwait LLC",
                defaults={
                    "legal_name": "Kuwait Trading Company LLC",
                    "state_code": "KW",
                    "base_currency": "KWD",
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS("Created Kuwait company."))

            seed_coa(kuwait_company)
            start, end, fy_name = fy_dates_for(date.today())
            FiscalYear.objects.get_or_create(
                company=kuwait_company,
                name=fy_name,
                defaults={"start_date": start, "end_date": end, "is_active": True},
            )
            self.stdout.write(self.style.SUCCESS(f"Ensured fiscal year {fy_name} for Kuwait."))

        # 6. Demo coupon codes (billing page / superadmin coupons)
        from apps.saas.models import CouponCode

        CouponCode.objects.get_or_create(
            code="DEMO100",
            defaults={
                "description": "100% off — demo / QA checkout without Razorpay",
                "discount_type": CouponCode.DiscountType.PERCENT,
                "discount_value": 100,
                "is_active": True,
                "created_by": "bootstrap_dev",
            },
        )
        CouponCode.objects.get_or_create(
            code="LAUNCH50",
            defaults={
                "description": "50% launch discount — all plans",
                "discount_type": CouponCode.DiscountType.PERCENT,
                "discount_value": 50,
                "is_active": True,
                "created_by": "bootstrap_dev",
            },
        )
        self.stdout.write(self.style.SUCCESS("Ensured demo coupons DEMO100 and LAUNCH50."))

        self.stdout.write(self.style.SUCCESS("Bootstrap complete."))
        self.stdout.write("Login at http://acme.localhost:8000/admin/  (sp@saptta.com / Saptta@2026)")
