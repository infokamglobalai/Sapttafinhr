import os
from datetime import date
from django.core.management.base import BaseCommand
from django.db import connection
from django_tenants.utils import schema_context

from apps.core.models import Domain, Tenant
from apps.identity.models import User
from apps.masters.coa_template import seed_coa
from apps.masters.models import Company, FiscalYear, HSNCode, Item, Party
from apps.saas.models import Plan, ProductCode, Subscription, SubscriptionEntitlement
from apps.core.management.commands.bootstrap_dev import fy_dates_for

class Command(BaseCommand):
    help = "Seed production/staging tenants, plans, superusers, and demo company."

    def add_arguments(self, parser):
        parser.add_argument(
            "--domain",
            type=str,
            default="saptta.com",
            help="Base domain for production (default: saptta.com)",
        )

    def handle(self, *args, **opts):
        base_domain = opts["domain"]

        # 1. Public tenant (shared schema)
        public, created = Tenant.objects.get_or_create(
            schema_name="public",
            defaults={"name": "Saptta Public"},
        )
        if created:
            self.stdout.write(self.style.SUCCESS("Created public tenant."))

        # Public domains
        Domain.objects.get_or_create(
            domain=base_domain, tenant=public, defaults={"is_primary": True}
        )
        Domain.objects.get_or_create(
            domain=f"app.{base_domain}", tenant=public, defaults={"is_primary": False}
        )
        Domain.objects.get_or_create(
            domain=f"www.{base_domain}", tenant=public, defaults={"is_primary": False}
        )

        # 2. Demo/Acme tenant
        acme, created = Tenant.objects.get_or_create(
            schema_name="acme",
            defaults={"name": "Acme Pvt Ltd", "billing_email": "demo@saptta.com"},
        )
        if not acme.billing_email or acme.billing_email == "admin@acme.test":
            acme.billing_email = "demo@saptta.com"
            acme.save(update_fields=["billing_email"])
        if created:
            self.stdout.write(self.style.SUCCESS("Created Acme/Demo tenant + schema."))

        Domain.objects.get_or_create(
            domain=f"acme.{base_domain}", tenant=acme, defaults={"is_primary": True}
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
            domain=f"kuwait.{base_domain}", tenant=kuwait, defaults={"is_primary": True}
        )

        from apps.saas.plan_catalog import seed_catalog_plans

        n = seed_catalog_plans()
        self.stdout.write(self.style.SUCCESS(f"Ensured {n} catalog plans (hrms, finance, saptta-complete)."))

        # 3. Create SaaS Plans and Subscription
        plan, _ = Plan.objects.get_or_create(
            code="dev-complete",
            defaults={
                "name": "Complete Plan",
                "description": "Full access to HRMS & Accounts",
                "monthly_price": 14999,
                "annual_price": 149990,
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

        # 4. Create Users (Superadmin & Demo Admin)
        if not User.objects.filter(email="sp@saptta.com").exists():
            User.objects.create_superuser(
                email="sp@saptta.com",
                password="Saptta@2026",
                full_name="Saptta Superadmin",
            )
            self.stdout.write(self.style.SUCCESS("Created superuser: sp@saptta.com / Saptta@2026"))

        if not User.objects.filter(email="demo@saptta.com").exists():
            User.objects.create_user(
                email="demo@saptta.com",
                password="Demo@1234",
                full_name="Demo Admin",
                is_verified=True,
            )
            self.stdout.write(self.style.SUCCESS("Created demo admin: demo@saptta.com / Demo@1234"))
        else:
            User.objects.filter(email="demo@saptta.com").update(is_verified=True)

        # Create Kuwit demo user
        if not User.objects.filter(email="kuwit@saptta.com").exists():
            User.objects.create_user(
                email="kuwit@saptta.com",
                password="Kuwit@1234",
                full_name="Demo Kuwit",
                is_verified=True,
            )
            self.stdout.write(self.style.SUCCESS("Created demo kuwit: kuwit@saptta.com / Kuwit@1234"))
        else:
            User.objects.filter(email="kuwit@saptta.com").update(is_verified=True)

        # 5. Inside Acme schema: seed Company, COA, Fiscal Year, and basic data
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
                    "email": "billing@globex.test", "state_code": "27",
                    "billing_address": "Plot 12, MIDC, Pune 411019",
                    "credit_limit": 500000,
                },
            )
            Party.objects.get_or_create(
                company=company, name="Initech Pvt Ltd",
                defaults={
                    "kind": Party.Kind.CUSTOMER, "gstin": "29AAACI5678D1Z8",
                    "email": "ap@initech.test", "state_code": "29",
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
            self.stdout.write(self.style.SUCCESS("Seeded demo data."))

        # 6. Inside Kuwait schema: seed Company, COA, Fiscal Year
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

        self.stdout.write(self.style.SUCCESS("Bootstrap complete."))
        self.stdout.write(f"Login at http://acme.{base_domain}/  (demo@saptta.com / Demo@1234)")
        self.stdout.write(f"Or Admin Panel at http://{base_domain}/admin/  (sp@saptta.com / Saptta@2026)")
