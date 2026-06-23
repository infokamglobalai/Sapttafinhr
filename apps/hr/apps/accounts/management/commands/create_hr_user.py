from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.tenants.models import Tenant
from apps.accounts.models import User, Role, UserRole
from apps.employees.profile_link import ensure_user_employee_profile

class Command(BaseCommand):
    help = "Create or update an HR user with a specific role on an existing tenant."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="User email")
        parser.add_argument("--password", required=True, help="User password")
        parser.add_argument("--tenant", required=True, help="Tenant subdomain slug")
        parser.add_argument("--role", default="hr_admin", help="HR role (e.g. hr_admin, super_admin, manager, employee)")

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        password = options["password"]
        subdomain = options["tenant"].strip().lower()
        role_name = options["role"].strip().lower()

        try:
            tenant = Tenant.objects.get(subdomain=subdomain)
        except Tenant.DoesNotExist:
            raise CommandError(f"Tenant with subdomain '{subdomain}' does not exist.")

        # Check if role exists for this tenant
        try:
            role = Role.objects.get(tenant=tenant, name=role_name)
        except Role.DoesNotExist:
            raise CommandError(
                f"Role '{role_name}' does not exist for tenant '{subdomain}'. "
                f"Existing roles: {list(Role.objects.filter(tenant=tenant).values_list('name', flat=True))}"
            )

        # Get or create user
        user = User.objects.filter(tenant=tenant, email__iexact=email).first()
        created = False
        if not user:
            user = User.objects.create_user(email=email, tenant=tenant, password=password)
            created = True
        else:
            user.set_password(password)
            user.is_active = True
            user.save(update_fields=["password", "is_active"])

        # Link user to role (clear others to ensure they only have this one)
        UserRole.objects.filter(user=user).delete()
        UserRole.objects.create(user=user, role=role)

        # Pre-create/link employee profile
        ensure_user_employee_profile(user, tenant=tenant)

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(
            f"Successfully {action} user '{email}' under tenant '{subdomain}' with role '{role_name}'."
        ))
