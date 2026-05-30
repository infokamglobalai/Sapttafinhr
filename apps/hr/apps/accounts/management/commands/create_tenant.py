"""
Management command: create_tenant
Interactive wizard to provision a new tenant with admin user.

Usage: python manage.py create_tenant
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Provision a new tenant and its HR admin user"

    def add_arguments(self, parser):
        parser.add_argument("--name", help="Company name")
        parser.add_argument("--subdomain", help="Subdomain slug (e.g. acmecorp)")
        parser.add_argument("--email", help="HR admin email")
        parser.add_argument("--password", help="HR admin password")

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.tenants.models import Tenant
        from apps.accounts.models import User, Role, Permission, RolePermission, UserRole

        name = options["name"] or input("Company name: ")
        subdomain = options["subdomain"] or input("Subdomain (e.g. acmecorp): ")
        email = options["email"] or input("HR admin email: ")
        password = options["password"] or input("HR admin password: ")

        if Tenant.objects.filter(subdomain=subdomain).exists():
            self.stderr.write(self.style.ERROR(f"Tenant '{subdomain}' already exists."))
            return

        tenant = Tenant.objects.create(name=name, subdomain=subdomain, status="trial")
        self.stdout.write(f"Tenant created: {tenant}")

        # Create system roles
        all_perms = list(Permission.objects.all())
        roles_config = {
            "super_admin": all_perms,
            "hr_admin": [p for p in all_perms if p.module != "reports" or True],
            "manager": [p for p in all_perms if p.codename in (
                "employees.view", "attendance.view", "attendance.regularize_others",
                "leaves.approve_own_team", "payroll.view_own",
            )],
            "employee": [p for p in all_perms if p.codename in (
                "attendance.regularize_own", "leaves.apply", "payroll.view_own",
            )],
        }

        for role_name, perms in roles_config.items():
            role, _ = Role.objects.get_or_create(
                tenant=tenant, name=role_name, defaults={"is_system": True}
            )
            for perm in perms:
                RolePermission.objects.get_or_create(role=role, permission=perm)

        self.stdout.write(f"System roles created for {subdomain}.")

        # Create HR admin user
        user = User.objects.create_user(email=email, tenant=tenant, password=password)
        admin_role = Role.objects.get(tenant=tenant, name="super_admin")
        UserRole.objects.create(user=user, role=admin_role)

        self.stdout.write(self.style.SUCCESS(
            f"\nDONE: Tenant '{subdomain}' ready.\n"
            f"  URL: http://{subdomain}.localhost:8000\n"
            f"  Admin: {email}\n"
        ))
