"""
Employee service layer — business logic separated from views and models.
"""
import csv
import io
import datetime
from django.db import transaction
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string

from .models import Employee, Department, Designation, OfficeLocation

User = get_user_model()


class EmployeeEmailInUse(Exception):
    """Raised when official email is already tied to another employee or login."""

    def __init__(self, email: str, employee: Employee | None = None):
        self.email = email
        self.employee = employee
        if employee:
            status = employee.get_employment_status_display()
            if employee.employment_status in ("exited", "terminated"):
                hint = (
                    "Open their employee profile to rehire them, or use a different email "
                    "for a new hire."
                )
            else:
                hint = "Use a different official email or update the existing employee record."
            super().__init__(
                f"This official email is already used by {employee.full_name} "
                f"({employee.employee_code}, {status}). {hint}"
            )
        else:
            super().__init__(
                f"The email {email} is already registered in this workspace. "
                "Use a different official email."
            )


def normalize_employee_email(email: str) -> str:
    if not email:
        return ""
    return User.objects.normalize_email(email.strip().lower())


def check_employee_email_available(
    tenant,
    email: str,
    *,
    exclude_employee_id=None,
) -> None:
    """Raise EmployeeEmailInUse if email cannot be assigned to a new employee."""
    email = normalize_employee_email(email)
    if not email:
        return

    emp_qs = Employee.objects.filter(tenant=tenant).filter(
        Q(official_email__iexact=email) | Q(personal_email__iexact=email)
    )
    if exclude_employee_id:
        emp_qs = emp_qs.exclude(pk=exclude_employee_id)
    conflict = emp_qs.first()
    if conflict:
        raise EmployeeEmailInUse(email, conflict)

    existing_user = User.objects.filter(tenant=tenant, email__iexact=email).first()
    if not existing_user:
        return

    try:
        profile = existing_user.employee_profile
    except Employee.DoesNotExist:
        return  # orphan login — create_employee may reuse it

    if exclude_employee_id and profile.pk == exclude_employee_id:
        return
    raise EmployeeEmailInUse(email, profile)


def _attach_or_create_user(tenant, email: str, *, created_by=None, password=None):
    """Return a login user for a new employee, reusing orphan accounts when safe."""
    from apps.accounts.models import Role, UserRole

    email = normalize_employee_email(email)
    if not email:
        return None

    check_employee_email_available(tenant, email)

    existing = User.objects.filter(tenant=tenant, email__iexact=email).first()
    if existing:
        user = existing
        if password:
            user.set_password(password)
            user.is_active = True
        elif not user.has_usable_password():
            user.is_active = False
        user.save()
    else:
        user = User.objects.create_user(
            email=email,
            tenant=tenant,
            password=password or None,
        )
        if not password:
            user.is_active = False
            user.save(update_fields=["is_active"])

    employee_role = Role.objects.filter(tenant=tenant, name="employee").first()
    if employee_role:
        UserRole.objects.get_or_create(
            user=user,
            role=employee_role,
            defaults={"granted_by": created_by},
        )
    return user


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
    from apps.tenants.limits import check_employee_capacity, sync_employee_count_and_alerts

    check_employee_capacity(tenant, additional=1)

    employee_code = data.get("employee_code") or generate_employee_code(tenant)

    # Create login user. No explicit password → leave it None so the account is
    # created locked and the employee can only get in via the invite link.
    password = data.pop("password", None)
    official_email = normalize_employee_email(
        data.get("official_email") or data.get("personal_email", "")
    )
    if official_email:
        data["official_email"] = official_email

    user = None
    if official_email:
        user = _attach_or_create_user(
            tenant,
            official_email,
            created_by=created_by,
            password=password,
        )

    emp = Employee.objects.create(
        tenant=tenant,
        user=user,
        employee_code=employee_code,
        **{k: v for k, v in data.items() if k not in ("password", "employee_code")},
    )

    sync_employee_count_and_alerts(tenant)

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

    Returns ``(user, needs_invite)``. ``needs_invite`` is ``True`` when the caller
    should hand the employee a fresh invite link (a new or reset account that is
    locked until the link is accepted). Accounts are created/reset LOCKED —
    inactive with no usable password — so the normal login refuses them until the
    admin-issued invite link is used.
    """
    from apps.accounts.models import Role, UserRole

    tenant = employee.tenant

    # Already linked: on reset, re-lock and re-issue an invite; else no-op.
    if employee.user_id:
        if reset_password:
            user = employee.user
            user.set_unusable_password()
            user.is_active = False
            user.save(update_fields=["password", "is_active"])
            return user, True
        return employee.user, False

    email = (employee.official_email or employee.personal_email or "").strip().lower()
    if not email:
        raise ValueError("This employee has no email address. Add an official or personal email first.")

    # Reuse an existing user with this email in the tenant, else create a locked one.
    user = User.objects.filter(tenant=tenant, email=email).first()
    needs_invite = False
    if user is None:
        user = User.objects.create_user(email=email, tenant=tenant, password=None)
        user.is_active = False
        user.save(update_fields=["is_active"])
        needs_invite = True

    employee_role = Role.objects.filter(tenant=tenant, name="employee").first()
    if employee_role:
        UserRole.objects.get_or_create(user=user, role=employee_role, defaults={"granted_by": created_by})

    employee.user = user
    employee.save(update_fields=["user"])
    return user, needs_invite


def email_employee_invite(employee, invite_url: str, login_url: str = "") -> dict:
    """Email an employee their secure invite link.

    Returns {"sent": bool, "reason": str} — never raises.
    """
    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives
    from django.template.loader import render_to_string
    from django.utils.html import strip_tags

    from utils.mail import smtp_configured

    user = employee.user
    if not user or not user.email or not invite_url:
        return {"sent": False, "reason": "no_email"}
    if not smtp_configured():
        return {"sent": False, "reason": "no_smtp"}
    tenant = employee.tenant
    try:
        html = render_to_string("auth/emails/login_credentials.html", {
            "user": user, "invite_url": invite_url, "login_url": login_url,
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
        return {"sent": True, "reason": "sent"}
    except Exception:
        return {"sent": False, "reason": "send_failed"}


def invite_delivery_message(result: dict, *, email: str, employee_name: str = "") -> str:
    """Human-readable admin message after provisioning a login."""
    name = employee_name or email
    if result.get("sent"):
        return f"Invite email sent to {email}."
    reason = result.get("reason", "")
    if reason == "no_smtp":
        return (
            f"SMTP is not configured — copy the invite link on the next screen and "
            f"send it to {email} manually."
        )
    if reason == "send_failed":
        return (
            f"Could not send email to {email}. Copy the invite link on the next screen "
            f"and share it with {name}."
        )
    return f"Share the invite link on the next screen with {name}."


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
    from apps.tenants.limits import check_employee_capacity, EmployeeLimitExceeded

    reader = csv.DictReader(io.StringIO(csv_file.read().decode("utf-8-sig")))
    created = 0
    errors = []

    required_fields = {"first_name", "last_name", "date_of_joining", "official_email", "ctc_annual"}

    rows = list(reader)
    pending = sum(
        1 for row in rows
        if not (required_fields - set(k for k, v in (
            {k.strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
        ).items() if v))
    )
    if pending:
        try:
            check_employee_capacity(tenant, additional=pending)
        except EmployeeLimitExceeded as exc:
            from apps.tenants.seat_alerts import notify_owners_add_blocked

            notify_owners_add_blocked(tenant)
            return {"created": 0, "errors": [{"row": 0, "error": str(exc)}]}

    # Fetch (or auto-create) a default salary structure so salary records can be inserted.
    structure = SalaryStructure.objects.filter(tenant=tenant, is_active=True).order_by("id").first()
    if not structure:
        structure = SalaryStructure.objects.create(
            tenant=tenant,
            name="Default Structure",
            description="Auto-created during bulk employee import",
            is_active=True,
        )

    for row_num, row in enumerate(rows, start=2):
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
