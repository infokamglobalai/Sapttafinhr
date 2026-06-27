"""Project workspace access helpers."""
from __future__ import annotations

from .models import Project, ProjectMember


def user_can_access_project(user, project: Project) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_hr_admin or user.has_perm_code("projects.manage"):
        return True
    employee = getattr(user, "employee_profile", None)
    if not employee:
        return False
    if project.lead_id == employee.pk:
        return True
    return ProjectMember.objects.filter(project=project, employee=employee).exists()


def user_can_edit_project(user, project: Project) -> bool:
    if user.is_hr_admin or user.has_perm_code("projects.manage"):
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


def attach_project_roles(employee, projects):
    """Annotate each project with my_role / my_role_label for template display."""
    project_list = list(projects)
    if not project_list:
        return project_list

    role_by_project = {
        m.project_id: m.role
        for m in ProjectMember.objects.filter(
            employee=employee,
            project_id__in=[p.id for p in project_list],
        )
    }
    role_labels = dict(ProjectMember.ROLE_CHOICES)

    for project in project_list:
        if project.lead_id == employee.pk:
            project.my_role = "lead"
            project.my_role_label = "Project lead"
        elif project.id in role_by_project:
            project.my_role = role_by_project[project.id]
            project.my_role_label = role_labels.get(project.my_role, project.my_role.title())
        else:
            project.my_role = "member"
            project.my_role_label = "Member"

    return project_list
