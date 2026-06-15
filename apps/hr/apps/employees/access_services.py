"""Employee application login: roles, revoke/restore, credential reveal session."""
from __future__ import annotations

from apps.accounts.models import Role, User, UserRole


ASSIGNABLE_ROLES = ("employee", "manager", "hr_admin")

ROLE_LABELS = {
    "super_admin": "Super Admin",
    "hr_admin": "HR Admin",
    "manager": "Manager",
    "employee": "Employee",
}


def get_login_url(request) -> str:
    from django.urls import reverse
    return request.build_absolute_uri(reverse("accounts:login"))


def get_employee_access(employee) -> dict:
    """Summary for employee detail / team access UI."""
    user = employee.user
    if not user:
        return {
            "has_login": False,
            "email": employee.official_email or "",
            "is_active": False,
            "roles": [],
            "role_labels": [],
        }
    roles = list(
        UserRole.objects.filter(user=user)
        .select_related("role")
        .values_list("role__name", flat=True)
    )
    return {
        "has_login": True,
        "email": user.email,
        "is_active": user.is_active,
        "roles": roles,
        "role_labels": [ROLE_LABELS.get(r, r.replace("_", " ").title()) for r in roles],
        "user_id": user.pk,
    }


def revoke_employee_access(employee) -> bool:
    """Block login without deleting the user account."""
    user = employee.user
    if not user:
        return False
    if not user.is_active:
        return False
    user.is_active = False
    user.save(update_fields=["is_active"])
    return True


def restore_employee_access(employee) -> bool:
    user = employee.user
    if not user:
        return False
    if user.is_active:
        return False
    user.is_active = True
    user.save(update_fields=["is_active"])
    return True


def set_employee_roles(user: User, role_names: list[str], granted_by: User | None = None) -> None:
    """
    Set assignable roles for an employee login.
    Always keeps 'employee' role if any role is assigned.
    Does not touch super_admin.
    """
    if UserRole.objects.filter(user=user, role__name="super_admin").exists():
        return

    names = {n for n in role_names if n in ASSIGNABLE_ROLES}
    if not names:
        names = {"employee"}

    if "employee" not in names and ("manager" in names or "hr_admin" in names):
        names.add("employee")

    UserRole.objects.filter(user=user, role__name__in=ASSIGNABLE_ROLES).delete()

    for name in names:
        role = Role.objects.filter(tenant=user.tenant, name=name).first()
        if role:
            UserRole.objects.get_or_create(
                user=user,
                role=role,
                defaults={"granted_by": granted_by},
            )


def push_credential_session(request, employee, email: str, password: str) -> None:
    """Store one-time credential reveal in session (same pattern as bulk import)."""
    request.session[f"employee_credential_{employee.pk}"] = {
        "name": employee.full_name,
        "code": employee.employee_code,
        "email": email,
        "password": password,
    }
    request.session.modified = True


def pop_credential_session(request, employee_pk: int) -> dict | None:
    key = f"employee_credential_{employee_pk}"
    data = request.session.pop(key, None)
    if data:
        request.session.modified = True
    return data
