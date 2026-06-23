from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.tenants.models import Tenant
from apps.accounts.models import User, Role, UserRole
from apps.employees.profile_link import ensure_user_employee_profile

class Command(BaseCommand):
    help = "Create or update an HR user with a specific role on a tenant (auto-creates tenant if missing)."

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

        created_tenant = False
        try:
            tenant = Tenant.objects.get(subdomain=subdomain)
        except Tenant.DoesNotExist:
            self.stdout.write(self.style.WARNING(f"Tenant with subdomain '{subdomain}' does not exist. Creating it..."))
            from apps.tenants.services import provision_tenant
            tenant, _ = provision_tenant(
                company_name=subdomain.upper(),
                subdomain=subdomain,
                admin_email=email,
                admin_password=password,
            )
            created_tenant = True

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
        created_user = False
        if not user:
            user = User.objects.create_user(email=email, tenant=tenant, password=password)
            created_user = True
        else:
            # If the tenant was just created, provision_tenant already created the user.
            # We still ensure their password is set correctly.
            user.set_password(password)
            user.is_active = True
            user.save(update_fields=["password", "is_active"])

        # Link user to role (clear others to ensure they only have this one)
        UserRole.objects.filter(user=user).delete()
        UserRole.objects.create(user=user, role=role)

        # Pre-create/link employee profile
        ensure_user_employee_profile(user, tenant=tenant)

        msg = []
        if created_tenant:
            msg.append(f"created tenant '{subdomain}'")
        if created_user or created_tenant:
            msg.append(f"created user '{email}'")
        else:
            msg.append(f"updated user '{email}'")
        msg.append(f"assigned role '{role_name}'")

        self.stdout.write(self.style.SUCCESS(
            f"Successfully: {', '.join(msg)}."
        ))

