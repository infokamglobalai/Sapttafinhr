from django.db import models


# ---------------------------------------------------------------------------
# Letter templates & generation
# ---------------------------------------------------------------------------
class LetterTemplate(models.Model):
    LETTER_TYPES = [
        ("experience", "Experience Letter"),
        ("relieving", "Relieving Letter"),
        ("offer", "Offer Letter"),
        ("increment", "Increment Letter"),
        ("warning", "Warning Letter"),
        ("appreciation", "Appreciation Letter"),
        ("appointment", "Appointment Letter"),
        ("custom", "Custom"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="letter_templates")
    letter_type = models.CharField(max_length=30, choices=LETTER_TYPES)
    name = models.CharField(max_length=255)
    # Jinja2 template string. Available vars: employee.*, tenant.*, today, etc.
    template_html = models.TextField()
    variables = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "letter_templates"
        ordering = ["letter_type", "name"]

    def __str__(self):
        return f"{self.get_letter_type_display()} — {self.name}"


class HRLetter(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="hr_letters")
    template = models.ForeignKey(LetterTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    letter_type = models.CharField(max_length=30)
    generated_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    generated_at = models.DateTimeField(auto_now_add=True)
    pdf = models.FileField(upload_to="hr_letters/%Y/", null=True, blank=True)
    is_shared = models.BooleanField(default=False)
    shared_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "hr_letters"
        ordering = ["-generated_at"]

    def __str__(self):
        return f"{self.letter_type} — {self.employee}"


# ---------------------------------------------------------------------------
# Asset management
# ---------------------------------------------------------------------------
class Asset(models.Model):
    STATUS_CHOICES = [
        ("available", "Available"),
        ("assigned", "Assigned"),
        ("maintenance", "Under Maintenance"),
        ("disposed", "Disposed"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="assets")
    asset_code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    make = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    serial_number = models.CharField(max_length=100, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="available")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "assets"
        unique_together = ("tenant", "asset_code")
        ordering = ["name"]

    def __str__(self):
        return f"{self.asset_code} — {self.name}"


class AssetAssignment(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="assignments")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="assigned_assets")
    assigned_at = models.DateTimeField(auto_now_add=True)
    returned_at = models.DateTimeField(null=True, blank=True)
    condition_on_assign = models.CharField(max_length=20, default="good")
    condition_on_return = models.CharField(max_length=20, blank=True)
    assigned_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")

    class Meta:
        db_table = "asset_assignments"
        ordering = ["-assigned_at"]


# ---------------------------------------------------------------------------
# Onboarding
# ---------------------------------------------------------------------------
class OnboardingTemplate(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="onboarding_templates")
    name = models.CharField(max_length=255)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "onboarding_templates"

    def __str__(self):
        return self.name


class OnboardingTask(models.Model):
    RESPONSIBLE_PARTY_CHOICES = [
        ("hr", "HR"),
        ("employee", "Employee"),
        ("it", "IT"),
        ("manager", "Manager"),
        ("finance", "Finance"),
    ]

    template = models.ForeignKey(OnboardingTemplate, on_delete=models.CASCADE, related_name="tasks")
    task_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    responsible_party = models.CharField(max_length=20, choices=RESPONSIBLE_PARTY_CHOICES)
    due_days_offset = models.SmallIntegerField(default=0)  # days from date_of_joining
    is_required = models.BooleanField(default=True)
    sequence_order = models.PositiveSmallIntegerField(default=50)

    class Meta:
        db_table = "onboarding_tasks"
        ordering = ["sequence_order"]


class EmployeeOnboarding(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="onboarding")
    template = models.ForeignKey(OnboardingTemplate, on_delete=models.SET_NULL, null=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "employee_onboarding"

    def completion_percentage(self):
        total = self.items.count()
        if total == 0:
            return 0
        done = self.items.filter(status="completed").count()
        return int(done / total * 100)


class OnboardingItem(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("skipped", "Skipped"),
    ]

    onboarding = models.ForeignKey(EmployeeOnboarding, on_delete=models.CASCADE, related_name="items")
    task = models.ForeignKey(OnboardingTask, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "onboarding_items"


# ---------------------------------------------------------------------------
# Exit management
# ---------------------------------------------------------------------------
class ExitRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.OneToOneField("employees.Employee", on_delete=models.CASCADE, related_name="exit_request")
    resignation_date = models.DateField()
    last_working_date = models.DateField(null=True, blank=True)
    exit_reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    interview_scheduled = models.BooleanField(default=False)
    fnf_cleared = models.BooleanField(default=False)
    assets_returned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exit_requests"

    def __str__(self):
        return f"Exit: {self.employee} ({self.resignation_date})"


# ---------------------------------------------------------------------------
# Announcements
# ---------------------------------------------------------------------------
class Announcement(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="announcements")
    title = models.CharField(max_length=255)
    content = models.TextField()
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    is_published = models.BooleanField(default=False)

    class Meta:
        db_table = "announcements"
        ordering = ["-published_at"]

    def __str__(self):
        return self.title


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
class Notification(models.Model):
    TYPE_CHOICES = [
        ("leave_applied", "Leave Applied"),
        ("leave_approved", "Leave Approved"),
        ("leave_rejected", "Leave Rejected"),
        ("leave_cancelled", "Leave Cancelled"),
        ("payslip_published", "Payslip Published"),
        ("review_submitted", "Review Submitted"),
        ("review_acknowledged", "Review Acknowledged"),
        ("attendance_regularization_requested", "Attendance Correction Requested"),
        ("attendance_regularization_approved", "Attendance Correction Approved"),
        ("attendance_regularization_rejected", "Attendance Correction Rejected"),
        ("announcement", "Announcement"),
        ("birthday", "Birthday"),
        ("work_anniversary", "Work Anniversary"),
        ("document_expiring", "Document Expiring"),
        ("probation_ending", "Probation Ending"),
        ("general", "General"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="notifications")
    recipient = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default="general")
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    action_url = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    email_sent = models.BooleanField(default=False)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "created_at"]),
            models.Index(fields=["tenant", "created_at"]),
        ]

    def __str__(self):
        return f"{self.title} → {self.recipient.email}"

    def mark_read(self):
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])


# ---------------------------------------------------------------------------
# Audit log — who did what, when
# ---------------------------------------------------------------------------
class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("create", "Created"),
        ("update", "Updated"),
        ("delete", "Deleted"),
        ("approve", "Approved"),
        ("reject", "Rejected"),
        ("publish", "Published"),
        ("submit", "Submitted"),
        ("login", "Logged in"),
        ("logout", "Logged out"),
        ("export", "Exported"),
        ("view", "Viewed"),
        ("other", "Other"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="audit_logs")
    actor = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_actions")
    actor_name = models.CharField(max_length=255, blank=True)  # frozen name even if user deleted
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=100)  # e.g. "Employee", "LeaveRequest"
    resource_id = models.CharField(max_length=64, blank=True)
    resource_label = models.CharField(max_length=255, blank=True)  # human-readable identifier
    summary = models.CharField(max_length=500)  # one-line description
    details = models.JSONField(default=dict, blank=True)  # before/after values
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["tenant", "resource_type", "created_at"]),
            models.Index(fields=["actor", "created_at"]),
        ]

    def __str__(self):
        return f"{self.actor_name} {self.action} {self.resource_type}#{self.resource_id}"
