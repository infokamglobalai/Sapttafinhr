from django import forms

from apps.employees.models import Employee

from .models import Project, ProjectDocument, ProjectMember, ProjectUpdate, TimeEntry

INPUT = "input input-bordered w-full"
SELECT = "select select-bordered w-full"
TEXTAREA = "textarea textarea-bordered w-full"


class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = [
            "code", "name", "description", "status", "department", "lead",
            "start_date", "end_date",
        ]
        widgets = {
            "code": forms.TextInput(attrs={"class": INPUT, "placeholder": "PRJ-001"}),
            "name": forms.TextInput(attrs={"class": INPUT}),
            "description": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3}),
            "status": forms.Select(attrs={"class": SELECT}),
            "department": forms.Select(attrs={"class": SELECT}),
            "lead": forms.Select(attrs={"class": SELECT}),
            "start_date": forms.DateInput(attrs={"class": INPUT, "type": "date"}),
            "end_date": forms.DateInput(attrs={"class": INPUT, "type": "date"}),
        }

    def __init__(self, tenant, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["department"].queryset = tenant.departments.filter(is_active=True)
        self.fields["lead"].queryset = Employee.objects.filter(tenant=tenant, is_active=True).order_by("first_name")
        self.fields["department"].required = False
        self.fields["lead"].required = False


class ProjectMemberForm(forms.ModelForm):
    class Meta:
        model = ProjectMember
        fields = ["employee", "role"]
        widgets = {
            "employee": forms.Select(attrs={"class": SELECT}),
            "role": forms.Select(attrs={"class": SELECT}),
        }

    def __init__(self, tenant, project, *args, **kwargs):
        super().__init__(*args, **kwargs)
        existing = project.members.values_list("employee_id", flat=True)
        if project.lead_id:
            existing = list(existing) + [project.lead_id]
        self.fields["employee"].queryset = (
            Employee.objects.filter(tenant=tenant, is_active=True)
            .exclude(pk__in=existing)
            .order_by("first_name")
        )


class ProjectDocumentForm(forms.ModelForm):
    class Meta:
        model = ProjectDocument
        fields = ["title", "description", "file", "is_team_visible"]
        widgets = {
            "title": forms.TextInput(attrs={"class": INPUT}),
            "description": forms.Textarea(attrs={"class": TEXTAREA, "rows": 2}),
            "file": forms.ClearableFileInput(attrs={"class": "file-input file-input-bordered w-full"}),
            "is_team_visible": forms.CheckboxInput(attrs={"class": "checkbox checkbox-sm"}),
        }


class ProjectUpdateForm(forms.ModelForm):
    class Meta:
        model = ProjectUpdate
        fields = ["message"]
        widgets = {
            "message": forms.Textarea(attrs={"class": TEXTAREA, "rows": 3, "placeholder": "Share a progress update with the team…"}),
        }


class TimeEntryForm(forms.ModelForm):
    class Meta:
        model = TimeEntry
        fields = ["project", "entry_date", "hours", "description"]
        widgets = {
            "project": forms.Select(attrs={"class": SELECT}),
            "entry_date": forms.DateInput(attrs={"class": INPUT, "type": "date"}),
            "hours": forms.NumberInput(attrs={"class": INPUT, "step": "0.25", "min": "0.25", "max": "24"}),
            "description": forms.TextInput(attrs={"class": INPUT, "placeholder": "What did you work on?"}),
        }

    def __init__(self, employee, projects, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["project"].queryset = projects
        if projects.count() == 1:
            self.fields["project"].initial = projects.first().pk
