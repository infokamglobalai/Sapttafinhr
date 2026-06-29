"""
Populate the acme workspace with realistic HR demo data for screenshots and walkthroughs.

Creates employees, attendance, leave requests, job openings, payroll metadata, and
named logins for admin / manager / employee roles.

Usage:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --subdomain acme --reset
"""
from __future__ import annotations

import datetime
import random
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

DEFAULT_SUBDOMAIN = "acme"
TARGET_EMPLOYEES = 100

# Named demo logins (platform SSO uses demo@saptta.com / sp@saptta.com from seed_dummy_login)
DEMO_MANAGER = ("manager@saptta.com", "Demo@1234", "Rahul", "Mehta", "Engineering Manager", 6)
DEMO_EMPLOYEE = ("manju@saptta.com", "Employee@1234", "Manjunath", "Kumar", "Software Engineer", 3)

BULK_EMPLOYEES = [
    ("Priya", "Patel", "female", "Product Manager", 5, "Product"),
    ("Aarav", "Sharma", "male", "Senior Engineer", 4, "Engineering"),
    ("Ananya", "Iyer", "female", "Software Engineer", 3, "Engineering"),
    ("Vikram", "Singh", "male", "Software Engineer", 3, "Engineering"),
    ("Diya", "Reddy", "female", "Designer", 3, "Design"),
    ("Karthik", "Nair", "male", "Sales Executive", 3, "Sales"),
    ("Sneha", "Gupta", "female", "HR Executive", 3, "Human Resources"),
    ("Aditya", "Khanna", "male", "Accountant", 3, "Finance"),
    ("Riya", "Joshi", "female", "Customer Success", 3, "Customer Success"),
    ("Rohan", "Verma", "male", "QA Engineer", 3, "Quality Assurance"),
    ("Kavya", "Menon", "female", "Marketing Specialist", 3, "Marketing"),
    ("Arjun", "Das", "male", "DevOps Engineer", 4, "Engineering"),
    ("Neha", "Kapoor", "female", "Software Engineer", 3, "Engineering"),
    ("Suresh", "Rao", "male", "Operations Lead", 4, "Operations"),
    ("Pooja", "Bansal", "female", "Software Engineer", 3, "Engineering"),
    ("Nikhil", "Chopra", "male", "Intern", 1, "Engineering"),
    ("Swati", "Malhotra", "female", "Analyst", 3, "Finance"),
    ("Amit", "Yadav", "male", "Support Engineer", 3, "IT Support"),
]


class Command(BaseCommand):
    help = "Seed full HR demo data (employees, attendance, leaves, jobs) for the acme workspace"

    @staticmethod
    def _demo_iban(tenant, employee_code: str) -> str:
        """WPS-ready Kuwait IBAN or numeric account for India demos."""
        import hashlib

        if getattr(tenant, "payroll_jurisdiction", None) == "KW":
            digest = hashlib.md5(employee_code.encode()).hexdigest().upper()
            account = (digest * 2)[:22]
            return f"KW81CBKU{account}"
        digits = "".join(ch for ch in employee_code if ch.isdigit()) or "1234567890"
        return digits.zfill(12)[:12]

    @staticmethod
    def _demo_swift(tenant) -> str:
        return "NBOKKWKW" if getattr(tenant, "payroll_jurisdiction", None) == "KW" else "HDFC0001234"

    def _normalize_demo_bank_accounts(self, tenant):
        """Refresh primary bank rows so Kuwait demos pass GCC export validation."""
        from apps.employees.models import EmployeeBankAccount

        for bank in EmployeeBankAccount.objects.filter(
            employee__tenant=tenant, is_primary=True,
        ).select_related("employee"):
            code = bank.employee.employee_code
            bank.account_number = self._demo_iban(tenant, code)
            bank.ifsc_code = self._demo_swift(tenant)
            if tenant.payroll_jurisdiction == "KW":
                bank.bank_name = bank.bank_name or "National Bank of Kuwait"
            bank.is_verified = True
            bank.save()

    def add_arguments(self, parser):
        parser.add_argument("--subdomain", default=DEFAULT_SUBDOMAIN, help="Tenant subdomain")
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Remove demo employees and re-create (keeps admin users)",
        )
        parser.add_argument(
            "--skip-login",
            action="store_true",
            help="Skip seed_dummy_login (tenant + admin must already exist)",
        )

    def handle(self, *args, **options):
        random.seed(42)
        subdomain = options["subdomain"].strip().lower()

        # Handle kuwit vs kuwait subdomain spelling differences
        if subdomain == "kuwit":
            subdomain = "kuwait"

        if not options["skip_login"]:
            if subdomain == "kuwait":
                call_command(
                    "seed_dummy_login",
                    subdomain=subdomain,
                    email="kuwit@saptta.com",
                    password="Kuwit@1234",
                    name="Kuwait LLC",
                )
            else:
                call_command("seed_dummy_login", subdomain=subdomain)

        from apps.tenants.models import Tenant

        try:
            tenant = Tenant.objects.get(subdomain=subdomain)
        except Tenant.DoesNotExist as exc:
            raise CommandError(f"Tenant '{subdomain}' not found. Run seed_dummy_login first.") from exc

        # Set Kuwait defaults if it's the kuwait tenant
        if subdomain == "kuwait":
            tenant.payroll_jurisdiction = "KW"
            tenant.country = "KW"
            tenant.currency = "KWD"
            tenant.timezone = "Asia/Kuwait"
            tenant.save()

        if options["reset"]:
            self._reset_demo_employees(tenant)

        with transaction.atomic():
            org = self._ensure_org(tenant)
            from apps.payroll.bootstrap import bootstrap_payroll_for_tenant
            from apps.payroll.models import SalaryStructure

            bootstrap_payroll_for_tenant(tenant, assign_salaries=False)
            org["structure"] = SalaryStructure.objects.filter(tenant=tenant, is_active=True).first()
            manager_emp = self._ensure_persona(tenant, org, DEMO_MANAGER, role_name="manager")
            employee_emp = self._ensure_persona(tenant, org, DEMO_EMPLOYEE, role_name="employee")
            self._ensure_bulk_employees(tenant, org, manager_emp, TARGET_EMPLOYEES)
            self._seed_attendance(tenant)
            self._seed_leaves(tenant, manager_emp)
            self._seed_recruitment(tenant, org)
            self._seed_projects(tenant, org, manager_emp, employee_emp)
            tenant.employee_count = tenant.employees.filter(is_active=True).count()
            tenant.setup_complete = True
            tenant.save(update_fields=["employee_count", "setup_complete"])

        from apps.tenants.limits import ensure_seat_cap_covers_active

        # Demo seeds ~100 employees; default plan cap is 30 — leave room to add more.
        ensure_seat_cap_covers_active(tenant, headroom=25)

        call_command("seed_payroll", tenant=subdomain)
        from apps.payroll.models import EmployeeSalary, SalaryStructure

        structure = SalaryStructure.objects.filter(tenant=tenant, is_active=True).first()
        if structure:
            EmployeeSalary.objects.filter(tenant=tenant).exclude(structure=structure).update(
                structure=structure,
            )
        call_command("seed_onboarding", tenant=subdomain)
        self._seed_letter_module(tenant)
        self._seed_payroll_run(tenant)
        self._normalize_demo_bank_accounts(tenant)

        self._print_summary(tenant, manager_emp, employee_emp)

    def _reset_demo_employees(self, tenant):
        from apps.employees.models import Employee
        from apps.accounts.models import User

        protected = {"demo@saptta.com", "sp@saptta.com", "kuwit@saptta.com"}
        emps = Employee.objects.filter(tenant=tenant)
        user_ids = list(emps.exclude(user__email__in=protected).values_list("user_id", flat=True))
        deleted, _ = emps.exclude(user__email__in=protected).delete()
        User.objects.filter(id__in=[u for u in user_ids if u], tenant=tenant).exclude(
            email__in=protected
        ).delete()
        self.stdout.write(self.style.WARNING(f"Removed {deleted} demo employee rows."))

    def _ensure_org(self, tenant):
        from apps.employees.models import Department, Designation, OfficeLocation
        from apps.leaves.models import LeaveType

        dept_names = [
            "Engineering", "Product", "Design", "Sales", "Marketing",
            "Customer Success", "Finance", "Human Resources", "Operations",
            "Quality Assurance", "IT Support",
        ]
        depts = {}
        for name in dept_names:
            depts[name], _ = Department.objects.get_or_create(tenant=tenant, name=name)

        desigs = {}
        for level, name in [
            (1, "Intern"), (3, "Software Engineer"), (3, "Analyst"),
            (3, "Sales Executive"), (3, "HR Executive"), (3, "Accountant"),
            (3, "Designer"), (3, "Customer Success"), (3, "Marketing Specialist"),
            (3, "Support Engineer"), (4, "Senior Engineer"), (4, "DevOps Engineer"),
            (4, "Operations Lead"), (5, "Product Manager"), (6, "Engineering Manager"),
        ]:
            d, _ = Designation.objects.get_or_create(
                tenant=tenant, name=name, defaults={"level": level},
            )
            desigs[name] = d

        loc, _ = OfficeLocation.objects.get_or_create(
            tenant=tenant, name="Bengaluru HQ" if tenant.payroll_jurisdiction != "KW" else "Kuwait City Office",
            defaults={
                "city": "Bengaluru" if tenant.payroll_jurisdiction != "KW" else "Kuwait City",
                "state_code": "IN-KA" if tenant.payroll_jurisdiction != "KW" else "KW",
                "pincode": "560001" if tenant.payroll_jurisdiction != "KW" else "13001",
                "latitude": Decimal("12.9716") if tenant.payroll_jurisdiction != "KW" else Decimal("29.3759"),
                "longitude": Decimal("77.5946") if tenant.payroll_jurisdiction != "KW" else Decimal("47.9774"),
            },
        )

        from apps.leaves.models import HolidayCalendar, Holiday
        from apps.attendance.models import Shift

        year = timezone.localdate().year

        if tenant.payroll_jurisdiction == "KW":
            from apps.tenants.regional_packs import seed_regional_defaults
            seed_regional_defaults(tenant)
            leave_el = LeaveType.objects.filter(tenant=tenant, code="AL").first()
            leave_sl = LeaveType.objects.filter(tenant=tenant, code="SL").first()
        else:
            leave_el, _ = LeaveType.objects.get_or_create(
                tenant=tenant, code="EL",
                defaults={
                    "name": "Earned Leave", "is_paid": True,
                    "accrual_type": "upfront", "accrual_value": Decimal("18"),
                    "max_annual_balance": Decimal("18"),
                },
            )
            leave_sl, _ = LeaveType.objects.get_or_create(
                tenant=tenant, code="SL",
                defaults={
                    "name": "Sick Leave", "is_paid": True,
                    "accrual_type": "upfront", "accrual_value": Decimal("12"),
                    "max_annual_balance": Decimal("12"),
                },
            )

            cal, _ = HolidayCalendar.objects.get_or_create(
                tenant=tenant, year=year, name=f"India {year}",
                defaults={"is_default": True},
            )
            demo_holidays = [
                (datetime.date(year, 1, 26), "Republic Day"),
                (datetime.date(year, 8, 15), "Independence Day"),
                (datetime.date(year, 10, 2), "Gandhi Jayanti"),
            ]
            for hdate, hname in demo_holidays:
                Holiday.objects.get_or_create(
                    tenant=tenant, calendar=cal, holiday_date=hdate,
                    defaults={"name": hname, "holiday_type": "national"},
                )

        Shift.objects.get_or_create(
            tenant=tenant, name="General (9–6)",
            defaults={
                "start_time": datetime.time(9, 0),
                "end_time": datetime.time(18, 0),
                "grace_in_minutes": 15,
                "weekly_off_days": "saturday,sunday",
                "is_active": True,
            },
        )

        return {
            "depts": depts, "desigs": desigs, "location": loc,
            "structure": None, "leave_el": leave_el, "leave_sl": leave_sl,
        }

    def _ensure_persona(self, tenant, org, spec, role_name):
        from apps.accounts.models import User, Role, UserRole
        from apps.employees.models import Employee, EmployeeBankAccount
        from apps.payroll.models import EmployeeSalary

        email, password, first, last, desig_name, level = spec
        desig = org["desigs"].get(desig_name)
        if desig is None:
            from apps.employees.models import Designation
            desig, _ = Designation.objects.get_or_create(
                tenant=tenant, name=desig_name, defaults={"level": level},
            )
            org["desigs"][desig_name] = desig

        dept = org["depts"].get("Engineering") or list(org["depts"].values())[0]
        role = Role.objects.get(tenant=tenant, name=role_name)

        user = User.objects.filter(email__iexact=email, tenant=tenant).first()
        if user is None:
            user = User.objects.create_user(email=email, tenant=tenant, password=password)
        else:
            user.set_password(password)
            user.is_active = True
            user.save(update_fields=["password", "is_active"])

        UserRole.objects.filter(user=user).delete()
        UserRole.objects.create(user=user, role=role)

        is_kw = (tenant.payroll_jurisdiction == "KW")
        emp = Employee.objects.filter(user=user, tenant=tenant).first()
        if emp is None:
            code = self._next_employee_code(tenant)
            emp = Employee(
                tenant=tenant, user=user, employee_code=code,
                first_name=first, last_name=last,
                gender="male" if first in ("Rahul", "Manjunath", "Aarav") else "female",
                date_of_birth=datetime.date(1988, 3, 15),
                official_email=email,
                phone_primary="+96566666666" if is_kw else "+919876543210",
                department=dept, designation=desig, location=org["location"],
                work_state_code="KW" if is_kw else "IN-KA",
                employment_type="full_time", employment_status="active",
                date_of_joining=datetime.date.today() - datetime.timedelta(days=400),
                is_active=True,
            )
            if is_kw:
                emp.nationality = "KW"
                emp.is_kuwaiti_national = True
                emp.civil_id = "288031500001"
                emp.pifss_number = "10000001"
            else:
                emp.pan_number = "ABCDE1234F"
                emp.aadhaar_number = "123456789012"
                emp.uan_number = "100000000001"
            emp.save()

            if is_kw:
                ctc = Decimal("24000") if role_name == "manager" else Decimal("12000")
            else:
                ctc = Decimal("1800000") if role_name == "manager" else Decimal("960000")

            basic = (ctc * Decimal("0.40") / 12).quantize(Decimal("0.01"))
            EmployeeSalary.objects.get_or_create(
                tenant=tenant, employee=emp, structure=org["structure"],
                defaults={
                    "effective_date": emp.date_of_joining,
                    "ctc_annual": ctc, "basic_monthly": basic, "is_active": True,
                },
            )
            if not emp.bank_accounts.exists():
                bank = EmployeeBankAccount(
                    employee=emp, account_holder_name=emp.full_name,
                    bank_name="National Bank of Kuwait" if is_kw else "HDFC Bank",
                    branch_name="Sharq" if is_kw else "Bengaluru Main",
                    ifsc_code=self._demo_swift(tenant),
                    account_type="savings",
                    is_primary=True, is_verified=True,
                )
                bank.account_number = self._demo_iban(tenant, emp.employee_code)
                bank.save()

        return emp

    def _ensure_bulk_employees(self, tenant, org, manager_emp, target):
        from apps.accounts.models import User, Role, UserRole
        from apps.employees.models import Employee, EmployeeBankAccount
        from apps.payroll.models import EmployeeSalary

        active = tenant.employees.filter(is_active=True, employment_status="active").count()
        if active >= target:
            self.stdout.write(self.style.NOTICE(f"Already {active} employees — skipping bulk seed."))
            return

        employee_role = Role.objects.get(tenant=tenant, name="employee")
        created = 0

        # Build list of candidates
        bulk_specs = []
        is_kw = (tenant.payroll_jurisdiction == "KW")

        # Start with static list
        for first, last, gender, desig_name, level, dept_name in BULK_EMPLOYEES:
            bulk_specs.append((first, last, gender, desig_name, level, dept_name))

        # Fill up to target using dynamic generation
        needed = target - active
        if needed > len(bulk_specs):
            first_names_male = [
                "Aarav", "Arjun", "Aditya", "Amit", "Anoop", "Bhavesh", "Chirag", "Deepak",
                "Gaurav", "Hari", "Ishaan", "Jatin", "Karthik", "Manjunath", "Nikhil", "Pranav",
                "Rahul", "Rohan", "Sanjay", "Suresh", "Vikram", "Vivek", "Yash", "Zain",
                "Ahmed", "Faisal", "Yousef", "Ali", "Mustafa", "Hamad", "Khaled", "Omar",
                "Tariq", "Saud", "Abdul", "Nasser", "Habib", "Kareem", "Adnan", "Jamil"
            ]
            first_names_female = [
                "Ananya", "Diya", "Kavya", "Neha", "Pooja", "Priya", "Riya", "Sneha",
                "Swati", "Aisha", "Fatima", "Mariam", "Noor", "Sara", "Amal", "Dina",
                "Hessa", "Laila", "Mona", "Reem", "Salma", "Yasmin", "Zahra", "Divya",
                "Meera", "Nisha", "Shruti", "Aditi", "Tanvi", "Kiran", "Jyoti", "Preeti",
                "Farida", "Huda", "Fatma", "Noura", "Latifa", "Maha", "Alanoud", "Ghalia"
            ]
            last_names = [
                "Sharma", "Patel", "Iyer", "Singh", "Reddy", "Nair", "Gupta", "Khanna",
                "Joshi", "Verma", "Menon", "Das", "Kapoor", "Rao", "Bansal", "Chopra",
                "Malhotra", "Yadav", "Al-Sabah", "Al-Fadli", "Al-Harbi", "Al-Mutairi", "Al-Otaibi",
                "Al-Shammari", "Al-Enezi", "Al-Salem", "Al-Ghanim", "Al-Mulla", "Kumar", "Pillai",
                "Al-Kandari", "Al-Shatti", "Al-Baghli", "Al-Saeed", "Al-Haddad", "Al-Rashed"
            ]
            depts = list(org["depts"].keys())
            desigs_by_level = {}
            for name, desig in org["desigs"].items():
                level = desig.level or 3
                desigs_by_level.setdefault(level, []).append((name, level))
            if not desigs_by_level:
                desigs_by_level = {3: [("Software Engineer", 3)]}

            # Seed names randomly but reproducibly
            gen_random = random.Random(1337)
            for _ in range(needed - len(bulk_specs) + 5):
                gender = "male" if gen_random.random() < 0.5 else "female"
                first = gen_random.choice(first_names_male if gender == "male" else first_names_female)
                last = gen_random.choice(last_names)
                dept_name = gen_random.choice(depts)
                level_choices = [1] * 10 + [3] * 65 + [4] * 18 + [5] * 5 + [6] * 2
                level = gen_random.choice(level_choices)
                desig_list = desigs_by_level.get(level, desigs_by_level.get(3))
                desig_name, level = gen_random.choice(desig_list)
                bulk_specs.append((first, last, gender, desig_name, level, dept_name))

        for first, last, gender, desig_name, level, dept_name in bulk_specs:
            if tenant.employees.filter(is_active=True).count() >= target:
                break

            email = f"{first.lower()}.{last.lower()}@kuwit.demo" if is_kw else f"{first.lower()}.{last.lower()}@acme.demo"
            if User.objects.filter(email__iexact=email, tenant=tenant).exists():
                # Append numbers if there is a collision
                attempts = 1
                while attempts < 100:
                    email = f"{first.lower()}.{last.lower()}{attempts}@kuwit.demo" if is_kw else f"{first.lower()}.{last.lower()}{attempts}@acme.demo"
                    if not User.objects.filter(email__iexact=email, tenant=tenant).exists():
                        break
                    attempts += 1

            desig = org["desigs"].get(desig_name)
            dept = org["depts"].get(dept_name, list(org["depts"].values())[0])
            user = User.objects.create_user(email=email, tenant=tenant, password="Demo@1234")
            UserRole.objects.create(user=user, role=employee_role)

            if is_kw:
                # Kuwait salary in KWD (e.g. 400 - 3000 KWD monthly)
                if level == 1:
                    ctc = Decimal(str(random.randint(400, 600) * 12))
                elif level == 3:
                    ctc = Decimal(str(random.randint(800, 1500) * 12))
                elif level == 4:
                    ctc = Decimal(str(random.randint(1600, 2200) * 12))
                elif level == 5:
                    ctc = Decimal(str(random.randint(2300, 2800) * 12))
                else:
                    ctc = Decimal(str(random.randint(3000, 4500) * 12))
            else:
                # India salary in INR
                if level == 1:
                    ctc = Decimal(str(random.randint(2, 4) * 100000))
                elif level == 3:
                    ctc = Decimal(str(random.randint(5, 10) * 100000))
                elif level == 4:
                    ctc = Decimal(str(random.randint(11, 16) * 100000))
                elif level == 5:
                    ctc = Decimal(str(random.randint(17, 24) * 100000))
                else:
                    ctc = Decimal(str(random.randint(25, 45) * 100000))

            basic = (ctc * Decimal("0.40") / 12).quantize(Decimal("0.01"))
            doj = datetime.date.today() - datetime.timedelta(days=random.randint(90, 900))

            emp = Employee(
                tenant=tenant, user=user,
                employee_code=self._next_employee_code(tenant),
                first_name=first, last_name=last, gender=gender,
                date_of_birth=datetime.date(1990, 6, 1) - datetime.timedelta(days=random.randint(8000, 12000)),
                official_email=email,
                phone_primary=f"+965{random.randint(50000000, 99999999)}" if is_kw else f"+91{random.randint(7000000000, 9999999999)}",
                department=dept, designation=desig, location=org["location"],
                reporting_manager=manager_emp,
                work_state_code="KW" if is_kw else "IN-KA",
                employment_type="full_time", employment_status="active",
                date_of_joining=doj, is_active=True,
            )

            if is_kw:
                emp.nationality = "KW" if random.random() < 0.3 else random.choice(["IN", "EG", "BD", "PK"])
                emp.is_kuwaiti_national = (emp.nationality == "KW")
                emp.civil_id = "".join(str(random.randint(0, 9)) for _ in range(12))
                if emp.is_kuwaiti_national:
                    emp.pifss_number = "".join(str(random.randint(0, 9)) for _ in range(8))
                else:
                    emp.residency_number = "".join(str(random.randint(0, 9)) for _ in range(9))
                    emp.residency_expiry = datetime.date.today() + datetime.timedelta(days=random.randint(30, 730))
                emp.passport_number = "K" + "".join(str(random.randint(0, 9)) for _ in range(7))
                emp.passport_expiry = datetime.date.today() + datetime.timedelta(days=random.randint(180, 1800))
                emp.contract_type = "unlimited"
            else:
                emp.uan_number = str(random.randint(100000000000, 999999999999))
                emp.pan_number = f"ABCDE{random.randint(1000, 9999)}F"
                emp.aadhaar_number = str(random.randint(100000000000, 999999999999))

            emp.save()

            EmployeeSalary.objects.create(
                tenant=tenant, employee=emp, structure=org["structure"],
                effective_date=doj, ctc_annual=ctc, basic_monthly=basic, is_active=True,
            )

            bank_name = "National Bank of Kuwait" if is_kw else "ICICI Bank"
            branch_name = "Sharq Branch" if is_kw else "Bengaluru"
            ifsc_code = self._demo_swift(tenant)

            bank = EmployeeBankAccount(
                employee=emp, account_holder_name=emp.full_name,
                bank_name=bank_name, branch_name=branch_name,
                ifsc_code=ifsc_code, account_type="savings",
                is_primary=True, is_verified=True,
            )
            bank.account_number = self._demo_iban(tenant, emp.employee_code)
            bank.save()
            created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} bulk demo employees."))

    def _seed_attendance(self, tenant):
        from apps.attendance.models import AttendanceRecord, AttendanceRegularization
        from apps.employees.models import Employee

        today = timezone.localdate()
        employees = list(Employee.objects.filter(tenant=tenant, is_active=True))
        if not employees:
            return

        existing = set(
            AttendanceRecord.objects.filter(tenant=tenant).values_list("employee_id", "attendance_date")
        )

        to_create = []
        created = 0
        for delta in range(90):
            d = today - datetime.timedelta(days=delta)
            if d.weekday() >= 5:
                continue
            for emp in employees:
                if (emp.id, d) in existing:
                    continue
                if random.random() < 0.12:
                    continue

                first_in_hour = random.randint(8, 10)
                first_in_minute = random.randint(0, 59)
                last_out_hour = random.randint(17, 19)
                last_out_minute = random.randint(0, 59)

                first_in = timezone.make_aware(datetime.datetime.combine(d, datetime.time(first_in_hour, first_in_minute)))
                last_out = timezone.make_aware(datetime.datetime.combine(d, datetime.time(last_out_hour, last_out_minute)))

                to_create.append(
                    AttendanceRecord(
                        tenant=tenant, employee=emp, attendance_date=d,
                        status="present",
                        first_in_time=first_in,
                        last_out_time=last_out,
                        net_working_minutes=random.randint(420, 540),
                    )
                )
                created += 1

        if to_create:
            AttendanceRecord.objects.bulk_create(to_create, batch_size=1000)

        # One pending regularization for demo queue
        emp = employees[1] if len(employees) > 1 else employees[0]
        AttendanceRegularization.objects.filter(
            tenant=tenant, employee=emp, attendance_date=today - datetime.timedelta(days=2)
        ).delete()
        
        AttendanceRegularization.objects.get_or_create(
            tenant=tenant, employee=emp, attendance_date=today - datetime.timedelta(days=2),
            defaults={"reason": "Forgot to punch out", "status": "pending"},
        )
        self.stdout.write(self.style.SUCCESS(f"Attendance: {created} new day-records (90-day window)."))

    def _seed_leaves(self, tenant, manager_emp):
        from apps.employees.models import Employee
        from apps.leaves.models import LeaveRequest
        from apps.leaves.services import apply_leave, approve_leave, get_or_create_balance

        today = timezone.localdate()
        year = today.year
        employees = list(Employee.objects.filter(tenant=tenant, is_active=True))
        leave_el = tenant.leave_types.filter(code__in=["AL", "EL"]).first()
        if not leave_el or not employees:
            return

        for emp in employees:
            bal = get_or_create_balance(tenant, emp, leave_el, year)
            if bal.credited < Decimal("12"):
                bal.credited = Decimal("30") if tenant.payroll_jurisdiction == "KW" else Decimal("18")
                bal.save(update_fields=["credited"])

        manager_user = manager_emp.user

        # Approved leave — someone on leave today
        on_leave_emp = employees[2] if len(employees) > 2 else employees[0]
        LeaveRequest.objects.filter(
            tenant=tenant, employee=on_leave_emp,
            from_date__lte=today, to_date__gte=today,
        ).delete()
        try:
            req = apply_leave(
                tenant=tenant, employee=on_leave_emp, leave_type_id=leave_el.id,
                from_date=today, to_date=today,
                half_day_type="", reason="Personal errand",
            )
            approve_leave(req, actioned_by=manager_user, remarks="Approved")
        except Exception:
            pass

        # Seed some historical approved leaves over the last 90 days for variety
        historical_count = 0
        for _ in range(5):
            emp = employees[random.randint(5, min(len(employees) - 1, 30))]
            days_ago = random.randint(10, 80)
            from_dt = today - datetime.timedelta(days=days_ago)
            to_dt = from_dt + datetime.timedelta(days=random.randint(0, 2))
            
            if LeaveRequest.objects.filter(tenant=tenant, employee=emp, from_date__lte=to_dt, to_date__gte=from_dt).exists():
                continue
                
            try:
                req = apply_leave(
                    tenant=tenant, employee=emp, leave_type_id=leave_el.id,
                    from_date=from_dt, to_date=to_dt,
                    half_day_type="", reason="Vacation",
                )
                approve_leave(req, actioned_by=manager_user, remarks="Enjoy your time off!")
                historical_count += 1
            except Exception:
                pass

        # Pending leave requests for admin/manager queue
        def _next_weekday(start_offset):
            d = today + datetime.timedelta(days=start_offset)
            while d.weekday() >= 5:
                d += datetime.timedelta(days=1)
            return d

        pending_specs = [
            (employees[3], _next_weekday(7), _next_weekday(9), "Family function"),
            (employees[4], _next_weekday(14), _next_weekday(14), "Medical appointment"),
            (employees[5], _next_weekday(21), _next_weekday(25), "Annual holiday"),
        ]
        for emp, start, end, reason in pending_specs:
            if LeaveRequest.objects.filter(
                tenant=tenant, employee=emp, status="pending",
                from_date=start,
            ).exists():
                continue
            try:
                apply_leave(
                    tenant=tenant, employee=emp, leave_type_id=leave_el.id,
                    from_date=start, to_date=end,
                    half_day_type="", reason=reason,
                )
            except Exception as exc:
                from apps.leaves.services import count_leave_days
                days = count_leave_days(leave_el, start, end, "", tenant)
                if days > 0:
                    LeaveRequest.objects.create(
                        tenant=tenant, employee=emp, leave_type=leave_el,
                        from_date=start, to_date=end, total_days=days,
                        half_day_type="", reason=reason, status="pending",
                    )
                else:
                    self.stdout.write(self.style.WARNING(f"Skip leave for {emp.full_name}: {exc}"))

        pending = LeaveRequest.objects.filter(tenant=tenant, status="pending").count()
        self.stdout.write(self.style.SUCCESS(f"Leave: balances set, {historical_count} historical approved, {pending} pending request(s)."))

    def _seed_recruitment(self, tenant, org):
        from apps.recruitment.models import JobOpening, Candidate, JobApplication

        dept = org["depts"].get("Engineering")
        desig = org["desigs"].get("Software Engineer")
        jobs_spec = [
            ("Senior Software Engineer", "published"),
            ("Product Designer", "published"),
        ]
        for title, status in jobs_spec:
            job, _ = JobOpening.objects.get_or_create(
                tenant=tenant, title=title,
                defaults={
                    "department": dept, "designation": desig,
                    "location": org["location"], "status": status,
                    "positions_count": 2, "employment_type": "full_time",
                    "description": f"Demo opening: {title}",
                },
            )
            if job.status != status:
                job.status = status
                job.save(update_fields=["status"])

            cand_email = f"candidate.{title.split()[0].lower()}@mail.demo"
            cand, _ = Candidate.objects.get_or_create(
                tenant=tenant, email=cand_email,
                defaults={"first_name": "Demo", "last_name": "Candidate", "source": "linkedin"},
            )
            JobApplication.objects.get_or_create(
                tenant=tenant, job_opening=job, candidate=cand,
                defaults={"status": "screening"},
            )

        published = JobOpening.objects.filter(tenant=tenant, status="published").count()
        self.stdout.write(self.style.SUCCESS(f"Recruitment: {published} published job(s)."))

    def _seed_projects(self, tenant, org, manager_emp, employee_emp):
        from apps.accounts.models import User
        from apps.employees.models import Employee
        from apps.projects.models import Project, ProjectMember

        admin = User.objects.filter(tenant=tenant, email__iexact="demo@saptta.com").first()
        dept_eng = org["depts"].get("Engineering")
        dept_prod = org["depts"].get("Product")
        dept_cs = org["depts"].get("Customer Success")
        today = timezone.localdate()

        extras = list(
            Employee.objects.filter(tenant=tenant, department=dept_eng, is_active=True)
            .exclude(pk__in=[manager_emp.pk, employee_emp.pk])
            .order_by("first_name", "last_name")[:2]
        )

        specs = [
            (
                "WEB-01", "Website Revamp", "active", dept_eng, manager_emp,
                [employee_emp, *extras],
                "Rebuild marketing site and customer self-service portal.",
            ),
            (
                "PROD-Q3", "Q3 Product Launch", "planning", dept_prod, manager_emp,
                [employee_emp],
                "Enterprise feature rollout and GTM coordination.",
            ),
            (
                "CS-ONB", "Customer Onboarding Playbook", "completed", dept_cs, manager_emp,
                [employee_emp],
                "Standardize onboarding checklists for new accounts.",
            ),
        ]

        for code, name, status, dept, lead, members, description in specs:
            project, _ = Project.objects.update_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "name": name,
                    "status": status,
                    "department": dept,
                    "lead": lead,
                    "description": description,
                    "created_by": admin,
                    "start_date": today.replace(day=1),
                },
            )
            ProjectMember.objects.get_or_create(
                project=project, employee=lead, defaults={"role": "lead"},
            )
            for member in members:
                if member.pk == lead.pk:
                    continue
                ProjectMember.objects.get_or_create(
                    project=project, employee=member, defaults={"role": "member"},
                )

        count = Project.objects.filter(tenant=tenant).count()
        self.stdout.write(self.style.SUCCESS(f"Projects: {count} demo project(s)."))

    def _seed_payroll_run(self, tenant):
        """Create last 3 months' payroll with records, payslips, and ESS publish."""
        import calendar

        from apps.accounts.models import User
        from apps.payroll.models import EmployeeSalary, PayrollRun, Payslip
        from apps.payroll.review_services import prepare_month_attendance
        from apps.payroll.tasks import generate_payslips_for_run, run_payroll_for_tenant

        today = timezone.localdate()
        admin_email = "kuwit@saptta.com" if tenant.payroll_jurisdiction == "KW" else "demo@saptta.com"
        admin = User.objects.filter(tenant=tenant, email__iexact=admin_email).first()
        if not admin:
            admin = User.objects.filter(tenant=tenant, is_staff=True).first()

        # Seed payroll for the last 3 completed months
        for i in range(3, 0, -1):
            d = today
            for _ in range(i):
                d = d.replace(day=1) - datetime.timedelta(days=1)
            year, month = d.year, d.month
            month_end = datetime.date(year, month, calendar.monthrange(year, month)[1])

            # Salaries effective after the payroll month cannot be processed
            EmployeeSalary.objects.filter(
                tenant=tenant, is_active=True, effective_date__gt=month_end,
            ).update(effective_date=datetime.date(year, month, 1))

            run = PayrollRun.objects.filter(tenant=tenant, year=year, month=month).first()
            published = Payslip.objects.filter(
                tenant=tenant, year=year, month=month, is_published=True,
            ).count()
            if run and run.records.exists() and published > 0:
                self.stdout.write(self.style.NOTICE(
                    f"Payroll {year}-{month:02d} already has {published} published payslip(s) — skip."
                ))
                continue

            prepare_month_attendance(tenant, year, month)
            run, _ = PayrollRun.objects.update_or_create(
                tenant=tenant, year=year, month=month,
                defaults={"status": "draft", "run_by": admin},
            )

            if not run.records.exists():
                run.status = "draft"
                run.save(update_fields=["status"])
                run_payroll_for_tenant(str(tenant.id), run.id)
                run.refresh_from_db()

            if run.status == "review":
                run.status = "approved"
                run.approved_by = admin
                run.approved_at = timezone.now()
                run.save(update_fields=["status", "approved_by", "approved_at"])
                run.records.all().update(is_locked=True, locked_at=timezone.now())
                try:
                    generate_payslips_for_run(run.id)
                except Exception as exc:
                    self.stdout.write(self.style.WARNING(f"Payslip PDF generation skipped: {exc}"))

            Payslip.objects.filter(
                tenant=tenant, year=year, month=month, is_published=False,
            ).update(is_published=True, published_at=timezone.now())

            run.status = "paid"
            run.paid_at = timezone.now()
            run.save(update_fields=["status", "paid_at"])

            slip_count = Payslip.objects.filter(tenant=tenant, year=year, month=month).count()
            record_count = run.records.count()
            self.stdout.write(self.style.SUCCESS(
                f"Payroll {year}-{month:02d}: {record_count} records, "
                f"{slip_count} payslip(s) published for ESS."
            ))

    def _next_employee_code(self, tenant):
        from apps.employees.models import Employee

        existing = set(
            Employee.objects.filter(tenant=tenant).values_list("employee_code", flat=True)
        )
        n = 1
        while f"EMP{n:04d}" in existing:
            n += 1
        return f"EMP{n:04d}"

    def _seed_letter_module(self, tenant):
        """Default letter templates + company letterhead for demo/testing."""
        from apps.accounts.models import User
        from apps.hr_ops.letter_company import get_company_profile, save_company_profile
        from apps.hr_ops.letter_services import seed_default_letter_templates

        admin = (
            User.objects.filter(tenant=tenant, email__iexact="demo@saptta.com").first()
            or User.objects.filter(tenant=tenant, email__iexact="kuwit@saptta.com").first()
            or User.objects.filter(tenant=tenant).order_by("id").first()
        )
        created, skipped = seed_default_letter_templates(tenant, created_by=admin)
        profile = get_company_profile(tenant)
        if not profile.signatory_name:
            save_company_profile(tenant, {
                "display_name": tenant.name,
                "address": tenant.address or "123 Business Park, Indiranagar",
                "city": "Kuwait City" if tenant.payroll_jurisdiction == "KW" else "Bengaluru, Karnataka",
                "signatory_name": "Priya Sharma",
                "signatory_title": "Director — Human Resources",
                "contact_email": "hr@saptta.com",
                "contact_phone": "+91 98765 43210",
                "ref_prefix": "HR",
                "footer_text": "Confidential · Official company document",
            })
        self.stdout.write(
            self.style.SUCCESS(f"Letter module: {created} template(s) installed, {skipped} already present.")
        )

    def _print_summary(self, tenant, manager_emp, employee_emp):
        from apps.employees.models import Employee
        from apps.attendance.models import AttendanceRecord
        from apps.leaves.models import LeaveRequest
        from apps.projects.models import Project

        today = timezone.localdate()
        total = Employee.objects.filter(tenant=tenant, is_active=True).count()
        present = AttendanceRecord.objects.filter(
            tenant=tenant, attendance_date=today, status="present",
        ).count()
        pending = LeaveRequest.objects.filter(tenant=tenant, status="pending").count()
        projects = Project.objects.filter(tenant=tenant).count()

        admin_email = "kuwit@saptta.com" if tenant.payroll_jurisdiction == "KW" else "demo@saptta.com"
        admin_pass = "Kuwit@1234" if tenant.payroll_jurisdiction == "KW" else "Demo@1234"

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  HR demo data ready"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(f"  Workspace:  {tenant.name} ({tenant.subdomain})")
        self.stdout.write(f"  Employees:  {total} active | {present} present today | {pending} leave pending | {projects} projects")
        self.stdout.write("")
        self.stdout.write("  Log in via platform:")
        self.stdout.write(f"    Admin     {admin_email}      / {admin_pass}")
        self.stdout.write("    Super     sp@saptta.com        / Saptta@2026")
        self.stdout.write("")
        self.stdout.write("  HR-native logins (employee portal / manager views):")
        self.stdout.write(f"    Manager   {manager_emp.user.email}  / Demo@1234")
        self.stdout.write(f"    Employee  {employee_emp.user.email}   / Employee@1234")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
