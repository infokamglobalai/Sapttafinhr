from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from apps.employees.models import Employee
from utils.access import hr_admin_required

from .access import projects_for_employee, user_can_access_project, user_can_edit_project
from .forms import (
    ProjectDocumentForm,
    ProjectForm,
    ProjectMemberForm,
    ProjectUpdateForm,
    TimeEntryForm,
)
from .models import Project, ProjectDocument, ProjectMember, ProjectUpdate, TimeEntry


def _employee_required(request):
    return getattr(request.user, "employee_profile", None)


@hr_admin_required
def project_list(request):
    tenant = request.tenant
    status = request.GET.get("status", "")
    qs = Project.objects.filter(tenant=tenant).select_related("department", "lead")
    if status:
        qs = qs.filter(status=status)
    return render(request, "projects/project_list.html", {
        "projects": qs.order_by("-updated_at"),
        "status": status,
        "status_choices": Project.STATUS_CHOICES,
    })


@hr_admin_required
def project_create_or_edit(request, pk=None):
    tenant = request.tenant
    project = get_object_or_404(Project, pk=pk, tenant=tenant) if pk else None
    if request.method == "POST":
        form = ProjectForm(tenant, request.POST, instance=project)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            if not project:
                obj.created_by = request.user
            obj.save()
            if not project and obj.lead_id:
                ProjectMember.objects.get_or_create(
                    project=obj, employee_id=obj.lead_id, defaults={"role": "lead"}
                )
            messages.success(request, f"Project “{obj.name}” saved.")
            return redirect("projects:detail", pk=obj.pk)
    else:
        form = ProjectForm(tenant, instance=project)
    return render(request, "projects/project_form.html", {"form": form, "project": project})


@login_required
def project_detail(request, pk):
    tenant = request.tenant
    project = get_object_or_404(
        Project.objects.select_related("department", "lead", "created_by"),
        pk=pk, tenant=tenant,
    )
    if not user_can_access_project(request.user, project):
        messages.error(request, "You do not have access to this project.")
        return redirect("projects:my_projects")

    members = project.members.select_related("employee", "employee__designation")
    documents = project.documents.select_related("uploaded_by").filter(is_team_visible=True)
    if request.user.is_hr_admin:
        documents = project.documents.select_related("uploaded_by")
    updates = project.updates.select_related("author")[:30]
    can_edit = user_can_edit_project(request.user, project)

    member_form = None
    if request.user.is_hr_admin:
        member_form = ProjectMemberForm(tenant, project)

    return render(request, "projects/project_detail.html", {
        "project": project,
        "members": members,
        "documents": documents,
        "updates": updates,
        "can_edit": can_edit,
        "member_form": member_form,
        "doc_form": ProjectDocumentForm() if can_edit else None,
        "update_form": ProjectUpdateForm() if can_edit else None,
        "hours_logged": project.time_entries.aggregate(total=Sum("hours"))["total"] or 0,
    })


@hr_admin_required
def project_add_member(request, pk):
    tenant = request.tenant
    project = get_object_or_404(Project, pk=pk, tenant=tenant)
    if request.method != "POST":
        return redirect("projects:detail", pk=pk)
    form = ProjectMemberForm(tenant, project, request.POST)
    if form.is_valid():
        member = form.save(commit=False)
        member.project = project
        member.save()
        messages.success(request, f"{member.employee.full_name} added to the team.")
    else:
        messages.error(request, "Could not add team member. They may already be on the project.")
    return redirect("projects:detail", pk=pk)


@login_required
def project_upload_document(request, pk):
    tenant = request.tenant
    project = get_object_or_404(Project, pk=pk, tenant=tenant)
    if not user_can_edit_project(request.user, project):
        messages.error(request, "You cannot upload documents to this project.")
        return redirect("projects:detail", pk=pk)
    if request.method != "POST":
        return redirect("projects:detail", pk=pk)
    form = ProjectDocumentForm(request.POST, request.FILES)
    if form.is_valid():
        doc = form.save(commit=False)
        doc.project = project
        doc.uploaded_by = request.user
        doc.save()
        messages.success(request, "Document uploaded.")
    else:
        messages.error(request, "Please check the document form and try again.")
    return redirect("projects:detail", pk=pk)


@login_required
def project_add_update(request, pk):
    tenant = request.tenant
    project = get_object_or_404(Project, pk=pk, tenant=tenant)
    if not user_can_edit_project(request.user, project):
        messages.error(request, "You cannot post updates to this project.")
        return redirect("projects:detail", pk=pk)
    if request.method != "POST":
        return redirect("projects:detail", pk=pk)
    form = ProjectUpdateForm(request.POST)
    if form.is_valid():
        upd = form.save(commit=False)
        upd.project = project
        upd.author = request.user
        upd.save()
        messages.success(request, "Update posted.")
    else:
        messages.error(request, "Update message is required.")
    return redirect("projects:detail", pk=pk)


@login_required
def my_projects(request):
    employee = _employee_required(request)
    if not employee:
        return redirect("tenants:dashboard")
    projects = projects_for_employee(employee).select_related("department", "lead")
    return render(request, "projects/my_projects.html", {"projects": projects})


@login_required
def my_timesheet(request):
    employee = _employee_required(request)
    if not employee:
        return redirect("tenants:dashboard")

    projects = projects_for_employee(employee).filter(status__in=("planning", "active"))
    year = int(request.GET.get("year", timezone.localdate().year))
    month = int(request.GET.get("month", timezone.localdate().month))

    entries = TimeEntry.objects.filter(
        employee=employee,
        entry_date__year=year,
        entry_date__month=month,
    ).select_related("project").order_by("-entry_date")

    if request.method == "POST":
        form = TimeEntryForm(employee, projects, request.POST)
        if form.is_valid():
            entry = form.save(commit=False)
            entry.employee = employee
            entry.save()
            messages.success(request, "Time logged.")
            return redirect("projects:my_timesheet")
    else:
        form = TimeEntryForm(employee, projects, initial={"entry_date": timezone.localdate()})

    total_hours = entries.aggregate(total=Sum("hours"))["total"] or 0
    return render(request, "projects/my_timesheet.html", {
        "entries": entries,
        "form": form,
        "year": year,
        "month": month,
        "total_hours": total_hours,
        "projects": projects,
    })
