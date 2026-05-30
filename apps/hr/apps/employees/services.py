"""
Employee service layer — business logic separated from views and models.
"""
import csv
import io
import datetime
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string

from .models import Employee, Department, Designation, OfficeLocation

User = get_user_model()


def _generate_temp_password(length: int = 12) -> str:
    """Generate a random temp password for new users (Django 5+ compatible)."""
    return get_random_string(length, allowed_chars="abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789")


def _parse_date(value: str) -> datetime.date:
    """
    Parse a date string in any of the common formats used in India:
    YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD.
    Raises ValueError if none match.
    """
    if not value:
        raise ValueError("Empty date")
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date format: '{value}' (use DD-MM-YYYY or YYYY-MM-DD)")


def generate_employee_code(tenant) -> str:
    """Generate next sequential employee code: EMP0001, EMP0002, ..."""
    last = (
        Employee.objects.filter(tenant=tenant)
        .order_by("-id")
        .values_list("employee_code", flat=True)
        .first()
    )
    if last and last.startswith("EMP"):
        try:
            num = int(last[3:]) + 1
        except ValueError:
            num = 1
    else:
        num = 1
    return f"EMP{num:04d}"


@transaction.atomic
def create_employee(tenant, data: dict, created_by=None) -> Employee:
    """
    Create an employee and their associated User account.
    data keys match Employee model fields plus optional 'password'.
    """
    from apps.accounts.models import Role, UserRole

    employee_code = data.get("employee_code") or generate_employee_code(tenant)

    # Create login user
    password = data.pop("password", None) or _generate_temp_password()
    official_email = data.get("official_email") or data.get("personal_email", "")

    user = None
    if official_email:
        user = User.objects.create_user(
            email=official_email,
            tenant=tenant,
            password=password,
        )
        # Assign default 'employee' role
        employee_role = Role.objects.filter(tenant=tenant, name="employee").first()
        if employee_role:
            UserRole.objects.create(user=user, role=employee_role, granted_by=created_by)

    emp = Employee.objects.create(
        tenant=tenant,
        user=user,
        employee_code=employee_code,
        **{k: v for k, v in data.items() if k not in ("password",)},
    )

    # Update denormalized count
    tenant.employee_count = Employee.objects.filter(tenant=tenant, is_active=True).count()
    tenant.save(update_fields=["employee_count"])

    # Auto-start onboarding from default template, if one exists
    try:
        from apps.hr_ops.services import start_onboarding, audit_log
        start_onboarding(tenant, emp)
        audit_log(
            tenant, created_by, "create", "Employee", emp,
            f"Created employee {emp.full_name} ({emp.employee_code}) · {emp.designation.name if emp.designation else ''}",
            details={"email": emp.official_email, "doj": emp.date_of_joining.isoformat() if emp.date_of_joining else None},
        )
    except Exception:
        pass

    return emp, password


def bulk_import_employees(tenant, csv_file, created_by=None) -> dict:
    """
    Import employees from a CSV upload — complete onboarding in one row.
    Required: first_name, last_name, date_of_joining, official_email, ctc_annual
    Strongly recommended: pan, work_state_code, phone_primary, bank_name,
                          bank_account, ifsc_code
    Optional: middle_name, personal_email, gender, employment_type, department,
              designation, basic_monthly, uan, aadhaar
    Returns {'created': N, 'errors': [{'row': N, 'error': '...'}]}
    """
    from apps.payroll.models import SalaryStructure, EmployeeSalary
    from decimal import Decimal, InvalidOperation
    from .models import EmployeeBankAccount

    reader = csv.DictReader(io.StringIO(csv_file.read().decode("utf-8-sig")))
    created = 0
    errors = []

    required_fields = {"first_name", "last_name", "date_of_joining", "official_email", "ctc_annual"}

    # Fetch (or auto-create) a default salary structure so salary records can be inserted.
    structure = SalaryStructure.objects.filter(tenant=tenant, is_active=True).order_by("id").first()
    if not structure:
        structure = SalaryStructure.objects.create(
            tenant=tenant,
            name="Default Structure",
            description="Auto-created during bulk employee import",
            is_active=True,
        )

    for row_num, row in enumerate(reader, start=2):
        # Normalize whitespace
        row = {k.strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}

        missing = required_fields - set(k for k, v in row.items() if v)
        if missing:
            errors.append({"row": row_num, "error": f"Missing required fields: {', '.join(sorted(missing))}"})
            continue

        try:
            # ── Validate CTC up front ───────────────────────────────────────
            try:
                ctc = Decimal(row["ctc_annual"].replace(",", ""))
                if ctc <= 0:
                    raise ValueError
            except (InvalidOperation, ValueError):
                errors.append({"row": row_num, "error": f"Invalid ctc_annual: '{row['ctc_annual']}' (use a whole number, e.g. 600000)"})
                continue

            # Basic monthly: explicit value or default to 40% of CTC / 12
            if row.get("basic_monthly"):
                try:
                    basic = Decimal(row["basic_monthly"].replace(",", ""))
                except InvalidOperation:
                    errors.append({"row": row_num, "error": f"Invalid basic_monthly: '{row['basic_monthly']}'"})
                    continue
            else:
                basic = (ctc * Decimal("0.40") / 12).quantize(Decimal("0.01"))

            # ── Resolve org structure FKs ───────────────────────────────────
            dept = None
            if row.get("department"):
                dept, _ = Department.objects.get_or_create(tenant=tenant, name=row["department"])
            desig = None
            if row.get("designation"):
                desig, _ = Designation.objects.get_or_create(tenant=tenant, name=row["designation"])

            # ── Build the employee payload ──────────────────────────────────
            data = {
                "first_name": row["first_name"],
                "last_name": row["last_name"],
                "middle_name": row.get("middle_name", ""),
                "official_email": row["official_email"].lower(),
                "personal_email": (row.get("personal_email") or "").lower(),
                "phone_primary": row.get("phone_primary", ""),
                "date_of_joining": _parse_date(row["date_of_joining"]),
                "department": dept,
                "designation": desig,
                "employment_type": (row.get("employment_type") or "full_time").lower(),
                "gender": (row.get("gender") or "").lower(),
                "work_state_code": row.get("work_state_code", ""),
            }
            emp, _ = create_employee(tenant, data, created_by=created_by)

            # ── Encrypted PII (PAN, Aadhaar) ────────────────────────────────
            if row.get("pan"):
                emp.pan_number = row["pan"].upper()
            if row.get("aadhaar"):
                emp.aadhaar_number = row["aadhaar"].replace(" ", "")
            if row.get("pan") or row.get("aadhaar"):
                emp.save(update_fields=["_pan_enc", "_aadhaar_enc"])

            # ── Salary record (mandatory) ───────────────────────────────────
            EmployeeSalary.objects.create(
                tenant=tenant, employee=emp, structure=structure,
                effective_date=emp.date_of_joining,
                ctc_annual=ctc, basic_monthly=basic,
                is_active=True, created_by=created_by,
            )

            # ── Bank account (optional but strongly recommended) ────────────
            if row.get("bank_account") and row.get("ifsc_code"):
                bank = EmployeeBankAccount(
                    employee=emp,
                    account_holder_name=row.get("account_holder_name") or emp.full_name,
                    bank_name=row.get("bank_name", ""),
                    branch_name=row.get("branch_name", ""),
                    ifsc_code=row["ifsc_code"].upper(),
                    account_type=row.get("account_type", "savings"),
                    is_primary=True,
                )
                bank.account_number = row["bank_account"]
                bank.save()

            created += 1
        except Exception as exc:
            errors.append({"row": row_num, "error": str(exc)})

    return {"created": created, "errors": errors}
