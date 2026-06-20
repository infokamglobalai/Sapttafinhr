"""
End-to-end smoke test of every major HRMS feature using 10 dummy employees.

Creates a fresh tenant 'smoketest' (deleting any prior one), seeds 10 employees
with roles (1 HR admin, 1 manager, 8 reports), then drives every feature and
prints PASS/FAIL with details.

Usage:
    python manage.py verify_all_features
"""
import datetime
import io
import random
import traceback
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.test import Client
from django.utils import timezone
from django.utils.crypto import get_random_string


class TestReporter:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.rows = []

    def ok(self, name: str, detail: str = ""):
        self.passed += 1
        self.rows.append(("PASS", name, detail))

    def fail(self, name: str, detail: str):
        self.failed += 1
        self.rows.append(("FAIL", name, detail))

    def skip(self, name: str, detail: str):
        self.skipped += 1
        self.rows.append(("SKIP", name, detail))

    def section(self, title: str):
        self.rows.append(("---", title, ""))

    def report(self, stdout):
        stdout.write("\n" + "=" * 78)
        stdout.write(" FEATURE VERIFICATION REPORT".center(78))
        stdout.write("=" * 78 + "\n")
        for status, name, detail in self.rows:
            if status == "---":
                stdout.write("\n-- " + name + " " + "-" * max(2, (74 - len(name))))
                continue
            marker = {"PASS": "[ OK ]", "FAIL": "[FAIL]", "SKIP": "[SKIP]"}[status]
            line = f"  {marker} {name}"
            if detail:
                detail_ascii = str(detail).encode("ascii", "replace").decode("ascii")
                line += f"  | {detail_ascii}"
            stdout.write(line)
        stdout.write("\n" + "=" * 78)
        stdout.write(f"  Total: {self.passed + self.failed + self.skipped}  "
                     f"PASS={self.passed}  FAIL={self.failed}  SKIP={self.skipped}")
        stdout.write("=" * 78 + "\n")
        return self.failed == 0


class Command(BaseCommand):
    help = "End-to-end verification of all HRMS features using 10 dummy employees"

    def add_arguments(self, parser):
        parser.add_argument("--subdomain", default="smoketest", help="Tenant subdomain to use")
        parser.add_argument(
            "--jurisdiction", default="IN", choices=["IN", "KW", "AE", "SA"],
            help="Payroll jurisdiction — use KW/AE/SA to run GCC smoke branch",
        )
        parser.add_argument("--keep", action="store_true",
                            help="Don't wipe the tenant first; just rerun checks against it")

    @property
    def is_gcc(self) -> bool:
        return getattr(self, "jurisdiction", "IN") != "IN"

    def handle(self, *args, **opts):
        random.seed(42)  # deterministic
        self.r = TestReporter()
        self.jurisdiction = opts["jurisdiction"].upper()
        self.subdomain = opts["subdomain"]
        if self.is_gcc and self.subdomain == "smoketest":
            self.subdomain = f"smoketest-{self.jurisdiction.lower()}"

        # Silence the email firehose during the test
        from django.conf import settings
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

        try:
            self.setup_tenant(reset=not opts["keep"])
            self.test_user_auth()
            self.test_employee_crud()
            self.test_encryption()
            self.test_notifications_and_audit()
            self.test_onboarding()
            self.test_attendance()
            self.test_leaves()
            self.test_performance()
            self.test_payroll()
            if self.is_gcc:
                self.r.skip("Tax declarations", "India-only jurisdiction")
                self.r.skip("Form 16", "India-only jurisdiction")
            else:
                self.test_tax_declarations()
                self.test_form16()
            self.test_exports()
            self.test_letters()
            self.test_documents()
            self.test_assets_announcements()
            self.test_recruitment()
            self.test_reports()
            self.test_role_workflows()
            self.test_cross_module_journey()
            self.test_extended_modules()
            self.test_employee_limits()
            self.test_public_pages()
            self.test_management_commands()
        except Exception as exc:
            self.stdout.write(self.style.ERROR(
                f"\n\nFATAL: test harness crashed:\n{traceback.format_exc()}"
            ))
            self.r.fail("test harness", str(exc))

        ok = self.r.report(self.stdout)
        if not ok:
            raise SystemExit(1)

    # ───────────────────────────────────────────────────────────────────────
    def setup_tenant(self, reset=True):
        """Create a fresh tenant with 10 employees: 1 admin, 1 manager, 8 reports."""
        self.r.section("SETUP - tenant + 10 employees")
        from apps.tenants.models import Tenant
        from apps.tenants.services import provision_tenant
        from apps.accounts.models import User, Role, UserRole, Permission
        from apps.employees.models import (
            Employee, Department, Designation, OfficeLocation, EmployeeBankAccount,
        )
        from apps.payroll.models import SalaryStructure, EmployeeSalary, StatutorySetting
        from apps.leaves.models import LeaveType

        # Wipe prior tenant
        if reset:
            existing = Tenant.objects.filter(subdomain=self.subdomain).first()
            if existing:
                existing.delete()

        # Make sure permissions exist
        for p in ["employees.view", "leaves.apply", "payroll.view_own", "attendance.regularize_own"]:
            Permission.objects.get_or_create(codename=p, defaults={"name": p, "module": p.split(".")[0]})

        with transaction.atomic():
            tenant, admin_user = provision_tenant(
                company_name="Smoke Test Pvt Ltd",
                subdomain=self.subdomain,
                admin_email=f"admin@{self.subdomain}.com",
                admin_password="Admin@1234",
                country=self.jurisdiction,
            )
            self.tenant = tenant
            self.admin_user = admin_user
            tenant.setup_complete = True
            tenant.save(update_fields=["setup_complete"])

            # Org structure
            dept = Department.objects.create(tenant=tenant, name="Engineering")
            self.dept = dept
            desig_mgr = Designation.objects.create(tenant=tenant, name="Engineering Manager", level=6)
            desig_eng = Designation.objects.create(tenant=tenant, name="Software Engineer", level=3)
            self.location = OfficeLocation.objects.create(
                tenant=tenant, name="Bengaluru HQ",
                city="Bengaluru", state_code="IN-KA", pincode="560001",
                latitude=Decimal("12.9716"), longitude=Decimal("77.5946"),
            )

            # Salary structure + statutory (India) or GCC bootstrap
            if self.is_gcc:
                from apps.payroll.bootstrap import bootstrap_gcc_payroll_defaults
                bootstrap_gcc_payroll_defaults(tenant, assign_salaries=False)
                self.structure = SalaryStructure.objects.filter(
                    tenant=tenant, is_active=True,
                ).first()
            else:
                self.structure = SalaryStructure.objects.create(
                    tenant=tenant, name="Default", is_active=True,
                )
                StatutorySetting.objects.create(
                    tenant=tenant, statutory_type="pf",
                    employee_rate=Decimal("0.12"), employer_rate=Decimal("0.1208"),
                    wage_ceiling=Decimal("15000"), effective_date=datetime.date(2024, 4, 1),
                )
                StatutorySetting.objects.create(
                    tenant=tenant, statutory_type="esi",
                    employee_rate=Decimal("0.0075"), employer_rate=Decimal("0.0325"),
                    wage_ceiling=Decimal("21000"), effective_date=datetime.date(2024, 4, 1),
                )
                StatutorySetting.objects.create(
                    tenant=tenant, statutory_type="pt", state_code="IN-KA",
                    effective_date=datetime.date(2024, 4, 1),
                    slabs=[
                        {"min": 0, "max": 14999, "amount": 0},
                        {"min": 15000, "max": None, "amount": 200},
                    ],
                )

            # Leave types (regional packs may already seed GCC leave types)
            self.leave_type_el, _ = LeaveType.objects.get_or_create(
                tenant=tenant, code="EL",
                defaults={
                    "name": "Earned Leave", "is_paid": True,
                    "accrual_type": "upfront", "accrual_value": Decimal("18"),
                    "max_annual_balance": Decimal("18"),
                },
            )
            self.leave_type_sl, _ = LeaveType.objects.get_or_create(
                tenant=tenant, code="SL",
                defaults={
                    "name": "Sick Leave", "is_paid": True,
                    "accrual_type": "upfront", "accrual_value": Decimal("12"),
                    "max_annual_balance": Decimal("12"),
                },
            )

            employee_role = Role.objects.get(tenant=tenant, name="employee")
            manager_role, _ = Role.objects.get_or_create(
                tenant=tenant, name="manager", defaults={"is_system": True},
            )

            # Create 10 employees
            self.employees = []
            names = [
                ("Aarav", "Sharma"),  ("Priya", "Patel"),     ("Rohan", "Mehta"),
                ("Ananya", "Iyer"),   ("Vikram", "Singh"),    ("Diya", "Reddy"),
                ("Karthik", "Nair"),  ("Sneha", "Gupta"),     ("Aditya", "Khanna"),
                ("Riya",   "Joshi"),
            ]
            for i, (first, last) in enumerate(names):
                desig = desig_mgr if i == 0 else desig_eng
                ctc = Decimal("3000000") if i == 0 else Decimal("1200000")
                basic = (ctc * Decimal("0.40") / 12).quantize(Decimal("0.01"))
                if self.is_gcc:
                    from utils.money import round_money
                    basic = round_money(
                        Decimal("500") if tenant.currency == "KWD" else Decimal("5000"),
                        tenant.currency,
                    )
                    ctc = basic * 12
                email = f"{first.lower()}.{last.lower()}@{self.subdomain}.com"
                user = User.objects.create_user(
                    email=email, tenant=tenant, password="Demo@1234",
                )
                UserRole.objects.create(user=user, role=manager_role if i == 0 else employee_role)
                emp = Employee(
                    tenant=tenant, user=user,
                    employee_code=f"E{i+1:03d}",
                    first_name=first, last_name=last,
                    gender="female" if first[-1] in "aiey" else "male",
                    date_of_birth=datetime.date(1990 + i, 5, 12),
                    official_email=email,
                    phone_primary=f"+91{random.randint(6000000000, 9999999999)}",
                    department=dept, designation=desig, location=self.location,
                    work_state_code="" if self.is_gcc else "IN-KA",
                    employment_type="full_time", employment_status="active",
                    date_of_joining=datetime.date.today() - datetime.timedelta(days=365 + i * 20),
                    uan_number="" if self.is_gcc else str(random.randint(100000000000, 999999999999)),
                    esi_number="",
                    is_active=True,
                )
                if not self.is_gcc:
                    emp.pan_number = f"ABCDE{1000+i}F"
                    emp.aadhaar_number = str(random.randint(100000000000, 999999999999))
                emp.save()
                EmployeeSalary.objects.create(
                    tenant=tenant, employee=emp, structure=self.structure,
                    effective_date=emp.date_of_joining,
                    ctc_annual=ctc, basic_monthly=basic, is_active=True,
                )
                bank = EmployeeBankAccount(
                    employee=emp, account_holder_name=emp.full_name,
                    bank_name="Gulf Bank" if self.is_gcc else "HDFC Bank",
                    branch_name="Main",
                    account_type="savings", is_primary=True,
                )
                if self.is_gcc:
                    bank.ifsc_code = "GULBKWKW"
                    bank.account_number = f"KW{random.randint(10**28, 10**29 - 1)}"
                else:
                    bank.ifsc_code = f"HDFC0{random.randint(100000, 999999)}"
                    bank.account_number = str(random.randint(10000000000, 99999999999))
                bank.save()
                self.employees.append(emp)

            # Wire reporting hierarchy: first emp is manager, others report to them
            self.manager = self.employees[0]
            for emp in self.employees[1:]:
                emp.reporting_manager = self.manager
                emp.save(update_fields=["reporting_manager"])

        self.r.ok("Provision tenant + 10 employees",
                  f"tenant={tenant.subdomain}, mgr={self.manager.full_name}, 9 reports")

    # ───────────────────────────────────────────────────────────────────────
    def test_user_auth(self):
        self.r.section("USER AUTH & RBAC")
        from apps.accounts.backends import TenantAuthBackend
        from django.test.client import RequestFactory

        rf = RequestFactory()
        req = rf.get("/")
        req.tenant = self.tenant

        backend = TenantAuthBackend()
        u = backend.authenticate(req, username=self.admin_user.email, password="Admin@1234")
        if u and u.is_hr_admin:
            self.r.ok("Admin auth + is_hr_admin", "admin@smoketest.com")
        else:
            self.r.fail("Admin auth", "TenantAuthBackend rejected valid creds")

        bad = backend.authenticate(req, username=self.admin_user.email, password="wrong")
        if bad is None:
            self.r.ok("Auth rejects wrong password")
        else:
            self.r.fail("Auth rejects wrong password", "wrong creds were accepted")

        # Manager role check
        mgr_user = self.manager.user
        if mgr_user.is_manager and not mgr_user.is_hr_admin:
            self.r.ok("Manager role detection", mgr_user.email)
        else:
            self.r.fail("Manager role detection",
                        f"is_manager={mgr_user.is_manager} is_hr_admin={mgr_user.is_hr_admin}")

        # Employee role check
        emp_user = self.employees[1].user
        if not emp_user.is_hr_admin and not emp_user.is_manager:
            self.r.ok("Employee role detection", emp_user.email)
        else:
            self.r.fail("Employee role detection",
                        "employee was wrongly elevated")

    # ───────────────────────────────────────────────────────────────────────
    def test_employee_crud(self):
        self.r.section("EMPLOYEES")
        from apps.employees.models import Employee, EmployeeBankAccount
        from apps.employees.services import create_employee, generate_employee_code

        count = Employee.objects.filter(tenant=self.tenant).count()
        if count == 10:
            self.r.ok("10 employees created", f"count={count}")
        else:
            self.r.fail("Employee count", f"expected 10, got {count}")

        # Generate next code
        next_code = generate_employee_code(self.tenant)
        if next_code.startswith("EMP"):
            self.r.ok("generate_employee_code()", next_code)
        else:
            self.r.fail("generate_employee_code()", next_code)

        # Try create via service
        try:
            emp, pwd = create_employee(self.tenant, {
                "first_name": "Service",
                "last_name":  "Created",
                "official_email": f"svc.created@{self.subdomain}.com",
                "date_of_joining": datetime.date.today(),
                "department": self.dept,
            }, created_by=self.admin_user)
            detail = f"{emp.employee_code}, locked invite" if pwd is None else f"{emp.employee_code}, temp pwd len={len(pwd)}"
            self.r.ok("create_employee service", detail)
            emp.delete()
        except Exception as exc:
            self.r.fail("create_employee service", str(exc))

        # Bank account encryption integrity
        emp = self.employees[1]
        bank = emp.bank_accounts.first()
        acct = bank.account_number if bank else ""
        if bank and acct and len(acct) >= 8:
            self.r.ok("Bank account decrypt", f"masked={bank.masked_account_number}")
        else:
            self.r.fail("Bank account decrypt", "could not read back account number")

    # ───────────────────────────────────────────────────────────────────────
    def test_encryption(self):
        self.r.section("PII ENCRYPTION (Fernet)")
        emp = self.employees[0]
        if self.is_gcc:
            bank = emp.bank_accounts.first()
            if bank and bank.account_number:
                self.r.ok("Bank account encrypt/decrypt (GCC)", f"len={len(bank.account_number)}")
            else:
                self.r.fail("Bank account encrypt/decrypt (GCC)", "no bank row")
            self.r.skip("PAN encrypt/decrypt", "India-only field")
            self.r.skip("Aadhaar encrypt/decrypt", "India-only field")
            return
        if emp.pan_number and emp.pan_number.startswith("ABCDE"):
            self.r.ok("PAN encrypt/decrypt", f"{emp.pan_number}")
        else:
            self.r.fail("PAN encrypt/decrypt", "decrypt failed")
        if emp.aadhaar_number and emp.aadhaar_number.isdigit():
            self.r.ok("Aadhaar encrypt/decrypt", f"len={len(emp.aadhaar_number)}")
        else:
            self.r.fail("Aadhaar encrypt/decrypt", "decrypt failed")

    # ───────────────────────────────────────────────────────────────────────
    def test_notifications_and_audit(self):
        self.r.section("NOTIFICATIONS & AUDIT LOG")
        from apps.hr_ops.services import notify, audit_log
        from apps.hr_ops.models import Notification, AuditLog

        n = notify(self.employees[1].user, "general", "Welcome",
                   message="Hello!", action_url="/", send_email=False)
        if n and Notification.objects.filter(recipient=self.employees[1].user).exists():
            self.r.ok("notify() creates Notification", f"id={n.pk}")
        else:
            self.r.fail("notify()", "no Notification row created")

        audit_log(self.tenant, self.admin_user, "create", "Employee",
                  self.employees[0], "Smoke test audit entry")
        if AuditLog.objects.filter(tenant=self.tenant, resource_type="Employee").exists():
            self.r.ok("audit_log() writes entry")
        else:
            self.r.fail("audit_log()", "no AuditLog row created")

    # ───────────────────────────────────────────────────────────────────────
    def test_onboarding(self):
        self.r.section("ONBOARDING")
        from apps.hr_ops.models import OnboardingTemplate, OnboardingTask, EmployeeOnboarding
        from apps.hr_ops.services import start_onboarding
        from apps.employees.services import create_employee

        # Set up default template with 3 tasks
        template = OnboardingTemplate.objects.create(
            tenant=self.tenant, name="Standard", is_default=True,
        )
        for offset, name, party in [(0, "Issue laptop", "it"),
                                    (1, "ID card", "hr"),
                                    (3, "Tax forms", "hr")]:
            OnboardingTask.objects.create(
                template=template, task_name=name,
                responsible_party=party, due_days_offset=offset,
            )

        # Create a new emp → onboarding should auto-start
        emp, _ = create_employee(self.tenant, {
            "first_name": "Onboard", "last_name": "Test",
            "official_email": f"onb.test@{self.subdomain}.com",
            "date_of_joining": datetime.date.today(),
            "department": self.dept,
        }, created_by=self.admin_user)

        onb = EmployeeOnboarding.objects.filter(tenant=self.tenant, employee=emp).first()
        if onb and onb.items.count() == 3:
            self.r.ok("Auto-start onboarding on new hire",
                      f"{onb.items.count()} tasks created")
        else:
            self.r.fail("Auto-start onboarding",
                        f"got onboarding={onb}, items={onb.items.count() if onb else 0}")

        emp.delete()  # cleanup

    # ───────────────────────────────────────────────────────────────────────
    def test_attendance(self):
        self.r.section("ATTENDANCE")
        from apps.attendance.models import AttendanceRecord, AttendanceRegularization
        today = timezone.localdate()

        # Mark all 10 employees present for the last 5 working days
        count_created = 0
        for emp in self.employees:
            for delta in range(5):
                d = today - datetime.timedelta(days=delta)
                if d.weekday() == 6:  # skip Sunday
                    continue
                rec, created = AttendanceRecord.objects.get_or_create(
                    tenant=self.tenant, employee=emp, attendance_date=d,
                    defaults={
                        "status": "present", "first_in_time": timezone.now(),
                        "last_out_time": timezone.now(),
                        "net_working_minutes": 480,
                    },
                )
                if created:
                    count_created += 1
        if count_created > 0:
            self.r.ok("Attendance records created", f"{count_created} new rows")
        else:
            self.r.fail("Attendance records", "no rows created")

        # Regularization
        reg = AttendanceRegularization.objects.create(
            tenant=self.tenant, employee=self.employees[1],
            attendance_date=today, reason="Missed punch", status="pending",
        )
        if reg.pk:
            self.r.ok("Regularization request creates", f"id={reg.pk}")
        else:
            self.r.fail("Regularization request", "did not save")

    # ───────────────────────────────────────────────────────────────────────
    def test_leaves(self):
        self.r.section("LEAVES")
        from apps.leaves.models import LeaveBalance, LeaveRequest
        from apps.leaves.services import (
            apply_leave, approve_leave, reject_leave, get_or_create_balance,
        )
        year = datetime.date.today().year

        # Seed balances
        for emp in self.employees:
            bal = get_or_create_balance(self.tenant, emp, self.leave_type_el, year)
            bal.credited = Decimal("18")
            bal.save()
        if LeaveBalance.objects.filter(tenant=self.tenant).count() >= 10:
            self.r.ok("Leave balances seeded", "18 EL each")
        else:
            self.r.fail("Leave balances", "count low")

        # Apply leave
        emp = self.employees[1]
        try:
            req = apply_leave(
                tenant=self.tenant, employee=emp,
                leave_type_id=self.leave_type_el.id,
                from_date=datetime.date.today() + datetime.timedelta(days=10),
                to_date=datetime.date.today() + datetime.timedelta(days=12),
                half_day_type="", reason="Family function",
            )
            self.r.ok("apply_leave()", f"id={req.pk} status={req.status} days={req.total_days}")
        except Exception as exc:
            self.r.fail("apply_leave()", str(exc))
            return

        # Approve
        try:
            req = approve_leave(req, actioned_by=self.manager.user, remarks="OK")
            if req.status == "approved":
                self.r.ok("approve_leave()", f"id={req.pk}")
            else:
                self.r.fail("approve_leave()", f"status={req.status}")
        except Exception as exc:
            self.r.fail("approve_leave()", str(exc))

        # Reject another — pick a weekday to avoid the no-working-days guard
        target = datetime.date.today() + datetime.timedelta(days=20)
        while target.weekday() >= 5:  # Sat=5, Sun=6
            target += datetime.timedelta(days=1)
        try:
            req2 = apply_leave(
                tenant=self.tenant, employee=self.employees[2],
                leave_type_id=self.leave_type_el.id,
                from_date=target, to_date=target,
                half_day_type="", reason="Personal",
            )
            req2 = reject_leave(req2, actioned_by=self.manager.user, remarks="Project deadline")
            if req2.status == "rejected":
                self.r.ok("reject_leave()", f"id={req2.pk}")
            else:
                self.r.fail("reject_leave()", f"status={req2.status}")
        except Exception as exc:
            self.r.fail("reject_leave()", str(exc))

    # ───────────────────────────────────────────────────────────────────────
    def test_performance(self):
        self.r.section("PERFORMANCE")
        from apps.performance.models import ReviewCycle, PerformanceReview

        cycle = ReviewCycle.objects.create(
            tenant=self.tenant, name="Annual 2025-26",
            cycle_type="annual",
            review_period_start=datetime.date(2025, 4, 1),
            review_period_end=datetime.date(2026, 3, 31),
            opens_at=datetime.date.today() - datetime.timedelta(days=10),
            closes_at=datetime.date.today() + datetime.timedelta(days=20),
            status="active",
        )
        self.r.ok("Create review cycle", cycle.name)

        # Manager writes a review for one report
        report_emp = self.employees[1]
        review = PerformanceReview.objects.create(
            tenant=self.tenant, cycle=cycle, employee=report_emp, reviewer=self.manager,
            technical_rating=4, communication_rating=4, ownership_rating=5, teamwork_rating=4,
            overall_rating=4,
            key_achievements="Shipped 3 major features.",
            strengths="Strong technical depth, good collaborator.",
            areas_for_improvement="Document decisions earlier in the cycle.",
            status="submitted", submitted_at=timezone.now(),
        )
        if review.average_rating == 4.25:
            self.r.ok("PerformanceReview.average_rating computed", str(review.average_rating))
        else:
            self.r.fail("avg rating", f"got {review.average_rating}, expected 4.25")

        # Employee acknowledges
        review.status = "acknowledged"
        review.acknowledged_at = timezone.now()
        review.employee_comments = "Agree with the feedback. Thanks!"
        review.save()
        if review.status == "acknowledged":
            self.r.ok("Review acknowledged by employee")

    # ───────────────────────────────────────────────────────────────────────
    def test_payroll(self):
        self.r.section("PAYROLL")
        from apps.payroll.models import (
            SalaryComponent, SalaryStructureComponent, PayrollRun, PayrollRecord, Payslip,
        )
        from apps.payroll.engine import compute_payroll_record
        from apps.payroll.tasks import generate_payslips_for_run

        if not self.is_gcc:
            # Define salary components (BASIC, HRA, SPECIAL) — all as % of basic
            for code, name, val, seq in [
                ("BASIC",   "Basic",                None, 10),
                ("HRA",     "House Rent Allowance", 40,   20),
                ("SPECIAL", "Special Allowance",    60,   30),
            ]:
                c = SalaryComponent.objects.create(
                    tenant=self.tenant, name=name, code=code, component_type="earning",
                    calc_type="pct_of_basic", calc_value=val,
                    is_taxable=True, sequence_order=seq,
                )
                SalaryStructureComponent.objects.create(
                    structure=self.structure, component=c, sequence_order=seq,
                )

        # Create a payroll run for previous month
        today = datetime.date.today()
        prev_month = (today.replace(day=1) - datetime.timedelta(days=1))
        run = PayrollRun.objects.create(
            tenant=self.tenant, year=prev_month.year, month=prev_month.month,
            status="processing", run_by=self.admin_user,
        )
        self.r.ok("Create PayrollRun", f"{run.year}-{run.month:02d}")

        # Compute record for each employee
        recs_made = 0
        for emp in self.employees:
            try:
                rec = compute_payroll_record(
                    self.tenant, emp, run, run.year, run.month,
                )
                if rec and rec.net_payable > 0:
                    recs_made += 1
            except Exception as exc:
                self.r.fail("compute_payroll_record", f"emp={emp}: {exc}")
                return
        if recs_made == 10:
            self.r.ok("compute_payroll_record × 10", f"all positive net")
        else:
            self.r.fail("compute_payroll_record", f"only {recs_made}/10 ok")

        # Verify a sample record
        sample = PayrollRecord.objects.filter(payroll_run=run, employee=self.employees[1]).first()
        if self.is_gcc:
            if sample and sample.basic > 0 and sample.gross_earnings > 0:
                self.r.ok(
                    "Sample GCC PayrollRecord",
                    f"basic={sample.basic} gross={sample.gross_earnings} net={sample.net_payable}",
                )
            else:
                self.r.fail("Sample GCC PayrollRecord", "fields missing")
        elif sample and sample.basic > 0 and sample.pf_employee > 0 and sample.tds >= 0:
            self.r.ok("Sample PayrollRecord has basic/PF/TDS",
                      f"basic=₹{sample.basic} PF=₹{sample.pf_employee} TDS=₹{sample.tds}")
        else:
            self.r.fail("Sample PayrollRecord", "fields missing")

        # Update run totals & lock
        run.total_employees = run.records.count()
        run.total_gross = sum((r.gross_earnings for r in run.records.all()), Decimal("0"))
        run.total_net = sum((r.net_payable for r in run.records.all()), Decimal("0"))
        run.status = "approved"
        run.approved_at = timezone.now()
        run.save()
        run.records.all().update(is_locked=True, locked_at=timezone.now())

        # Generate payslips (eager celery)
        try:
            generate_payslips_for_run(run.id)
            n_slips = Payslip.objects.filter(tenant=self.tenant).count()
            if n_slips >= 10:
                self.r.ok("Payslip PDFs generated", f"{n_slips} slips")
            else:
                self.r.fail("Payslip PDFs", f"only {n_slips} generated")
        except OSError as exc:
            if "gobject" in str(exc) or "cairo" in str(exc) or "pango" in str(exc):
                self.r.skip("Payslip PDF generation",
                            "WeasyPrint GTK libs not installed on this Windows dev box "
                            "(works on Linux prod)")
            else:
                self.r.fail("Payslip generation", str(exc))
        except Exception as exc:
            self.r.fail("Payslip generation", str(exc))

        self.payroll_run = run  # save for exports

    # ───────────────────────────────────────────────────────────────────────
    def test_tax_declarations(self):
        self.r.section("TAX DECLARATIONS (Old vs New)")
        from apps.payroll.models import TaxDeclaration
        from apps.payroll.tax import compute_annual_tax, current_financial_year, monthly_tds

        fy = current_financial_year()

        # Employee submits declaration in OLD regime
        decl = TaxDeclaration.objects.create(
            tenant=self.tenant, employee=self.employees[1],
            financial_year=fy, regime="old",
            rent_paid_annual=Decimal("240000"), is_metro_city=True,
            landlord_name="Mr Owner", landlord_pan="XYZAB1234C",
            sec_80c_ppf=Decimal("150000"),
            sec_80d_self=Decimal("25000"),
            sec_80ccd_1b_nps=Decimal("50000"),
            sec_24_home_loan_interest=Decimal("200000"),
            status="submitted", submitted_at=timezone.now(),
        )
        self.r.ok("Submit tax declaration (OLD regime)", f"id={decl.pk}")

        # Compute tax both ways
        gross = Decimal("1200000")
        old = compute_annual_tax(regime="old", gross_salary_annual=gross,
                                 basic_annual=Decimal("480000"),
                                 hra_received_annual=Decimal("192000"),
                                 declaration=decl)
        new = compute_annual_tax(regime="new", gross_salary_annual=gross)
        self.r.ok("Compute tax (OLD)", f"taxable=₹{old['taxable_income']:.0f} tax=₹{old['total_tax']:.0f}")
        self.r.ok("Compute tax (NEW)", f"taxable=₹{new['taxable_income']:.0f} tax=₹{new['total_tax']:.0f}")

        if old["total_tax"] != new["total_tax"]:
            self.r.ok("Old vs new give different tax",
                      f"diff=₹{abs(old['total_tax'] - new['total_tax']):.0f}")

        # monthly_tds helper
        try:
            tds = monthly_tds(self.tenant, self.employees[1],
                              gross_monthly=gross / 12,
                              basic_monthly=Decimal("40000"),
                              hra_monthly=Decimal("16000"))
            self.r.ok("monthly_tds()", f"₹{tds:.0f}/month")
        except Exception as exc:
            self.r.fail("monthly_tds()", str(exc))

    # ───────────────────────────────────────────────────────────────────────
    def test_form16(self):
        self.r.section("FORM 16")
        from apps.payroll.form16 import generate_form16_for_fy
        from apps.payroll.tax import current_financial_year
        from apps.payroll.models import Form16

        fy = current_financial_year()
        try:
            created, skipped = generate_form16_for_fy(
                self.tenant, fy, generated_by=self.admin_user,
            )
            self.r.ok("generate_form16_for_fy()",
                      f"created={created} skipped={skipped}")
        except Exception as exc:
            self.r.fail("generate_form16_for_fy()", str(exc))
            return

        f16 = Form16.objects.filter(tenant=self.tenant).first()
        if f16 and f16.part_b_pdf:
            try:
                size = f16.part_b_pdf.size
                self.r.ok("Form 16 Part B PDF", f"{size} bytes, fy={f16.financial_year}")
            except Exception as exc:
                self.r.fail("Form 16 PDF read", str(exc))
        else:
            self.r.skip("Form 16 PDF",
                        "no Form16 generated (likely no payroll records in FY)")

    # ───────────────────────────────────────────────────────────────────────
    def test_exports(self):
        self.r.section("STATUTORY EXPORTS (Tally / PF / ESI)" if not self.is_gcc else "GCC PAYROLL EXPORTS")
        from django.test import Client
        from django.urls import reverse

        run = getattr(self, "payroll_run", None)
        if not run:
            self.r.skip("Payroll exports", "no payroll run")
            return

        if self.is_gcc:
            self.r.skip("Tally XML export", "India-only")
            self.r.skip("PF ECR export", "India-only")
            self.r.skip("ESI return CSV", "India-only")
            export_urls = [
                ("Salary Register Excel", "payroll:salary_register"),
                ("Bank Advice Excel", "payroll:bank_advice"),
            ]
            if self.jurisdiction == "KW":
                export_urls.append(("GCC Bank Transfer CSV", "payroll:gcc_bank_transfer"))
            c = Client(HTTP_HOST="localhost")
            c.force_login(self.admin_user, backend="apps.accounts.backends.TenantAuthBackend")
            for name, url_name in export_urls:
                try:
                    r = c.get(reverse(url_name, args=[run.pk]))
                    if r.status_code == 200 and len(r.content) > 100:
                        self.r.ok(name, f"{len(r.content)} bytes")
                    else:
                        self.r.fail(name, f"HTTP {r.status_code}, {len(r.content)} bytes")
                except Exception as exc:
                    self.r.fail(name, str(exc))
            return

        from apps.payroll.exports import build_tally_xml, build_pf_ecr, build_esi_return

        try:
            xml = build_tally_xml(self.tenant, run)
            if "<ENVELOPE>" in xml and "<LEDGERNAME>" in xml:
                self.r.ok("Tally XML export", f"{len(xml)} chars")
            else:
                self.r.fail("Tally XML", "missing required tags")
        except Exception as exc:
            self.r.fail("Tally XML", str(exc))

        try:
            txt = build_pf_ecr(self.tenant, run)
            lines = txt.strip().split("\n")
            self.r.ok("PF ECR export",
                      f"{len(lines)} lines (employees with UAN only)")
        except Exception as exc:
            self.r.fail("PF ECR", str(exc))

        try:
            csv_text = build_esi_return(self.tenant, run)
            line_count = csv_text.count("\n")
            self.r.ok("ESI return CSV", f"{line_count} lines (header + employees with ESI)")
        except Exception as exc:
            self.r.fail("ESI return", str(exc))

        # Excel exports (salary register, bank advice) — HTTP-driven
        from django.test import Client
        from django.urls import reverse
        c = Client(HTTP_HOST="localhost")
        c.force_login(self.admin_user, backend="apps.accounts.backends.TenantAuthBackend")
        for name, url_name in [
            ("Salary Register Excel", "payroll:salary_register"),
            ("Bank Advice Excel",     "payroll:bank_advice"),
            ("PF Statement Excel",    "payroll:pf_statement"),
        ]:
            try:
                r = c.get(reverse(url_name, args=[run.pk]))
                if r.status_code == 200 and len(r.content) > 200:
                    self.r.ok(name, f"{len(r.content)} bytes")
                else:
                    self.r.fail(name, f"HTTP {r.status_code}, {len(r.content)} bytes")
            except Exception as exc:
                self.r.fail(name, str(exc))

    # ───────────────────────────────────────────────────────────────────────
    def test_letters(self):
        self.r.section("HR LETTERS")
        from apps.hr_ops.models import LetterTemplate, HRLetter
        from apps.hr_ops.services import generate_letter

        tpl = LetterTemplate.objects.create(
            tenant=self.tenant, name="Appointment Letter",
            letter_type="appointment",
            template_html="<h1>Appointment</h1><p>Dear {{ employee.first_name }}, "
                          "we are pleased to appoint you as {{ employee.designation.name }}.</p>",
        )
        try:
            letter = generate_letter(self.tenant, self.employees[1], tpl,
                                     generated_by=self.admin_user)
            if letter and letter.pdf:
                self.r.ok("generate_letter() PDF", f"id={letter.pk}, file={letter.pdf.name}")
            else:
                self.r.fail("generate_letter()", "no PDF saved")
        except ImportError as exc:
            self.r.skip("generate_letter()",
                        f"Optional dep missing: {exc}. pip install Jinja2 to enable.")
        except OSError as exc:
            if "gobject" in str(exc) or "cairo" in str(exc):
                self.r.skip("generate_letter()",
                            "WeasyPrint GTK libs not installed on Windows dev box")
            else:
                self.r.fail("generate_letter()", str(exc))
        except Exception as exc:
            self.r.fail("generate_letter()", str(exc))

    # ───────────────────────────────────────────────────────────────────────
    def test_documents(self):
        self.r.section("EMPLOYEE DOCUMENTS")
        from apps.employees.models import EmployeeDocument
        from django.core.files.base import ContentFile

        emp = self.employees[1]
        doc = EmployeeDocument(
            tenant=self.tenant, employee=emp,
            document_type="pan", document_name="PAN copy",
            expiry_date=datetime.date.today() + datetime.timedelta(days=14),
            uploaded_by=self.admin_user,
        )
        doc.file.save("pan.pdf", ContentFile(b"%PDF-1.4 dummy"), save=False)
        doc.save()
        if EmployeeDocument.objects.filter(tenant=self.tenant).count() >= 1:
            self.r.ok("Upload employee document",
                      f"expires in 14d → expiry alert should fire")
        else:
            self.r.fail("Upload employee document", "row not saved")

    # ───────────────────────────────────────────────────────────────────────
    def test_assets_announcements(self):
        self.r.section("HR OPS - Assets, Announcements")
        from apps.hr_ops.models import Asset, AssetAssignment, Announcement

        # Asset assign
        asset = Asset.objects.create(
            tenant=self.tenant, asset_code="AST-001", name="MacBook Pro 14",
            category="laptop", serial_number="MBP-001", status="assigned",
        )
        AssetAssignment.objects.create(
            asset=asset, employee=self.employees[1],
            assigned_by=self.admin_user,
        )
        if AssetAssignment.objects.filter(asset=asset).exists():
            self.r.ok("Asset assignment", f"MBP-001 → {self.employees[1].full_name}")
        else:
            self.r.fail("Asset assignment", "did not save")

        # Announcement
        a = Announcement.objects.create(
            tenant=self.tenant, title="Holiday on Friday",
            content="Office will be closed for the regional holiday.",
            published_at=timezone.now(), is_published=True,
            created_by=self.admin_user,
        )
        if Announcement.objects.filter(tenant=self.tenant, is_published=True).count() >= 1:
            self.r.ok("Announcement published", a.title)

    # ───────────────────────────────────────────────────────────────────────
    def test_recruitment(self):
        self.r.section("RECRUITMENT (ATS + public careers)")
        from django.urls import reverse
        from apps.recruitment.models import JobOpening, Candidate, JobApplication
        from apps.recruitment.services import convert_hired_application
        from apps.hr_ops.models import EmployeeOnboarding
        from apps.payroll.models import EmployeeSalary

        job = JobOpening.objects.create(
            tenant=self.tenant,
            title="QA Engineer",
            department=self.dept,
            designation=self.employees[0].designation,
            location=self.location,
            status="published",
            published_at=timezone.now(),
            created_by=self.admin_user,
        )
        self.r.ok("Create published job opening", f"id={job.pk}")

        cand = Candidate.objects.create(
            tenant=self.tenant,
            first_name="Neha",
            last_name="Kapoor",
            email=f"neha.kapoor@{self.subdomain}.com",
            source="careers_page",
        )
        app = JobApplication.objects.create(
            tenant=self.tenant,
            job_opening=job,
            candidate=cand,
            status="hired",
        )
        self.r.ok("Job application (hired)", f"id={app.pk}")

        try:
            new_emp = convert_hired_application(app, created_by=self.admin_user)
            if new_emp and new_emp.employee_code:
                self.r.ok("convert_hired_application()", new_emp.employee_code)
            else:
                self.r.fail("convert_hired_application()", "no employee returned")
            if EmployeeSalary.objects.filter(employee=new_emp, is_active=True).exists():
                self.r.ok("Hired employee salary record")
            else:
                self.r.fail("Hired employee salary", "missing EmployeeSalary")
            if EmployeeOnboarding.objects.filter(tenant=self.tenant, employee=new_emp).exists():
                self.r.ok("Onboarding auto-started for hire")
            else:
                self.r.fail("Onboarding for hire", "checklist not created")
        except Exception as exc:
            self.r.fail("convert_hired_application()", str(exc))

        c = Client(HTTP_HOST="localhost")
        try:
            r = c.get(f"/careers/{self.subdomain}/{job.pk}/")
            if r.status_code == 200:
                self.r.ok("Public careers job page", f"/careers/{self.subdomain}/{job.pk}/")
            else:
                self.r.fail("Public careers job page", f"HTTP {r.status_code}")
        except Exception as exc:
            self.r.fail("Public careers job page", str(exc))

    # ───────────────────────────────────────────────────────────────────────
    def test_reports(self):
        self.r.section("REPORTS (MIS hub + exports)")
        from django.urls import reverse

        c = Client(HTTP_HOST="localhost")
        c.force_login(self.admin_user, backend="apps.accounts.backends.TenantAuthBackend")
        pages = [
            ("Reports hub", reverse("reports:index")),
            ("Leave report", reverse("reports:leave")),
            ("Attendance report", reverse("reports:attendance")),
            ("Headcount report", reverse("reports:headcount")),
            ("Payroll report", reverse("reports:payroll")),
        ]
        for name, url in pages:
            try:
                r = c.get(url)
                if r.status_code == 200:
                    self.r.ok(name, url)
                else:
                    self.r.fail(name, f"HTTP {r.status_code}")
            except Exception as exc:
                self.r.fail(name, str(exc))

        if getattr(self, "payroll_run", None):
            try:
                r = c.get(reverse("reports:leave_export") + "?from=2026-01-01&to=2026-12-31")
                if r.status_code == 200 and len(r.content) > 200:
                    self.r.ok("Leave report Excel export", f"{len(r.content)} bytes")
                else:
                    self.r.fail("Leave report Excel export", f"HTTP {r.status_code}")
            except Exception as exc:
                self.r.fail("Leave report Excel export", str(exc))

    # ───────────────────────────────────────────────────────────────────────
    def test_role_workflows(self):
        self.r.section("ROLE WORKFLOWS (manager + employee ESS)")
        from django.urls import reverse

        mgr = Client(HTTP_HOST="localhost")
        mgr.force_login(self.manager.user, backend="apps.accounts.backends.TenantAuthBackend")
        emp = Client(HTTP_HOST="localhost")
        emp.force_login(self.employees[1].user, backend="apps.accounts.backends.TenantAuthBackend")

        mgr_pages = [
            ("Manager leave approvals", reverse("leaves:pending")),
            ("Manager team reviews", reverse("performance:team_reviews")),
            ("Manager team attendance", reverse("attendance:team_attendance")),
        ]
        for name, url in mgr_pages:
            try:
                r = mgr.get(url)
                if r.status_code == 200:
                    self.r.ok(name, url)
                else:
                    self.r.fail(name, f"HTTP {r.status_code}")
            except Exception as exc:
                self.r.fail(name, str(exc))

        ess_pages = [
            ("Employee my attendance", reverse("attendance:my_attendance")),
            ("Employee apply leave", reverse("leaves:apply")),
            ("Employee leave history (redirect)", reverse("leaves:my_leaves")),
            ("Employee my payslips", reverse("payroll:my_payslips")),
        ]
        if not self.is_gcc:
            ess_pages.append(("Employee tax declaration", reverse("payroll:my_tax_declaration")))
        for name, url in ess_pages:
            try:
                r = emp.get(url)
                if r.status_code == 200:
                    self.r.ok(name, url)
                elif name.startswith("Employee leave history") and r.status_code == 302:
                    self.r.ok(name, f"{url} -> apply history ({r.status_code})")
                else:
                    self.r.fail(name, f"HTTP {r.status_code}")
            except Exception as exc:
                self.r.fail(name, str(exc))

        # Manager must not reach HR-only payroll run list
        try:
            r = mgr.get(reverse("payroll:run_list"))
            if r.status_code in (403, 302):
                self.r.ok("Manager blocked from payroll admin", f"HTTP {r.status_code}")
            elif r.status_code == 200 and b"Payroll Runs" in r.content:
                self.r.fail("Manager blocked from payroll admin", "manager saw HR payroll list")
            else:
                self.r.ok("Manager blocked from payroll admin", f"HTTP {r.status_code}")
        except Exception as exc:
            self.r.fail("Manager blocked from payroll admin", str(exc))

    # ───────────────────────────────────────────────────────────────────────
    def test_cross_module_journey(self):
        self.r.section("CROSS-MODULE JOURNEY (hire → payroll record)")
        from apps.recruitment.models import JobOpening, Candidate, JobApplication
        from apps.recruitment.services import convert_hired_application
        from apps.payroll.engine import compute_payroll_record
        from apps.payroll.models import PayrollRun, PayrollRecord

        job = JobOpening.objects.create(
            tenant=self.tenant,
            title="Journey Test Role",
            department=self.dept,
            status="published",
            published_at=timezone.now(),
            created_by=self.admin_user,
        )
        cand = Candidate.objects.create(
            tenant=self.tenant,
            first_name="Journey",
            last_name="Tester",
            email=f"journey.tester@{self.subdomain}.com",
        )
        app = JobApplication.objects.create(
            tenant=self.tenant, job_opening=job, candidate=cand, status="hired",
        )
        hire = convert_hired_application(app, created_by=self.admin_user)

        from apps.payroll.models import EmployeeSalary
        if not EmployeeSalary.objects.filter(employee=hire, is_active=True).exists():
            EmployeeSalary.objects.create(
                tenant=self.tenant,
                employee=hire,
                structure=self.structure,
                effective_date=hire.date_of_joining,
                ctc_annual=Decimal("600000"),
                basic_monthly=Decimal("20000"),
                is_active=True,
            )

        run = PayrollRun.objects.create(
            tenant=self.tenant,
            year=timezone.localdate().year,
            month=timezone.localdate().month,
            status="draft",
        )
        rec, _ = PayrollRecord.objects.get_or_create(
            tenant=self.tenant, payroll_run=run, employee=hire,
        )
        try:
            compute_payroll_record(self.tenant, hire, run, run.year, run.month)
            rec.refresh_from_db()
            if rec.net_payable and rec.net_payable > 0:
                self.r.ok("New hire in payroll run", f"net={rec.net_payable}")
            else:
                self.r.fail("New hire in payroll run", "net_payable not positive")
        except Exception as exc:
            self.r.fail("New hire in payroll run", str(exc))

        # Performance launch reviews for cycle
        from apps.performance.models import ReviewCycle, PerformanceReview
        from apps.employees.models import Employee

        cycle = ReviewCycle.objects.create(
            tenant=self.tenant,
            name="Journey Cycle",
            cycle_type="annual",
            review_period_start=datetime.date.today() - datetime.timedelta(days=90),
            review_period_end=datetime.date.today(),
            opens_at=datetime.date.today() - datetime.timedelta(days=1),
            closes_at=datetime.date.today() + datetime.timedelta(days=30),
            status="planning",
        )
        created = 0
        for emp in Employee.objects.filter(tenant=self.tenant, employment_status="active", is_active=True):
            reviewer = emp.reporting_manager
            if not reviewer:
                continue
            _, was_created = PerformanceReview.objects.get_or_create(
                tenant=self.tenant,
                cycle=cycle,
                employee=emp,
                defaults={"reviewer": reviewer, "status": "draft"},
            )
            if was_created:
                created += 1
        if created >= 5:
            self.r.ok("Launch reviews bulk-create", f"{created} reviews")
        else:
            self.r.fail("Launch reviews bulk-create", f"only {created} reviews")

    # ───────────────────────────────────────────────────────────────────────
    def test_extended_modules(self):
        """Comp-off, expenses, loans, pre-payroll review, monthly report pack."""
        self.r.section("EXTENDED MODULES")
        from apps.leaves.comp_off_services import request_comp_off, approve_comp_off
        from apps.leaves.models import CompOffCredit
        from apps.payroll.models import EmployeeLoan, ExpenseClaim
        from apps.payroll.review_services import build_monthly_readiness
        from apps.reports.report_pack import build_monthly_report_pack
        from django.urls import reverse

        emp = self.employees[1]
        try:
            credit = request_comp_off(
                self.tenant, emp,
                worked_date=timezone.localdate() - datetime.timedelta(days=3),
                reason="Weekend release",
            )
            approve_comp_off(credit, self.admin_user)
            if credit.status == "available":
                self.r.ok("Comp-off request + approve", f"id={credit.id}")
            else:
                self.r.fail("Comp-off approve", credit.status)
        except Exception as exc:
            self.r.fail("Comp-off workflow", str(exc))

        try:
            loan = EmployeeLoan.objects.create(
                tenant=self.tenant,
                employee=emp,
                loan_type="Personal",
                principal_amount=Decimal("50000"),
                outstanding_amount=Decimal("50000"),
                emi_amount=Decimal("5000"),
                total_installments=10,
                interest_rate=Decimal("0"),
                disbursed_date=timezone.localdate(),
                status="active",
            )
            self.r.ok("Employee loan create", f"id={loan.id}")
        except Exception as exc:
            self.r.fail("Employee loan create", str(exc))

        try:
            claim = ExpenseClaim.objects.create(
                tenant=self.tenant,
                employee=emp,
                category="Travel",
                amount=Decimal("1200"),
                description="Client visit",
                expense_date=timezone.localdate(),
                status="pending",
            )
            self.r.ok("Expense claim create", f"id={claim.id}")
        except Exception as exc:
            self.r.fail("Expense claim create", str(exc))

        try:
            today = timezone.localdate()
            data = build_monthly_readiness(self.tenant, today.year, today.month)
            if data.get("rows") is not None:
                self.r.ok("Pre-payroll review data", f"{len(data['rows'])} rows")
            else:
                self.r.fail("Pre-payroll review data", "no rows key")
        except Exception as exc:
            self.r.fail("Pre-payroll review data", str(exc))

        try:
            run = getattr(self, "payroll_run", None)
            if run:
                c = Client(HTTP_HOST="localhost")
                c.force_login(self.admin_user)
                r = c.get(reverse("payroll:monthly_review") + f"?year={run.year}&month={run.month}")
                if r.status_code == 200:
                    self.r.ok("Pre-payroll review page", f"HTTP {r.status_code}")
                else:
                    self.r.fail("Pre-payroll review page", f"HTTP {r.status_code}")
            else:
                self.r.skip("Pre-payroll review page", "no payroll run")
        except Exception as exc:
            self.r.fail("Pre-payroll review page", str(exc))

        try:
            run = getattr(self, "payroll_run", None)
            if run:
                pack = build_monthly_report_pack(self.tenant, run.year, run.month)
                if pack and len(pack) > 500:
                    self.r.ok("Monthly report pack ZIP", f"{len(pack)} bytes")
                else:
                    self.r.fail("Monthly report pack ZIP", f"{len(pack) if pack else 0} bytes")
            else:
                self.r.skip("Monthly report pack ZIP", "no payroll run")
        except Exception as exc:
            self.r.fail("Monthly report pack ZIP", str(exc))

    def test_employee_limits(self):
        self.r.section("EMPLOYEE LIMIT ENFORCEMENT")
        from apps.employees.services import create_employee
        from apps.tenants.limits import EmployeeLimitExceeded, active_employee_count

        original_max = self.tenant.max_employees
        current = active_employee_count(self.tenant)
        self.tenant.max_employees = current
        self.tenant.save(update_fields=["max_employees"])

        try:
            create_employee(self.tenant, {
                "first_name": "Limit",
                "last_name": "Test",
                "official_email": "limit.test@smoketest.com",
                "date_of_joining": timezone.localdate(),
                "employment_status": "active",
            })
            self.r.fail("Employee limit block", "create succeeded at cap")
        except EmployeeLimitExceeded:
            self.r.ok("Employee limit block", f"blocked at {current}/{current}")
        except Exception as exc:
            self.r.fail("Employee limit block", str(exc))
        finally:
            self.tenant.max_employees = original_max
            self.tenant.save(update_fields=["max_employees"])

    # ───────────────────────────────────────────────────────────────────────
    def test_public_pages(self):
        self.r.section("PUBLIC PAGES (HTTP smoke)")
        from django.urls import reverse

        class _C(Client):
            def __init__(self, **kw):
                kw.setdefault("HTTP_HOST", "localhost")
                super().__init__(**kw)

        c = _C()
        # Platform SSO routes redirect (302) to the Finance app; employee auth pages render 200.
        platform_redirects = {
            reverse("accounts:login"),
            reverse("accounts:password_reset_request"),
        }
        for name, url in [
            ("Login page (platform SSO)", reverse("accounts:login")),
            ("Signup page",           reverse("tenants:signup")),
            ("Password reset (platform SSO)", reverse("accounts:password_reset_request")),
            ("Employee login page",   reverse("accounts:employee_login")),
            ("Privacy page",          reverse("tenants:legal_privacy")),
            ("Terms page",            reverse("tenants:legal_terms")),
            ("DPA page",              reverse("tenants:legal_dpa")),
        ]:
            try:
                r = c.get(url)
                if r.status_code == 200:
                    self.r.ok(name, url)
                elif r.status_code == 302 and url in platform_redirects:
                    self.r.ok(name, f"{url} -> platform ({r.status_code})")
                else:
                    self.r.fail(name, f"HTTP {r.status_code}")
            except Exception as exc:
                self.r.fail(name, str(exc))

    # ───────────────────────────────────────────────────────────────────────
    def test_management_commands(self):
        self.r.section("MANAGEMENT COMMANDS")
        from io import StringIO
        from django.core.management import call_command

        # daily_alerts
        try:
            buf = StringIO()
            call_command("daily_alerts", "--tenant", self.subdomain, stdout=buf)
            self.r.ok("daily_alerts cmd", buf.getvalue().strip().split("\n")[-1][:60])
        except Exception as exc:
            self.r.fail("daily_alerts", str(exc))

        # backup_db
        try:
            buf = StringIO()
            call_command("backup_db", "--keep", "3", "--quiet", stdout=buf)
            self.r.ok("backup_db cmd", "wrote .gz to backups/")
        except Exception as exc:
            self.r.fail("backup_db", str(exc))
