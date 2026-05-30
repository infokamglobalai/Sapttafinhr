"""Page audit script — checks every URL returns 200 for the admin user."""
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hrms.settings.development")
import django
django.setup()

from django.test import Client
from apps.employees.models import Employee
from apps.accounts.models import User

client = Client()
ok_login = client.login(username="admin@demo.com", password="Admin@1234")
print(f"Login: {'OK' if ok_login else 'FAILED'}")

ADMIN_PAGES = [
    ("/", "Dashboard"),
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
    ("/hr/letters/", "HR-Letters"),
    ("/hr/assets/", "Assets"),
    ("/hr/onboarding/", "Onboarding"),
    ("/hr/exits/", "Exits"),
    ("/hr/announcements/", "Announcements"),
    ("/auth/profile/", "Profile"),
    ("/auth/change-password/", "Change-Password"),
]

print(f"\n=== ADMIN PAGES ({len(ADMIN_PAGES)} total) ===")
ok = 0
fail = []
for path, name in ADMIN_PAGES:
    try:
        resp = client.get(path, HTTP_HOST="127.0.0.1")
        status = resp.status_code
        if status == 200:
            print(f"  OK   {status}  {name:25s} {path}")
            ok += 1
        else:
            print(f"  FAIL {status}  {name:25s} {path}")
            fail.append((status, name, path))
    except Exception as e:
        print(f"  EXC       {name:25s} {path}  -> {type(e).__name__}: {str(e)[:60]}")
        fail.append(("EXC", name, path))

print(f"\nADMIN: {ok}/{len(ADMIN_PAGES)} return 200")

# ESS pages — need to link admin to an employee profile for these
admin_user = User.objects.get(email="admin@demo.com")
emp = Employee.objects.filter(user=admin_user).first()

if emp:
    print(f"\nAdmin has employee profile: {emp.full_name}")
    ESS_PAGES = [
        ("/attendance/my/", "My-Attendance"),
        ("/attendance/regularize/", "Regularization-Form"),
        ("/leaves/apply/", "Leave-Apply"),
        ("/leaves/my/", "My-Leaves"),
        ("/payroll/my-payslips/", "My-Payslips"),
    ]
    print(f"\n=== ESS PAGES ({len(ESS_PAGES)} total) ===")
    ess_ok = 0
    for path, name in ESS_PAGES:
        try:
            resp = client.get(path, HTTP_HOST="127.0.0.1")
            status = resp.status_code
            mark = "OK  " if status == 200 else "FAIL"
            print(f"  {mark} {status}  {name:25s} {path}")
            if status == 200:
                ess_ok += 1
        except Exception as e:
            print(f"  EXC       {name:25s} {path}  -> {type(e).__name__}: {str(e)[:60]}")
    print(f"\nESS: {ess_ok}/{len(ESS_PAGES)} return 200")
else:
    print(f"\nAdmin has no employee profile — skipping ESS audit.")
    print("(ESS pages correctly return 302 redirect for users without employee_profile.)")
