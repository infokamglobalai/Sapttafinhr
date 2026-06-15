"""
Create or refresh a demo tenant + admin user for local development.

Usage:
  python manage.py seed_dummy_login
  python manage.py seed_dummy_login --reset-password
"""
from django.core.management.base import BaseCommand
from django.db import transaction

# Default dev credentials (safe for local SQLite only)
DEFAULT_COMPANY = "Acme Pvt Ltd"
DEFAULT_SUBDOMAIN = "acme"
DEFAULT_EMAIL = "demo@saptta.com"
DEFAULT_PASSWORD = "Demo@1234"


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
        parser.add_argument("--reset-employee", action="store_true", help="Reset employee login password")
        parser.add_argument("--employee-email", default="", help="Employee user email to reset")
        parser.add_argument("--employee-password", default="Employee@1234", help="New employee password")

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
        if tenant is not None and tenant.name != name:
            tenant.name = name
            tenant.save(update_fields=["name"])
            self.stdout.write(self.style.SUCCESS(f"Updated company name to '{name}'."))

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

        if options["reset_employee"]:
            emp_email = (options["employee_email"] or "").strip().lower()
            if not emp_email:
                self.stderr.write(self.style.ERROR("--employee-email is required with --reset-employee"))
                return
            emp_user = User.objects.filter(email__iexact=emp_email, tenant=tenant).first()
            if emp_user is None:
                self.stderr.write(self.style.ERROR(f"No user found: {emp_email}"))
            else:
                emp_user.set_password(options["employee_password"])
                emp_user.is_active = True
                emp_user.save(update_fields=["password", "is_active"])
                from apps.accounts.ratelimit import clear_failures
                from django.test import RequestFactory
                req = RequestFactory().post("/", REMOTE_ADDR="127.0.0.1")
                clear_failures("login", req, emp_email)
                self.stdout.write("")
                self.stdout.write(self.style.SUCCESS(f"Employee password reset: {emp_email}"))

        self.stdout.write("")
        self.stdout.write("All workspace logins:")
        from apps.accounts.models import UserRole
        for u in User.objects.filter(tenant=tenant).order_by("email"):
            roles = list(UserRole.objects.filter(user=u).values_list("role__name", flat=True))
            self.stdout.write(f"  {u.email}  roles={roles}  active={u.is_active}")
