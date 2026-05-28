"""Test full bulk import — salary, bank, PAN, work state, all in one go."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hrms.settings.development")
django.setup()

from apps.tenants.models import Tenant
from apps.accounts.models import User
from apps.employees.models import Employee
from apps.employees.services import bulk_import_employees
from apps.payroll.models import EmployeeSalary

tenant = Tenant.objects.get(subdomain="demo")
admin = User.objects.get(email="admin@demo.com", tenant=tenant)

csv_data = b"""first_name,last_name,date_of_joining,official_email,ctc_annual,department,designation,phone_primary,pan,work_state_code,bank_name,bank_account,ifsc_code
Anjali,Verma,15-01-2024,anjali.v@demo.com,720000,Engineering,Backend Engineer,9876543220,VERMA1234F,IN-KA,HDFC Bank,50100987654321,HDFC0009999
Rohit,Bansal,20-03-2024,rohit.b@demo.com,540000,Sales,Account Manager,9876543221,BANSL5678K,IN-MH,ICICI Bank,602501999888,ICIC0006999
"""

class FakeUpload:
    def __init__(self, data): self._data = data
    def read(self): return self._data

result = bulk_import_employees(tenant, FakeUpload(csv_data), created_by=admin)
print(f"Created: {result['created']} / 2")
for err in result["errors"]:
    print(f"  Row {err['row']}: {err['error']}")

# Verify what we actually saved
print("\n--- Verification ---")
for email in ("anjali.v@demo.com", "rohit.b@demo.com"):
    emp = Employee.objects.filter(official_email=email, tenant=tenant).first()
    if not emp:
        print(f"  {email}: NOT FOUND")
        continue
    salary = EmployeeSalary.objects.filter(employee=emp, is_active=True).first()
    bank = emp.bank_accounts.filter(is_primary=True).first()
    dept = emp.department.name if emp.department else "-"
    desig = emp.designation.name if emp.designation else "-"
    print(f"  {emp.full_name} ({emp.employee_code})")
    print(f"    Dept/Desig: {dept} / {desig}")
    print(f"    PAN: {emp.pan_number}  |  State: {emp.work_state_code}")
    if salary:
        print(f"    CTC: Rs.{salary.ctc_annual}  |  Basic: Rs.{salary.basic_monthly}/mo")
    if bank:
        print(f"    Bank: {bank.bank_name} {bank.masked_account_number} IFSC {bank.ifsc_code}")
