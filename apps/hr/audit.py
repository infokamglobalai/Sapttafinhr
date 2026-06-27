"""Page audit script — checks every URL returns 200 for demo roles + RBAC."""
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hrms.settings.development")
import django

django.setup()

from django.test import Client

from apps.accounts.models import User
from apps.employees.models import Employee

AUDIT_EMAIL = os.environ.get("HR_AUDIT_EMAIL", "demo@saptta.com")
AUDIT_PASSWORD = os.environ.get("HR_AUDIT_PASSWORD", "Demo@1234")
AUDIT_HOST = os.environ.get("HR_AUDIT_HOST", "acme.localhost")
MANAGER_EMAIL = os.environ.get("HR_AUDIT_MANAGER", "manager@saptta.com")
MANAGER_PASSWORD = os.environ.get("HR_AUDIT_MANAGER_PASSWORD", "Demo@1234")
EMPLOYEE_EMAIL = os.environ.get("HR_AUDIT_EMPLOYEE", "manju@saptta.com")
EMPLOYEE_PASSWORD = os.environ.get("HR_AUDIT_EMPLOYEE_PASSWORD", "Employee@1234")

client = Client()
ok_login = client.login(username=AUDIT_EMAIL, password=AUDIT_PASSWORD)
print(f"Login ({AUDIT_EMAIL}): {'OK' if ok_login else 'FAILED'}")

ADMIN_PAGES = [
    ("/", "Dashboard"),
    ("/company/", "Company-Overview"),
    ("/employees/", "Employees-List"),
    ("/employees/create/", "Employee-Create"),
    ("/employees/departments/", "Departments"),
    ("/employees/designations/", "Designations"),
    ("/employees/locations/", "Locations"),
    ("/employees/bulk-import/", "Bulk-Import"),
    ("/attendance/", "Attendance-Register"),
    ("/attendance/regularizations/", "Regularizations"),
    ("/attendance/shifts/", "Shifts"),
    ("/leaves/pending/", "Leave-Pending"),
    ("/leaves/types/", "Leave-Types"),
    ("/leaves/holidays/", "Holiday-Calendar"),
    ("/leaves/balances/", "Leave-Balances"),
    ("/payroll/", "Payroll-Runs"),
    ("/payroll/run/create/", "Payroll-Create"),
    ("/payroll/structures/", "Salary-Structures"),
    ("/payroll/statutory/", "Statutory-Settings"),
    ("/hr/letters/", "HR-Letter-Templates"),
    ("/hr/letters/history/", "Letter-History"),
    ("/hr/letters/settings/", "Letter-Letterhead"),
    ("/hr/letters/new/", "Letter-Template-Create"),
    ("/hr/assets/", "Assets"),
    ("/hr/onboarding/", "Onboarding"),
    ("/hr/exits/", "Exits"),
    ("/hr/announcements/", "Announcements"),
    ("/hr/policies/", "Policies"),
    ("/recruitment/", "Recruitment-Jobs"),
    ("/performance/cycles/", "Performance-Cycles"),
    ("/performance/team/", "Performance-Team"),
    ("/projects/", "Projects-List"),
    ("/reports/", "Reports-Hub"),
    ("/reports/leave/", "Report-Leave"),
    ("/reports/attendance/", "Report-Attendance"),
    ("/reports/headcount/", "Report-Headcount"),
    ("/reports/payroll/", "Report-Payroll"),
    ("/auth/settings/", "Settings"),
]

MANAGER_PAGES = [
    ("/", "Dashboard"),
    ("/leaves/pending/", "Team-Leave-Pending"),
    ("/attendance/team/", "Team-Attendance"),
    ("/performance/team/", "Team-Reviews"),
    ("/projects/my/", "My-Projects"),
]

EMPLOYEE_BLOCKED = [
    ("/hr/letters/history/", "Letter-History"),
    ("/hr/letters/", "Letter-Templates"),
    ("/payroll/", "Payroll-Admin"),
    ("/employees/", "Employee-Directory"),
]

fail = []


def audit_pages(pages, host, label, *, ok_codes=(200,)):
    print(f"\n=== {label} ({len(pages)} pages) @ {host} ===")
    ok = 0
    for path, name in pages:
        try:
            resp = client.get(path, HTTP_HOST=host)
            status = resp.status_code
            if status in ok_codes:
                print(f"  OK   {status}  {name:28s} {path}")
                ok += 1
            else:
                print(f"  FAIL {status}  {name:28s} {path}")
                fail.append((label, status, name, path))
        except Exception as exc:
            print(f"  EXC       {name:28s} {path}  -> {type(exc).__name__}: {str(exc)[:60]}")
            fail.append((label, "EXC", name, path))
    print(f"\n{label}: {ok}/{len(pages)} OK")
    return ok


audit_pages(ADMIN_PAGES, AUDIT_HOST, "HR ADMIN")

admin_user = User.objects.filter(email=AUDIT_EMAIL).first()
emp = Employee.objects.filter(user=admin_user).first() if admin_user else None

if emp:
    ESS_PAGES = [
        ("/employees/my-work/", "My-Profile"),
        ("/attendance/my/", "My-Attendance"),
        ("/attendance/regularize/", "Regularization-Form"),
        ("/leaves/apply/", "Leave-Apply"),
        ("/leaves/my/", "My-Leaves"),
        ("/payroll/my-payslips/", "My-Payslips"),
        ("/projects/my/", "My-Projects"),
    ]
    audit_pages(ESS_PAGES, AUDIT_HOST, "ESS (admin user)", ok_codes=(200, 302))
else:
    print(f"\n{AUDIT_EMAIL} has no employee profile — skipping ESS audit.")

client.logout()
if client.login(username=MANAGER_EMAIL, password=MANAGER_PASSWORD):
    audit_pages(MANAGER_PAGES, AUDIT_HOST, "MANAGER", ok_codes=(200, 302))
    print("\n=== RBAC: Manager blocked from HR admin ===")
    for path, name in [("/hr/letters/history/", "Letters"), ("/employees/create/", "Emp-Create"), ("/payroll/run/create/", "Payroll-Create")]:
        resp = client.get(path, HTTP_HOST=AUDIT_HOST)
        blocked = resp.status_code in (302, 403)
        mark = "OK" if blocked else "FAIL"
        print(f"  {mark}  {resp.status_code}  {name:28s} {path}")
        if not blocked:
            fail.append(("RBAC-Manager", resp.status_code, name, path))
else:
    print(f"\nManager login ({MANAGER_EMAIL}) failed — skipping manager audit.")

client.logout()
if client.login(username=EMPLOYEE_EMAIL, password=EMPLOYEE_PASSWORD):
    print("\n=== RBAC: Employee blocked from admin ===")
    for path, name in EMPLOYEE_BLOCKED:
        resp = client.get(path, HTTP_HOST=AUDIT_HOST)
        blocked = resp.status_code in (302, 403)
        mark = "OK" if blocked else "FAIL"
        print(f"  {mark}  {resp.status_code}  {name:28s} {path}")
        if not blocked:
            fail.append(("RBAC-Employee", resp.status_code, name, path))
    audit_pages(
        [("/employees/my-work/", "My-Work"), ("/payroll/my-payslips/", "My-Payslips")],
        AUDIT_HOST,
        "EMPLOYEE ESS",
        ok_codes=(200,),
    )
else:
    print(f"\nEmployee login ({EMPLOYEE_EMAIL}) failed — skipping employee audit.")

if fail:
    print(f"\nAUDIT FAILED: {len(fail)} issue(s)")
    raise SystemExit(1)

print("\nAUDIT PASSED — all pages and RBAC checks OK")
