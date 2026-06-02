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


@transaction.atomic
def provision_employee_login(employee, created_by=None, reset_password: bool = False):
    """Create (or reset) a self-service login for an existing employee.

    Employees added via the setup wizard or bulk paths may not have a User yet,
    so the (already built) self-service screens are unreachable for them. This
    bridges that: it creates a User from the employee's email, links it via
    ``Employee.user``, and grants the default ``employee`` role.

    Returns ``(user, temp_password)``. ``temp_password`` is ``None`` when an
    existing login is left untouched (``reset_password=False`` and a user is
    already linked) — email delivery isn't wired yet, so the caller is expected
    to surface the returned password to the admin to share manually.
    """
    from apps.accounts.models import Role, UserRole

    tenant = employee.tenant

    # Already linked: optionally reset the password, otherwise no-op.
    if employee.user_id:
        if reset_password:
            password = _generate_temp_password()
            user = employee.user
            user.set_password(password)
            user.is_active = True
            user.save(update_fields=["password", "is_active"])
            return user, password
        return employee.user, None

    email = (employee.official_email or employee.personal_email or "").strip().lower()
    if not email:
        raise ValueError("This employee has no email address. Add an official or personal email first.")

    # Reuse an existing user with this email in the tenant, else create one.
    user = User.objects.filter(tenant=tenant, email=email).first()
    password = None
    if user is None:
        password = _generate_temp_password()
        user = User.objects.create_user(email=email, tenant=tenant, password=password)

    employee_role = Role.objects.filter(tenant=tenant, name="employee").first()
    if employee_role:
        UserRole.objects.get_or_create(user=user, role=employee_role, defaults={"granted_by": created_by})

    employee.user = user
    employee.save(update_fields=["user"])
    return user, password


def email_login_credentials(employee, password: str, login_url: str) -> bool:
    """Email an employee their new self-service credentials. Returns True if sent.

    Best-effort: never raises — provisioning a login must not fail because mail is
    misconfigured. In dev (console email backend) this just prints to the logs.
    """
    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives
    from django.template.loader import render_to_string
    from django.utils.html import strip_tags

    user = employee.user
    if not user or not user.email or not password:
        return False
    # The dev console/dummy backends don't actually reach the employee — report
    # "not sent" so the caller shows the password on screen instead.
    backend = getattr(settings, "EMAIL_BACKEND", "")
    if any(b in backend for b in ("console", "dummy")):
        return False
    tenant = employee.tenant
    try:
        html = render_to_string("auth/emails/login_credentials.html", {
            "user": user, "password": password, "login_url": login_url,
            "tenant": tenant, "first_name": employee.first_name,
        })
        msg = EmailMultiAlternatives(
            subject=f"Your {tenant.name if tenant else 'HRMS'} login",
            body=strip_tags(html),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=False)
        return True
    except Exception:
        return False


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
