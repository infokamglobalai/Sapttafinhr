"""Project workspace access helpers."""
from __future__ import annotations

from .models import Project, ProjectMember


def user_can_access_project(user, project: Project) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_hr_admin:
        return True
    employee = getattr(user, "employee_profile", None)
    if not employee:
        return False
    if project.lead_id == employee.pk:
        return True
    return ProjectMember.objects.filter(project=project, employee=employee).exists()


def user_can_edit_project(user, project: Project) -> bool:
    if user.is_hr_admin:
        return True
    employee = getattr(user, "employee_profile", None)
    if not employee:
        return False
    if project.lead_id == employee.pk:
        return True
    return ProjectMember.objects.filter(
        project=project, employee=employee, role__in=("lead", "member")
    ).exists()


def projects_for_employee(employee):
    from django.db.models import Q

    return Project.objects.filter(
        Q(members__employee=employee) | Q(lead=employee),
        tenant=employee.tenant,
    ).distinct()
