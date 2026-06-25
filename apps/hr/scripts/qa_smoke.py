"""Quick RBAC + letter workflow smoke — run: python scripts/qa_smoke.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hrms.settings.development")

import django

django.setup()

from django.test import Client

HOST = os.environ.get("HR_AUDIT_HOST", "acme.localhost")
FAILURES = []


def check(label, cond, detail=""):
    if cond:
        print(f"  OK  {label}")
    else:
        print(f"  FAIL {label} {detail}")
        FAILURES.append(label)


def main():
    c = Client()

    print("=== RBAC: Manager blocked from HR admin letter pages ===")
    c.login(username="manager@saptta.com", password="Demo@1234")
    for path in ["/hr/letters/history/", "/hr/letters/settings/", "/hr/letters/new/", "/employees/create/", "/payroll/run/create/"]:
        r = c.get(path, HTTP_HOST=HOST)
        check(f"Manager {path}", r.status_code in (302, 403), str(r.status_code))

    print("\n=== RBAC: Employee blocked from admin modules ===")
    c.logout()
    c.login(username="manju@saptta.com", password="Employee@1234")
    for path in ["/hr/letters/history/", "/hr/letters/", "/payroll/", "/employees/"]:
        r = c.get(path, HTTP_HOST=HOST)
        check(f"Employee {path}", r.status_code in (302, 403), str(r.status_code))

    print("\n=== RBAC: Employee ESS pages work ===")
    for path in ["/employees/my-work/", "/attendance/my/", "/payroll/my-payslips/"]:
        r = c.get(path, HTTP_HOST=HOST)
        check(f"Employee ESS {path}", r.status_code == 200, str(r.status_code))

    print("\n=== Letter workflow (Acme) ===")
    c.logout()
    assert c.login(username="demo@saptta.com", password="Demo@1234")
    from apps.accounts.models import User
    from apps.employees.models import Employee
    from apps.hr_ops.letter_workflow import create_draft_letter, issue_letter, email_letter
    from apps.hr_ops.models import LetterTemplate
    from apps.tenants.models import Tenant

    tenant = Tenant.objects.get(subdomain="acme")
    user = User.objects.get(email="demo@saptta.com")
    emp = Employee.objects.filter(tenant=tenant, is_active=True).exclude(user=user).first()
    tpl = LetterTemplate.objects.filter(tenant=tenant, letter_type="appointment", is_active=True).first()
    check("Acme has appointment template", tpl is not None)
    if emp and tpl:
        letter = create_draft_letter(tenant, emp, tpl, user)
        check("Draft created", letter.status == "draft")
        issue_letter(letter, user, skip_approval_check=True)
        letter.refresh_from_db()
        check("Letter issued", letter.status == "issued" and letter.pdf)
        check("Archived to employee docs", letter.employee_document_id is not None)

    print("\n=== Letter pages (HR admin) ===")
    for path in ["/hr/letters/", "/hr/letters/history/", "/hr/letters/settings/"]:
        r = c.get(path, HTTP_HOST=HOST)
        check(f"Admin {path}", r.status_code == 200, str(r.status_code))

    print(f"\n{'ALL PASS' if not FAILURES else f'FAILED: {len(FAILURES)}'}")
    if FAILURES:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
