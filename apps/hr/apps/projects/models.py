from django.db import models


class Project(models.Model):
    STATUS_CHOICES = [
        ("planning", "Planning"),
        ("active", "Active"),
        ("on_hold", "On Hold"),
        ("completed", "Completed"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="projects")
    code = models.CharField(max_length=40)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    department = models.ForeignKey(
        "employees.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="projects"
    )
    lead = models.ForeignKey(
        "employees.Employee", on_delete=models.SET_NULL, null=True, blank=True, related_name="led_projects"
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "projects"
        unique_together = ("tenant", "code")
        ordering = ["-updated_at", "name"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class ProjectMember(models.Model):
    ROLE_CHOICES = [
        ("lead", "Lead"),
        ("member", "Member"),
        ("viewer", "Viewer"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="members")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_members"
        unique_together = ("project", "employee")
        ordering = ["role", "employee__first_name"]

    def __str__(self):
        return f"{self.employee} on {self.project.code}"


class ProjectDocument(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to="project_docs/%Y/")
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_team_visible = models.BooleanField(default=True)

    class Meta:
        db_table = "project_documents"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.title


class ProjectUpdate(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="updates")
    author = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_updates"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Update on {self.project.code}"


class TimeEntry(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="time_entries")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="time_entries")
    entry_date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_time_entries"
        unique_together = ("project", "employee", "entry_date")
        ordering = ["-entry_date"]

    def __str__(self):
        return f"{self.hours}h on {self.entry_date}"
