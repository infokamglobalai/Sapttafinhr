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
            
            # 5. Seed default shifts, departments, and leave types
            seed_tenant_defaults(tenant)
            
            logger.info("HR demo tenant seeding complete.")

    except Exception as e:
        logger.exception(f"Error seeding HR demo tenant: {e}")


def seed_tenant_defaults(tenant):
    """
    Seeds default shifts, departments, and leave types for a tenant.
    This ensures newly provisioned HR workspaces are not blank slates.
    """
    from apps.employees.models import Department
    from apps.attendance.models import Shift
    from apps.leaves.models import LeaveType
    import datetime

    logger.info(f"Seeding default organizational assets for tenant: {tenant.subdomain}")

    try:
        # 1. Seed Departments
        departments = ["Human Resources", "Information Technology", "Sales", "Finance", "Engineering"]
        for dept_name in departments:
            Department.objects.get_or_create(
                tenant=tenant,
                name=dept_name,
                defaults={"is_active": True}
            )

        # 2. Seed Shifts
        Shift.objects.get_or_create(
            tenant=tenant,
            name="Standard Shift",
            defaults={
                "start_time": datetime.time(9, 0),
                "end_time": datetime.time(18, 0),
                "grace_in_minutes": 15,
                "grace_out_minutes": 15,
                "break_duration_minutes": 60,
                "half_day_threshold_minutes": 240,
                "full_day_threshold_minutes": 360,
                "weekly_off_days": "saturday,sunday",
                "is_active": True,
            }
        )
        Shift.objects.get_or_create(
            tenant=tenant,
            name="Night Shift",
            defaults={
                "start_time": datetime.time(21, 0),
                "end_time": datetime.time(6, 0),
                "grace_in_minutes": 15,
                "grace_out_minutes": 15,
                "break_duration_minutes": 60,
                "half_day_threshold_minutes": 240,
                "full_day_threshold_minutes": 360,
                "is_night_shift": True,
                "weekly_off_days": "saturday,sunday",
                "is_active": True,
            }
        )

        # 3. Seed Leave Types
        leave_types = [
            {"name": "Casual Leave", "code": "CL", "is_paid": True, "accrual_type": "upfront", "accrual_value": 12.00, "applicable_gender": "all"},
            {"name": "Sick Leave", "code": "SL", "is_paid": True, "accrual_type": "upfront", "accrual_value": 12.00, "applicable_gender": "all"},
            {"name": "Earned Leave", "code": "EL", "is_paid": True, "accrual_type": "yearly", "accrual_value": 15.00, "applicable_gender": "all"},
            {"name": "Maternity Leave", "code": "ML", "is_paid": True, "accrual_type": "upfront", "accrual_value": 84.00, "applicable_gender": "female"},
            {"name": "Paternity Leave", "code": "PL", "is_paid": True, "accrual_type": "upfront", "accrual_value": 15.00, "applicable_gender": "male"},
            {"name": "Loss of Pay", "code": "LOP", "is_paid": False, "accrual_type": "manual", "accrual_value": 0.00, "applicable_gender": "all"},
        ]
        for lt in leave_types:
            LeaveType.objects.get_or_create(
                tenant=tenant,
                code=lt["code"],
                defaults={
                    "name": lt["name"],
                    "is_paid": lt["is_paid"],
                    "accrual_type": lt["accrual_type"],
                    "accrual_value": lt["accrual_value"],
                    "applicable_gender": lt["applicable_gender"],
                    "is_active": True,
                }
            )
        logger.info(f"Successfully seeded default organizational assets for tenant: {tenant.subdomain}")
    except Exception as e:
        logger.exception(f"Error seeding default organizational assets for tenant {tenant.subdomain}: {e}")
        raise e
