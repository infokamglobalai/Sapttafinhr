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
        parser.add_argument(
            "--with-demo-users",
            action="store_true",
            help="Create manager + employee demo logins (employee-login path)",
        )

    def _ensure_demo_user(self, tenant, *, email, password, role_name, emp_kwargs):
        from apps.accounts.models import Role, User, UserRole
        from apps.employees.models import Employee
        from django.utils import timezone

        user = User.objects.filter(tenant=tenant, email__iexact=email).first()
        if user is None:
            user = User.objects.create_user(email=email, tenant=tenant, password=password)
            self.stdout.write(self.style.SUCCESS(f"Created user {email}"))
        else:
            user.set_password(password)
            user.is_active = True
            user.save(update_fields=["password", "is_active"])

        role = Role.objects.get(tenant=tenant, name=role_name)
        UserRole.objects.filter(user=user).exclude(role=role).delete()
        UserRole.objects.get_or_create(user=user, role=role)

        emp = user._employee_profile_or_none() if hasattr(user, "_employee_profile_or_none") else None
        if emp is None:
            try:
                emp = user.employee_profile
            except Employee.DoesNotExist:
                emp = None
        if emp is None:
            code = emp_kwargs.pop("employee_code")
            Employee.objects.create(
                tenant=tenant,
                user=user,
                employee_code=code,
                date_of_joining=timezone.localdate(),
                employment_status="active",
                is_active=True,
                **emp_kwargs,
            )
            self.stdout.write(self.style.SUCCESS(f"Linked employee profile for {email}"))
        return user

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.accounts.models import Permission, Role, User, UserRole
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
                from apps.accounts.models import UserRole
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

        from apps.employees.profile_link import ensure_user_employee_profile

        ensure_user_employee_profile(user, tenant=tenant)

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

        # Platform superuser (sp@saptta.com) — FIN SSO handoff for HR redirect demos.
        platform_super_email = "sp@saptta.com"
        platform_super = User.objects.filter(
            email__iexact=platform_super_email, tenant=tenant
        ).first()
        if platform_super is None:
            platform_super = User.objects.create_user(
                email=platform_super_email,
                tenant=tenant,
                password="Saptta@2026",
            )
            super_role = Role.objects.get(tenant=tenant, name="super_admin")
            UserRole.objects.get_or_create(user=platform_super, role=super_role)
            self.stdout.write(self.style.SUCCESS(f"Created platform superuser {platform_super_email} for HR SSO."))

        # Kuwit demo user
        kuwit_email = "kuwit@saptta.com"
        kuwit_user = User.objects.filter(
            email__iexact=kuwit_email, tenant=tenant
        ).first()
        if kuwit_user is None:
            kuwit_user = User.objects.create_user(
                email=kuwit_email,
                tenant=tenant,
                password="Kuwit@1234",
            )
            super_role = Role.objects.get(tenant=tenant, name="super_admin")
            UserRole.objects.get_or_create(user=kuwit_user, role=super_role)
            self.stdout.write(self.style.SUCCESS(f"Created kuwit demo user {kuwit_email}."))

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

        if options["with_demo_users"]:
            mgr = self._ensure_demo_user(
                tenant,
                email="manager@saptta.local",
                password="Manager@1234",
                role_name="manager",
                emp_kwargs={
                    "employee_code": "MGR0001",
                    "first_name": "Demo",
                    "last_name": "Manager",
                    "official_email": "manager@saptta.local",
                },
            )
            emp = self._ensure_demo_user(
                tenant,
                email="employee@saptta.local",
                password="Employee@1234",
                role_name="employee",
                emp_kwargs={
                    "employee_code": "EMP9001",
                    "first_name": "Demo",
                    "last_name": "Employee",
                    "official_email": "employee@saptta.local",
                },
            )
            from apps.employees.models import Employee
            mgr_emp = mgr._employee_profile_or_none()
            emp_profile = emp._employee_profile_or_none()
            if mgr_emp and emp_profile and not emp_profile.reporting_manager_id:
                emp_profile.reporting_manager = mgr_emp
                emp_profile.save(update_fields=["reporting_manager"])
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS("-- Role demo logins (employee-login) --"))
            self.stdout.write(f"  Manager:   manager@saptta.local / Manager@1234")
            self.stdout.write(f"  Employee:  employee@saptta.local / Employee@1234")
            self.stdout.write(f"  URL:       {base}/auth/employee-login/")

        self.stdout.write("")
        self.stdout.write("All workspace logins:")
        for u in User.objects.filter(tenant=tenant).order_by("email"):
            roles = list(UserRole.objects.filter(user=u).values_list("role__name", flat=True))
            self.stdout.write(f"  {u.email}  roles={roles}  active={u.is_active}")

        self.stdout.write("")
        self.stdout.write(self.style.NOTICE(
            "Tip: run  python manage.py seed_demo_data  for employees, attendance, leaves & dashboard metrics."
        ))
