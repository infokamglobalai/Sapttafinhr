"""
Seed realistic Indian employees into a tenant for demos, load-testing, and screenshots.

Usage:
    python manage.py seed_employees --tenant demo --count 200
    python manage.py seed_employees --tenant demo --count 50 --reset
"""
import datetime
import random
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.crypto import get_random_string


FIRST_NAMES_M = [
    "Aarav", "Vihaan", "Aditya", "Arjun", "Reyansh", "Sai", "Krishna", "Ishaan",
    "Rohan", "Karthik", "Aryan", "Dhruv", "Kabir", "Aryan", "Mohammed", "Rahul",
    "Siddharth", "Anirudh", "Rishi", "Yash", "Tanmay", "Pranav", "Akash", "Nikhil",
    "Vivek", "Aman", "Harsh", "Manish", "Amit", "Sandeep", "Rajat", "Anand",
    "Suresh", "Ramesh", "Vikram", "Ajay", "Sanjay", "Deepak", "Praveen", "Naveen",
    "Ravi", "Sachin", "Mukesh", "Mahesh", "Dinesh", "Vinod", "Sunil", "Anil",
    "Abdul", "Faisal",
]
FIRST_NAMES_F = [
    "Aanya", "Saanvi", "Aadhya", "Ananya", "Diya", "Pari", "Anika", "Navya",
    "Sara", "Aisha", "Myra", "Aarohi", "Riya", "Priya", "Pooja", "Neha",
    "Shruti", "Sneha", "Divya", "Kavya", "Megha", "Swati", "Shreya", "Nisha",
    "Anjali", "Ritu", "Sunita", "Sushma", "Geeta", "Sita", "Lakshmi", "Radha",
    "Meera", "Asha", "Usha", "Sapna", "Roshni", "Anushka", "Tanvi", "Mansi",
    "Vidya", "Bhavna", "Komal", "Preeti", "Ekta", "Fatima", "Zoya", "Nazia",
    "Ishita", "Aditi",
]
LAST_NAMES = [
    "Sharma", "Verma", "Singh", "Kumar", "Patel", "Reddy", "Gupta", "Iyer",
    "Nair", "Menon", "Rao", "Pillai", "Mehta", "Shah", "Joshi", "Trivedi",
    "Chatterjee", "Banerjee", "Mukherjee", "Bose", "Das", "Sen", "Ghosh",
    "Khanna", "Kapoor", "Malhotra", "Chopra", "Bhatia", "Sethi", "Aggarwal",
    "Mishra", "Pandey", "Tiwari", "Shukla", "Dwivedi", "Saxena", "Goyal",
    "Bansal", "Jain", "Agrawal", "Goel", "Mittal", "Garg", "Sinha", "Yadav",
    "Chauhan", "Rathod", "Khan", "Ali", "Khurana",
]

DEPARTMENTS = [
    "Engineering", "Product", "Design", "Sales", "Marketing",
    "Customer Success", "Finance", "Human Resources", "Operations",
    "Legal", "IT Support", "Quality Assurance",
]

DESIGNATIONS_BY_LEVEL = [
    # (level, designation, salary_band_lakh)
    (1, "Intern",                   (3, 5)),
    (2, "Associate",                (5, 8)),
    (3, "Engineer",                 (8, 14)),
    (3, "Analyst",                  (7, 12)),
    (3, "Executive",                (6, 10)),
    (4, "Senior Engineer",          (15, 24)),
    (4, "Senior Analyst",           (14, 22)),
    (4, "Specialist",               (12, 20)),
    (5, "Lead Engineer",            (24, 38)),
    (5, "Team Lead",                (22, 34)),
    (5, "Senior Manager",           (28, 42)),
    (6, "Engineering Manager",      (36, 55)),
    (6, "Product Manager",          (35, 55)),
    (6, "Director",                 (45, 75)),
    (7, "VP",                       (70, 120)),
]

LOCATIONS = [
    ("Bengaluru HQ", "Bengaluru", "IN-KA", "560001",  12.9716,  77.5946),
    ("Mumbai Office", "Mumbai",   "IN-MH", "400001",  19.0760,  72.8777),
    ("Delhi Office", "New Delhi", "IN-DL", "110001",  28.6139,  77.2090),
    ("Hyderabad Office", "Hyderabad", "IN-TG", "500001", 17.3850, 78.4867),
    ("Chennai Office", "Chennai",  "IN-TN", "600001",  13.0827,  80.2707),
    ("Pune Office", "Pune",       "IN-MH", "411001",  18.5204,  73.8567),
]

BANKS = [
    ("HDFC Bank", "HDFC"),
    ("ICICI Bank", "ICIC"),
    ("State Bank of India", "SBIN"),
    ("Axis Bank", "UTIB"),
    ("Kotak Mahindra Bank", "KKBK"),
    ("Yes Bank", "YESB"),
    ("IDFC First Bank", "IDFB"),
]


def gen_pan() -> str:
    """Plausible-looking PAN: ABCDE1234F"""
    letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    return (
        "".join(random.choices(letters, k=5))
        + "".join(random.choices("0123456789", k=4))
        + random.choice(letters)
    )


def gen_aadhaar() -> str:
    return "".join(random.choices("0123456789", k=12))


def gen_uan() -> str:
    return "".join(random.choices("0123456789", k=12))


def gen_esi() -> str:
    return "".join(random.choices("0123456789", k=10))


def gen_ifsc(bank_code: str) -> str:
    return f"{bank_code}0{random.randint(100000, 999999)}"


def gen_account_number() -> str:
    return "".join(random.choices("0123456789", k=random.choice([11, 12, 14])))


def gen_phone() -> str:
    return f"+91{random.choice('6789')}{random.randint(100000000, 999999999)}"


def gen_pincode() -> str:
    return str(random.randint(110001, 999999))


class Command(BaseCommand):
    help = "Seed realistic Indian employees into a tenant for demo/testing."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", required=True, help="Tenant subdomain")
        parser.add_argument("--count", type=int, default=200, help="How many employees to create")
        parser.add_argument("--reset", action="store_true",
                            help="DELETE all existing employees (except those with logins) first")

    def handle(self, *args, **opts):
        from apps.tenants.models import Tenant
        from apps.employees.models import (
            Employee, Department, Designation, OfficeLocation, EmployeeBankAccount,
        )
        from apps.payroll.models import SalaryStructure, EmployeeSalary
        from apps.accounts.models import User, Role, UserRole

        try:
            tenant = Tenant.objects.get(subdomain=opts["tenant"])
        except Tenant.DoesNotExist:
            raise CommandError(f"Tenant '{opts['tenant']}' not found.")

        count = opts["count"]
        self.stdout.write(self.style.NOTICE(f"Seeding {count} employees into '{tenant.subdomain}'..."))

        if opts["reset"]:
            confirm = input(f"  Delete all existing employees in {tenant.subdomain}? Type 'yes': ")
            if confirm.strip().lower() == "yes":
                deleted, _ = Employee.objects.filter(tenant=tenant).delete()
                self.stdout.write(self.style.WARNING(f"  Deleted {deleted} existing employee rows."))

        # ── Pre-seed org structure ───────────────────────────────────────────
        with transaction.atomic():
            depts = []
            for name in DEPARTMENTS:
                d, _ = Department.objects.get_or_create(tenant=tenant, name=name)
                depts.append(d)

            desigs = []
            for level, name, band in DESIGNATIONS_BY_LEVEL:
                d, created = Designation.objects.get_or_create(
                    tenant=tenant, name=name, defaults={"level": level},
                )
                desigs.append((d, band))

            locs = []
            for name, city, state, pincode, lat, lng in LOCATIONS:
                loc, _ = OfficeLocation.objects.get_or_create(
                    tenant=tenant, name=name,
                    defaults={"city": city, "state_code": state, "pincode": pincode,
                              "latitude": Decimal(str(lat)), "longitude": Decimal(str(lng))},
                )
                locs.append(loc)

            structure, _ = SalaryStructure.objects.get_or_create(
                tenant=tenant, name="Standard India",
                defaults={"description": "Auto-created by seed_employees", "is_active": True},
            )

            employee_role = Role.objects.filter(tenant=tenant, name="employee").first()

        # ── Find a starting employee code that doesn't collide ──────────────
        existing_codes = set(Employee.objects.filter(tenant=tenant).values_list("employee_code", flat=True))
        next_num = 1
        while f"EMP{next_num:04d}" in existing_codes:
            next_num += 1

        created = 0
        managers_so_far = []  # for assigning reporting managers

        with transaction.atomic():
            for i in range(count):
                gender = random.choices(["male", "female", "other"], weights=[55, 43, 2])[0]
                first = random.choice(FIRST_NAMES_F if gender == "female" else FIRST_NAMES_M)
                last = random.choice(LAST_NAMES)
                code = f"EMP{next_num:04d}"
                next_num += 1

                dept = random.choice(depts)
                desig, band = random.choice(desigs)
                loc = random.choice(locs)

                # Salary
                ctc_lakh = random.uniform(band[0], band[1])
                ctc_annual = Decimal(str(round(ctc_lakh * 100000, -2)))  # round to nearest 100
                basic_monthly = (ctc_annual * Decimal("0.40") / 12).quantize(Decimal("0.01"))

                # DOJ between 8 years ago and 1 month ago
                days_back = random.randint(30, 365 * 8)
                doj = datetime.date.today() - datetime.timedelta(days=days_back)
                # DOB: between 23 and 55 years old
                dob = datetime.date.today() - datetime.timedelta(days=random.randint(23 * 365, 55 * 365))

                official_email = (
                    f"{first.lower()}.{last.lower()}{random.randint(1, 99)}"
                    f"@{tenant.subdomain}.com"
                )

                # Create user account (without notifications)
                user = User.objects.create_user(
                    email=official_email, tenant=tenant,
                    password=get_random_string(14),
                )
                if employee_role:
                    UserRole.objects.create(user=user, role=employee_role)

                # Pick a reporting manager: 25% chance, from earlier high-level hires
                reporting_manager = None
                high_level_mgrs = [m for m in managers_so_far if m.designation and m.designation.level and m.designation.level >= 5]
                if high_level_mgrs and random.random() < 0.7:
                    reporting_manager = random.choice(high_level_mgrs)

                emp = Employee(
                    tenant=tenant,
                    user=user,
                    employee_code=code,
                    first_name=first,
                    last_name=last,
                    gender=gender,
                    date_of_birth=dob,
                    personal_email=f"{first.lower()}.{last.lower()}{random.randint(1, 999)}@gmail.com",
                    official_email=official_email,
                    phone_primary=gen_phone(),
                    department=dept,
                    designation=desig,
                    location=loc,
                    reporting_manager=reporting_manager,
                    work_state_code=loc.state_code,
                    employment_type="full_time",
                    employment_status="active",
                    date_of_joining=doj,
                    uan_number=gen_uan(),
                    esi_number=gen_esi() if ctc_annual <= Decimal("252000") else "",  # ESI only for low-wage
                    is_active=True,
                )
                emp.pan_number = gen_pan()
                emp.aadhaar_number = gen_aadhaar()
                emp.save()

                # Salary
                EmployeeSalary.objects.create(
                    tenant=tenant, employee=emp, structure=structure,
                    effective_date=doj,
                    ctc_annual=ctc_annual, basic_monthly=basic_monthly,
                    is_active=True,
                )

                # Bank account
                bank_name, bank_code = random.choice(BANKS)
                bank = EmployeeBankAccount(
                    employee=emp,
                    account_holder_name=emp.full_name,
                    bank_name=bank_name,
                    branch_name=f"{loc.city} Main",
                    ifsc_code=gen_ifsc(bank_code),
                    account_type="savings",
                    is_primary=True,
                    is_verified=True,
                )
                bank.account_number = gen_account_number()
                bank.save()

                # Track potential future managers
                if desig.level and desig.level >= 5:
                    managers_so_far.append(emp)

                created += 1
                if created % 25 == 0:
                    self.stdout.write(f"  ... {created}/{count} created")

            # Update denormalized count on tenant
            tenant.employee_count = Employee.objects.filter(
                tenant=tenant, is_active=True
            ).count()
            tenant.save(update_fields=["employee_count"])

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! Created {created} employees in '{tenant.subdomain}'.\n"
            f"  Total active employees now: {tenant.employee_count}\n"
            f"  Departments: {len(depts)}, Designations: {len(desigs)}, Locations: {len(locs)}"
        ))
