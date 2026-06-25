import os
import logging
from datetime import date, timedelta
from django.conf import settings
from django.db import connection, transaction
from django_tenants.utils import schema_context

logger = logging.getLogger(__name__)


def seed_platform_and_demo_tenant(sender, **kwargs):
    # This receiver runs when migrations finish for the apps.core.
    # It must execute only on the public schema context.
    if connection.schema_name != "public":
        return

    logger.info("Initializing platform seeding for public schema...")

    # 1. Platform Super Admin (SaaS Superuser)
    email = os.environ.get("SAAS_SUPERADMIN_EMAIL", "admin@saptta.com").strip().lower()
    password = os.environ.get("SAAS_SUPERADMIN_PASSWORD", "admin12345")

    from apps.identity.models import User
    try:
        user = User.objects.filter(email=email).first()
        if not user:
            user = User.objects.create_superuser(
                email=email,
                password=password,
                full_name="Platform Super Admin"
            )
            logger.info(f"Created platform superuser: {email}")
        else:
            # Idempotency check: ensure superuser and staff flags are active
            user.is_superuser = True
            user.is_staff = True
            user.is_verified = True
            user.save()
            logger.info(f"Platform superuser verified: {email}")
    except Exception as e:
        logger.exception(f"Error creating/ensuring platform superadmin: {e}")

    # 2. Public Tenant Setup (required by django-tenants)
    from apps.core.models import Tenant, Domain
    public_tenant, created = Tenant.objects.get_or_create(
        schema_name="public",
        defaults={"name": "Public Schema"}
    )
    if created:
        logger.info("Created public tenant.")
    Domain.objects.get_or_create(
        domain="localhost",
        tenant=public_tenant,
        defaults={"is_primary": True}
    )

    # 3. Create or Get Demo Tenant
    demo_tenant, demo_created = Tenant.objects.get_or_create(
        schema_name="demo",
        defaults={
            "name": "Demo Company",
            "billing_email": "demo@saptta.com",
        }
    )
    if not demo_tenant.billing_email:
        demo_tenant.billing_email = "demo@saptta.com"
        demo_tenant.save(update_fields=["billing_email"])

    if demo_created:
        logger.info("Created Demo Company Tenant schema.")

    # Ensure domains exist for the demo tenant
    Domain.objects.get_or_create(
        domain="demo.localhost",
        tenant=demo_tenant,
        defaults={"is_primary": True}
    )
    Domain.objects.get_or_create(
        domain="demo.saptta.com",
        tenant=demo_tenant,
        defaults={"is_primary": False}
    )

    # 4. Modules and Plans (FIN and HR)
    from apps.saas.models import Module, Plan, Subscription, SubscriptionEntitlement, CompanyModule, ProductCode
    
    fin_module, _ = Module.objects.get_or_create(
        code="FIN",
        defaults={"name": "Accounting & Finance"}
    )
    hr_module, _ = Module.objects.get_or_create(
        code="HR",
        defaults={"name": "HRMS"}
    )

    plan, _ = Plan.objects.get_or_create(
        code="saptta-complete",
        defaults={
            "name": "Saptta Complete",
            "description": "Premium All-in-One Plan",
            "monthly_price": 0,
            "annual_price": 0,
            "features": {"products": [ProductCode.FIN, ProductCode.HR]}
        }
    )
    plan.modules.add(fin_module, hr_module)

    # Connect demo tenant to modules
    CompanyModule.objects.get_or_create(company=demo_tenant, module=fin_module, defaults={"is_active": True})
    CompanyModule.objects.get_or_create(company=demo_tenant, module=hr_module, defaults={"is_active": True})

    # Ensure demo tenant has active subscription to the plan
    sub, sub_created = Subscription.objects.get_or_create(
        tenant=demo_tenant,
        defaults={
            "plan": plan,
            "status": Subscription.Status.ACTIVE,
            "current_period_start": date.today(),
            "current_period_end": date.today() + timedelta(days=3650), # 10 years for demo
        }
    )
    if not sub_created:
        sub.plan = plan
        sub.status = Subscription.Status.ACTIVE
        sub.save(update_fields=["plan", "status"])

    # Ensure active entitlements for both modules
    for product in [ProductCode.FIN, ProductCode.HR]:
        SubscriptionEntitlement.objects.update_or_create(
            subscription=sub,
            product=product,
            defaults={"status": SubscriptionEntitlement.Status.ACTIVE}
        )

    # 5. Create Demo User on the platform (public schema)
    demo_user = User.objects.filter(email="demo@saptta.com").first()
    if not demo_user:
        demo_user = User.objects.create_user(
            email="demo@saptta.com",
            password="demo12345",
            full_name="Demo Admin"
        )
        demo_user.is_verified = True
        demo_user.save()
        logger.info("Created public demo user: demo@saptta.com")
    else:
        # Save triggers password lock check, which is fine since password is unchanged.
        # But let's verify is_verified is set.
        demo_user.is_verified = True
        demo_user.save()

    # 6. Seed roles/permissions inside "demo" tenant schema
    from apps.saas.signup_views import SignupView
    SignupView._seed_tenant_roles("demo", [ProductCode.FIN, ProductCode.HR], demo_user)

    # 7. Seed Finance Master Data inside "demo" schema context
    with schema_context("demo"):
        from apps.masters.models import Company, FiscalYear, HSNCode, Item, Party
        from apps.masters.coa_template import seed_coa
        
        company, created = Company.objects.get_or_create(
            name="Demo Company",
            defaults={
                "legal_name": "Demo Company Pvt Ltd",
                "state_code": "27",  # Maharashtra
                "base_currency": "INR",
            }
        )
        if created:
            logger.info("Created demo company inside demo schema.")
        
        seed_coa(company)

        # Fiscal Year Calculation
        today = date.today()
        if today.month >= 4:
            start = date(today.year, 4, 1)
            end = date(today.year + 1, 3, 31)
        else:
            start = date(today.year - 1, 4, 1)
            end = date(today.year, 3, 31)
        fy_name = f"FY{str(start.year)[-2:]}-{str(end.year)[-2:]}"
        
        FiscalYear.objects.get_or_create(
            company=company,
            name=fy_name,
            defaults={"start_date": start, "end_date": end, "is_active": True}
        )

        # Seed Demo HSN Codes
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

        # Seed Demo Items
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

        # Seed Demo Parties
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

    # 8. Asynchronously/Sync provision the HR demo tenant (server-to-server)
    try:
        SignupView._provision_hr(
            name="Demo Company",
            subdomain="demo",
            email="demo@saptta.com"
        )
        logger.info("Triggered server-to-server HR provision for demo tenant.")
    except Exception as e:
        logger.warning(f"Could not trigger server-to-server HR provision: {e}")
