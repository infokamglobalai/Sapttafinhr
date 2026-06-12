import logging
from django.db import transaction

logger = logging.getLogger(__name__)


def seed_hr_demo_tenant(sender, **kwargs):
    # This receiver runs when migrations finish for the apps.tenants.
    # HR is a single-database tenant system (uses tenant FK).
    
    from apps.accounts.models import Permission, Role, RolePermission, User, UserRole
    from apps.tenants.models import Tenant, ProductCode, ProductEntitlement

    logger.info("Initializing HR tenant seeding...")

    try:
        with transaction.atomic():
            # 1. Create/Get Tenant demo
            tenant, created = Tenant.objects.get_or_create(
                subdomain="demo",
                defaults={
                    "name": "Demo Company",
                    "status": "trial",
                    "plan": "trial",
                    "setup_complete": True,
                }
            )
            if not created:
                tenant.status = "trial"
                tenant.setup_complete = True
                tenant.save(update_fields=["status", "setup_complete"])
                logger.info("Ensured existing HR demo tenant is active.")
            else:
                logger.info("Created HR demo tenant.")

            # 2. Seed standard roles and permissions if they don't exist
            all_perms = list(Permission.objects.all())
            roles_config = {
                "super_admin": all_perms,
                "hr_admin": all_perms,
                "manager": [p for p in all_perms if p.codename in (
                    "employees.view", "attendance.view", "attendance.regularize_others",
                    "leaves.approve_own_team", "payroll.view_own",
                )],
                "employee": [p for p in all_perms if p.codename in (
                    "attendance.regularize_own", "leaves.apply", "payroll.view_own",
                )],
            }
            
            for role_name, perms in roles_config.items():
                role, r_created = Role.objects.get_or_create(
                    tenant=tenant, name=role_name, defaults={"is_system": True}
                )
                for perm in perms:
                    RolePermission.objects.get_or_create(role=role, permission=perm)

            # 3. Create/Ensure Demo User with super_admin role
            user = User.objects.filter(email="demo@saptta.com", tenant=tenant).first()
            if not user:
                user = User.objects.create_user(
                    email="demo@saptta.com",
                    tenant=tenant,
                    password="demo12345"
                )
                logger.info("Created HR demo user: demo@saptta.com")
            else:
                user.is_active = True
                user.save()

            # Ensure user has the super_admin role
            super_admin_role = Role.objects.get(tenant=tenant, name="super_admin")
            UserRole.objects.get_or_create(user=user, role=super_admin_role)

            # 4. Ensure product entitlement is trial/active
            ProductEntitlement.objects.update_or_create(
                tenant=tenant,
                product=ProductCode.HR,
                defaults={"status": ProductEntitlement.Status.TRIAL}
            )
            logger.info("HR demo tenant seeding complete.")

    except Exception as e:
        logger.exception(f"Error seeding HR demo tenant: {e}")
