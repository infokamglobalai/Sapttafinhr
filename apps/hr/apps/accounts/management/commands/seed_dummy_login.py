"""
Create or refresh a demo tenant + admin user for local development.

Usage:
  python manage.py seed_dummy_login
  python manage.py seed_dummy_login --reset-password
"""
from django.core.management.base import BaseCommand
from django.db import transaction

# Default dev credentials (safe for local SQLite only)
DEFAULT_COMPANY = "Saptta Demo Company"
DEFAULT_SUBDOMAIN = "sapttadev"
DEFAULT_EMAIL = "admin@saptta.local"
DEFAULT_PASSWORD = "Saptta@12345"


class Command(BaseCommand):
    help = "Create demo tenant + HR admin for local login (idempotent)"

    def add_arguments(self, parser):
        parser.add_argument("--name", default=DEFAULT_COMPANY, help="Company name")
        parser.add_argument("--subdomain", default=DEFAULT_SUBDOMAIN, help="Workspace subdomain")
        parser.add_argument("--email", default=DEFAULT_EMAIL, help="Admin email")
        parser.add_argument("--password", default=DEFAULT_PASSWORD, help="Admin password")
        parser.add_argument(
            "--reset-password",
            action="store_true",
            help="Reset password on existing user",
        )
        parser.add_argument("--port", default="8001", help="Dev server port for URL hint")

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.accounts.models import Permission, User
        from apps.tenants.models import Tenant
        from apps.tenants.services import provision_tenant

        name = options["name"]
        subdomain = options["subdomain"].strip().lower()
        email = options["email"].strip().lower()
        password = options["password"]
        port = options["port"]

        if Permission.objects.count() == 0:
            self.stdout.write("Seeding permissions...")
            from django.core.management import call_command
            call_command("seed_permissions")

        tenant = Tenant.objects.filter(subdomain=subdomain).first()
        if tenant is None:
            tenant, user = provision_tenant(
                company_name=name,
                subdomain=subdomain,
                admin_email=email,
                admin_password=password,
            )
            self.stdout.write(self.style.SUCCESS(f"Created tenant '{subdomain}' and admin user."))
        else:
            user = User.objects.filter(tenant=tenant, email__iexact=email).first()
            if user is None:
                user = User.objects.create_user(
                    email=email, tenant=tenant, password=password
                )
                from apps.accounts.models import Role, UserRole
                admin_role = Role.objects.get(tenant=tenant, name="super_admin")
                UserRole.objects.get_or_create(user=user, role=admin_role)
                self.stdout.write(self.style.SUCCESS("Created admin user on existing tenant."))
            elif options["reset_password"]:
                user.set_password(password)
                user.is_active = True
                user.save(update_fields=["password", "is_active"])
                self.stdout.write(self.style.WARNING("Password reset on existing user."))
            else:
                self.stdout.write(self.style.WARNING("Demo tenant already exists (use --reset-password to change password)."))

        base = f"http://{subdomain}.localhost:{port}"
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("-- HR Saptta demo login --"))
        self.stdout.write(f"  Login URL:  {base}/auth/login/")
        self.stdout.write(f"  Dashboard:  {base}/")
        self.stdout.write(f"  Email:      {email}")
        self.stdout.write(f"  Password:   {password}")
        self.stdout.write("")
        self.stdout.write("  Alternate (plain localhost): http://localhost:{0}/auth/login/".format(port))
        self.stdout.write("  (same email/password after dev auth is enabled)")
