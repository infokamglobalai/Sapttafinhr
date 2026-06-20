"""Ensure every HR login user has a linked Employee row for self-service."""
from __future__ import annotations

from django.utils import timezone


def ensure_user_employee_profile(user, *, tenant=None):
    """Create or return the Employee profile for a User (managers, HR staff, SSO)."""
    from apps.employees.models import Employee

    tenant = tenant or user.tenant
    if not tenant:
        return None

    try:
        return user.employee_profile
    except Employee.DoesNotExist:
        pass

    existing = Employee.objects.filter(tenant=tenant, user=user).first()
    if existing:
        return existing

    local = (user.email or "user").split("@")[0]
    parts = local.replace(".", " ").replace("_", " ").split()
    first = parts[0].title() if parts else "User"
    last = " ".join(p.title() for p in parts[1:]) if len(parts) > 1 else ""

    code_base = (user.email or str(user.pk)).split("@")[0].upper().replace(".", "")[:12]
    code = f"USR-{code_base}"
    suffix = 1
    while Employee.objects.filter(tenant=tenant, employee_code=code).exists():
        code = f"USR-{code_base}-{suffix}"
        suffix += 1

    return Employee.objects.create(
        tenant=tenant,
        user=user,
        employee_code=code,
        first_name=first,
        last_name=last,
        date_of_joining=timezone.localdate(),
        official_email=user.email or "",
        employment_status="active",
        is_active=True,
    )
