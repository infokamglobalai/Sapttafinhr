"""Server-side validation for the HR first-run setup wizard."""
from __future__ import annotations

import re
from datetime import date

from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from .jurisdiction import is_india_payroll
from .tax_validation import (
    gstin_pan_consistency,
    normalise_tax_id,
    validate_gstin,
    validate_pan,
    validate_tax_id,
)

EMP_CODE_RE = re.compile(r"^[A-Z0-9][A-Z0-9\-_/]{1,19}$", re.I)
LEAVE_CODE_RE = re.compile(r"^[A-Z0-9]{1,10}$")


def validate_setup_post(tenant, post) -> tuple[dict | None, dict[str, str]]:
    """
    Validate POST data. Returns (cleaned_data, field_errors).
    field_errors maps field name → message; non-field errors use key ``__all__``.
    """
    errors: dict[str, str] = {}
    jurisdiction = tenant.payroll_jurisdiction

    company_name = (post.get("company_name") or "").strip()
    if len(company_name) < 2:
        errors["company_name"] = "Company name must be at least 2 characters."
    elif len(company_name) > 255:
        errors["company_name"] = "Company name is too long (max 255 characters)."

    address = (post.get("address") or "").strip()
    if address and len(address) < 10:
        errors["address"] = "Registered address should be at least 10 characters."

    gstin = normalise_tax_id(post.get("gstin") or "")
    pan = normalise_tax_id(post.get("pan") or "")

    if is_india_payroll(jurisdiction):
        if err := validate_gstin(gstin):
            errors["gstin"] = err
        if err := validate_pan(pan):
            errors["pan"] = err
        if err := gstin_pan_consistency(gstin, pan):
            errors["pan"] = err
    else:
        if err := validate_tax_id(jurisdiction, gstin):
            errors["tax_id"] = err
        pan = ""

    dept_names = [d.strip() for d in (post.get("departments") or "").splitlines() if d.strip()]
    if not dept_names:
        errors["departments"] = "Add at least one department (one per line)."
    elif len(dept_names) > 50:
        errors["departments"] = "Maximum 50 departments."
    seen_dept = set()
    for name in dept_names:
        key = name.lower()
        if key in seen_dept:
            errors["departments"] = f"Duplicate department: “{name}”."
            break
        seen_dept.add(key)
        if len(name) > 100:
            errors["departments"] = f"Department name too long: “{name[:20]}…”."
            break

    leave_names = post.getlist("leave_name[]")
    leave_codes = post.getlist("leave_code[]")
    leave_rows: list[tuple[str, str]] = []
    seen_codes: set[str] = set()
    has_leave = False
    for i, name in enumerate(leave_names):
        name = name.strip()
        code = (leave_codes[i] if i < len(leave_codes) else "").strip().upper()
        if not name and not code:
            continue
        has_leave = True
        if not name:
            errors[f"leave_name_{i}"] = "Leave type name is required when a code is set."
        if not code:
            errors[f"leave_code_{i}"] = "Leave code is required."
        elif not LEAVE_CODE_RE.match(code):
            errors[f"leave_code_{i}"] = "Leave code must be 1–10 letters or digits."
        elif code in seen_codes:
            errors[f"leave_code_{i}"] = f"Duplicate leave code: {code}."
        else:
            seen_codes.add(code)
            leave_rows.append((name, code))
    if not has_leave:
        errors["leaves"] = "Add at least one leave type."

    emp_rows: list[dict] = []
    emp_codes = post.getlist("emp_code[]")
    emp_first = post.getlist("emp_first[]")
    emp_last = post.getlist("emp_last[]")
    emp_doj = post.getlist("emp_doj[]")
    emp_dept = post.getlist("emp_dept[]")
    emp_email = post.getlist("emp_email[]")
    emp_role = post.getlist("emp_role[]")
    seen_emp_codes: set[str] = set()

    for i, code in enumerate(emp_codes):
        code = (code or "").strip().upper()
        first = (emp_first[i] if i < len(emp_first) else "").strip()
        last = (emp_last[i] if i < len(emp_last) else "").strip()
        doj_raw = (emp_doj[i] if i < len(emp_doj) else "").strip()
        dept_name = (emp_dept[i] if i < len(emp_dept) else "").strip()
        email = (emp_email[i] if i < len(emp_email) else "").strip()
        role = (emp_role[i] if i < len(emp_role) else "employee").strip() or "employee"

        if not code and not first and not doj_raw and not email:
            continue

        prefix = f"emp_{i}"
        if not code:
            errors[f"{prefix}_code"] = "Employee code is required."
        elif not EMP_CODE_RE.match(code):
            errors[f"{prefix}_code"] = "Use 2–20 letters, numbers, hyphens or underscores."
        elif code in seen_emp_codes:
            errors[f"{prefix}_code"] = f"Duplicate employee code: {code}."
        else:
            seen_emp_codes.add(code)

        if not first:
            errors[f"{prefix}_first"] = "First name is required."
        elif len(first) > 80:
            errors[f"{prefix}_first"] = "First name is too long."

        if not doj_raw:
            errors[f"{prefix}_doj"] = "Joining date is required."
        else:
            try:
                parts = doj_raw.split("-")
                doj = date(int(parts[0]), int(parts[1]), int(parts[2]))
                if doj > date.today():
                    errors[f"{prefix}_doj"] = "Joining date cannot be in the future."
            except (ValueError, IndexError):
                errors[f"{prefix}_doj"] = "Enter a valid joining date."

        if email:
            try:
                validate_email(email)
            except ValidationError:
                errors[f"{prefix}_email"] = "Enter a valid email address."

        if dept_name and dept_name.lower() not in {d.lower() for d in dept_names}:
            errors[f"{prefix}_dept"] = f"Department “{dept_name}” is not in your department list."

        if role not in ("employee", "manager", "hr_admin"):
            errors[f"{prefix}_role"] = "Invalid role selected."

        if not errors.get(f"{prefix}_code") and not errors.get(f"{prefix}_first") and not errors.get(f"{prefix}_doj"):
            emp_rows.append({
                "code": code,
                "first": first,
                "last": last,
                "doj": doj_raw,
                "dept": dept_name,
                "email": email,
                "role": role,
            })

    if errors:
        return None, errors

    return {
        "company_name": company_name,
        "gstin": gstin,
        "pan": pan,
        "address": address,
        "departments": dept_names,
        "leave_rows": leave_rows,
        "emp_rows": emp_rows,
    }, {}
