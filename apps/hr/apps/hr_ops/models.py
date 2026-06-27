from django.db import models


# ---------------------------------------------------------------------------
# Letter templates & generation
# ---------------------------------------------------------------------------
class LetterTemplate(models.Model):
    LETTER_TYPES = [
        ("offer", "Offer Letter"),
        ("intent", "Letter of Intent (LOI)"),
        ("appointment", "Appointment Letter"),
        ("experience", "Experience Letter"),
        ("relieving", "Relieving Letter"),
        ("promotion", "Promotion Letter"),
        ("increment", "Salary Increment Letter"),
        ("warning", "Warning Letter"),
        ("confirmation", "Confirmation Letter"),
        ("termination", "Termination Letter"),
        ("internship", "Internship Letter"),
        ("appreciation", "Appreciation Letter"),
        ("noc", "No Objection Certificate (NOC)"),
        ("certificate", "Certificate"),
        ("custom", "Custom"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="letter_templates")
    letter_type = models.CharField(max_length=30, choices=LETTER_TYPES)
    name = models.CharField(max_length=255)
    # Jinja2 template string. Available vars: employee.*, tenant.*, today, etc.
    template_html = models.TextField()
    variables = models.JSONField(default=list, blank=True)
    requires_approval = models.BooleanField(
        default=False,
        help_text="When enabled, letters must be approved before PDF is issued.",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "letter_templates"
        ordering = ["letter_type", "name"]

    def __str__(self):
        return f"{self.get_letter_type_display()} — {self.name}"


class CompanyLetterBranding(models.Model):
    """Per-tenant letterhead assets — logo, signature, stamp, footer."""
    tenant = models.OneToOneField(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="letter_branding"
    )
    logo = models.ImageField(upload_to="letter_branding/%Y/", null=True, blank=True)
    signature_image = models.ImageField(upload_to="letter_branding/%Y/", null=True, blank=True)
    stamp_image = models.ImageField(upload_to="letter_branding/%Y/", null=True, blank=True)
    footer_html = models.TextField(
        blank=True,
        help_text="Optional footer text/HTML shown at the bottom of every letter.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "company_letter_branding"

    def __str__(self):
        return f"Letter branding — {self.tenant.name}"


class CompanyLetterSignatory(models.Model):
    """Authorized signatories on HR letters — supports multiple signatures per PDF."""
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="letter_signatories"
    )
    name = models.CharField(max_length=255)
    title = models.CharField(max_length=255, blank=True)
    signature_image = models.ImageField(
        upload_to="letter_signatures/%Y/", null=True, blank=True,
        help_text="PNG scan of signature (transparent background works best).",
    )
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "company_letter_signatories"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.name} ({self.title or 'Signatory'})"


class HRLetter(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending_approval", "Pending Approval"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("issued", "Issued"),
        ("superseded", "Superseded"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="hr_letters")
    template = models.ForeignKey(LetterTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    letter_type = models.CharField(max_length=30)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="draft")
    reference_number = models.CharField(max_length=64, blank=True)
    version = models.PositiveIntegerField(default=1)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="revisions"
    )
    draft_html = models.TextField(blank=True)
    extra_context = models.JSONField(default=dict, blank=True)
    generated_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    pdf = models.FileField(upload_to="hr_letters/%Y/", null=True, blank=True)
    employee_document = models.ForeignKey(
        "employees.EmployeeDocument",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_letters",
    )
    is_shared = models.BooleanField(default=False)
    shared_at = models.DateTimeField(null=True, blank=True)
    emailed_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    job_application = models.ForeignKey(
        "recruitment.JobApplication",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_offer_letters",
        help_text="Recruitment application this offer letter was created from (P5).",
    )

    class Meta:
        db_table = "hr_letters"
        ordering = ["-generated_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "letter_type"]),
            models.Index(fields=["tenant", "employee", "letter_type", "status"]),
            models.Index(fields=["tenant", "job_application", "letter_type"]),
        ]

    def __str__(self):
        return f"{self.letter_type} v{self.version} — {self.employee}"

    @property
    def is_editable(self) -> bool:
        return self.status in ("draft", "rejected")

    @property
    def is_issued(self) -> bool:
        return self.status == "issued"

    def type_label(self) -> str:
        return dict(LetterTemplate.LETTER_TYPES).get(self.letter_type, self.letter_type.replace("_", " ").title())

    @property
    def type_display(self) -> str:
        return self.type_label()


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
    settlement_amount = models.DecimalField(max_digits=14, decimal_places=3, null=True, blank=True)
    settlement_label = models.CharField(max_length=64, blank=True)
    settlement_note = models.TextField(blank=True)
    settlement_computed_at = models.DateTimeField(null=True, blank=True)
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
# HR policy documents (for AI policy bot)
# ---------------------------------------------------------------------------
class PolicyDocument(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="policy_documents")
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True, help_text="Plain text or markdown — auto-filled when you upload PDF/DOCX")
    category = models.CharField(max_length=100, blank=True)
    attachment = models.FileField(
        upload_to="policies/%Y/",
        null=True,
        blank=True,
        help_text="PDF, DOCX, or other policy document",
    )
    is_active = models.BooleanField(default=True)
    version_number = models.PositiveIntegerField(default=1)
    last_distributed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "policy_documents"
        ordering = ["title"]

    def __str__(self):
        return self.title

    @property
    def has_attachment(self):
        return bool(self.attachment)

    @property
    def version_label(self):
        return f"v{self.version_number}"


class PolicyVersion(models.Model):
    """Historical snapshot when policy content is revised."""
    policy = models.ForeignKey(PolicyDocument, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    attachment = models.FileField(upload_to="policies/versions/%Y/", null=True, blank=True)
    change_notes = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "policy_versions"
        ordering = ["-version_number"]
        unique_together = ("policy", "version_number")

    def __str__(self):
        return f"{self.policy.title} v{self.version_number}"


class PolicyDistribution(models.Model):
    AUDIENCE_CHOICES = [
        ("company", "Entire company"),
        ("departments", "Selected departments"),
        ("employees", "Selected employees"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="policy_distributions")
    policy = models.ForeignKey(PolicyDocument, on_delete=models.CASCADE, related_name="distributions")
    version_number = models.PositiveIntegerField(default=1)
    requires_acknowledgment = models.BooleanField(default=True)
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default="company")
    distributed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    distributed_at = models.DateTimeField(auto_now_add=True)
    recipient_count = models.PositiveIntegerField(default=0)
    departments = models.ManyToManyField("employees.Department", blank=True, related_name="+")
    employees = models.ManyToManyField("employees.Employee", blank=True, related_name="+")

    class Meta:
        db_table = "policy_distributions"
        ordering = ["-distributed_at"]


class PolicyRecipient(models.Model):
    distribution = models.ForeignKey(PolicyDistribution, on_delete=models.CASCADE, related_name="recipients")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="policy_receipts")
    read_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    last_reminded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "policy_recipients"
        unique_together = ("distribution", "user")

    @property
    def is_acknowledged(self):
        return bool(self.acknowledged_at)

    @property
    def status(self):
        if self.acknowledged_at:
            return "acknowledged"
        if self.read_at:
            return "read"
        return "pending"


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
        ("policy_published", "Policy Published"),
        ("birthday", "Birthday"),
        ("work_anniversary", "Work Anniversary"),
        ("document_expiring", "Document Expiring"),
        ("probation_ending", "Probation Ending"),
        ("calendar_reminder", "Calendar Reminder"),
        ("celebration", "Celebration"),
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
# Company calendar — meetings, reminders, notes on specific dates
# ---------------------------------------------------------------------------
class CompanyCalendarEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ("meeting", "Meeting"),
        ("reminder", "Reminder"),
        ("task", "Task"),
        ("other", "Other"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="calendar_events")
    title = models.CharField(max_length=255)
    event_date = models.DateField()
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES, default="reminder")
    notify_on_day = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="calendar_events_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "company_calendar_events"
        ordering = ["event_date", "title"]
        indexes = [
            models.Index(fields=["tenant", "event_date"], name="company_cal_tenant__a1b2c3_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.event_date})"


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
        ("issue", "Issued"),
        ("download", "Downloaded"),
        ("email", "Emailed"),
        ("duplicate", "Duplicated"),
        ("regenerate", "Regenerated"),
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


# ---------------------------------------------------------------------------
# Employee service requests (IT / procurement / HR helpdesk)
# ---------------------------------------------------------------------------
class ServiceRequest(models.Model):
    CATEGORY_CHOICES = [
        ("it_issue", "IT / Laptop issue"),
        ("hardware", "Hardware request"),
        ("software", "Software / Subscription / API key"),
        ("hr_other", "HR / Other"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("normal", "Normal"),
        ("urgent", "Urgent"),
    ]
    STATUS_CHOICES = [
        ("pending_manager", "Pending manager approval"),
        ("pending_it", "Pending IT / Procurement"),
        ("in_progress", "In progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
        ("rejected", "Rejected"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="service_requests")
    request_no = models.CharField(max_length=20)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="service_requests")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending_it")
    asset = models.ForeignKey(Asset, on_delete=models.SET_NULL, null=True, blank=True, related_name="service_requests")
    attachment = models.FileField(upload_to="service_requests/%Y/", null=True, blank=True)

    manager = models.ForeignKey(
        "employees.Employee", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    manager_actioned_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    manager_actioned_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    assigned_to = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_service_requests"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "service_requests"
        unique_together = ("tenant", "request_no")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "created_at"], name="service_req_tenant__a1b2c3_idx"),
            models.Index(fields=["employee", "created_at"], name="service_req_employe_d4e5f6_idx"),
        ]

    def __str__(self):
        return f"{self.request_no} — {self.subject}"


class ServiceRequestComment(models.Model):
    request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    body = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "service_request_comments"
        ordering = ["created_at"]


# ---------------------------------------------------------------------------
# Celebrations & wishes (birthday wall, anniversaries, team moments)
# ---------------------------------------------------------------------------
class CelebrationPost(models.Model):
    CELEBRATION_TYPES = [
        ("birthday", "Birthday"),
        ("work_anniversary", "Work Anniversary"),
        ("new_joiner", "Welcome / New Joiner"),
        ("promotion", "Promotion"),
        ("wedding", "Wedding"),
        ("new_baby", "New Baby"),
        ("festival", "Festival / Holiday"),
        ("achievement", "Achievement"),
        ("farewell", "Farewell"),
        ("custom", "Custom"),
    ]

    TYPE_EMOJI = {
        "birthday": "🎂",
        "work_anniversary": "🎉",
        "new_joiner": "👋",
        "promotion": "🚀",
        "wedding": "💍",
        "new_baby": "👶",
        "festival": "🪔",
        "achievement": "🏆",
        "farewell": "👋",
        "custom": "✨",
    }

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="celebration_posts")
    celebration_type = models.CharField(max_length=30, choices=CELEBRATION_TYPES, default="birthday")
    subject_employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="celebration_posts",
        null=True,
        blank=True,
        help_text="Person being celebrated (optional for company-wide festivals).",
    )
    title = models.CharField(max_length=255, blank=True)
    message = models.TextField(help_text="Main wish or announcement from HR / manager.")
    poster_image = models.ImageField(upload_to="celebrations/%Y/", null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    is_published = models.BooleanField(default=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "celebration_posts"
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.display_title

    @property
    def type_emoji(self) -> str:
        return self.TYPE_EMOJI.get(self.celebration_type, "✨")

    @property
    def display_title(self) -> str:
        if self.title.strip():
            return self.title.strip()
        label = dict(self.CELEBRATION_TYPES).get(self.celebration_type, "Celebration")
        if self.subject_employee:
            return f"{self.type_emoji} {label} — {self.subject_employee.full_name}"
        return f"{self.type_emoji} {label}"

    @property
    def wish_count(self) -> int:
        return self.wishes.count()


class CelebrationWish(models.Model):
    post = models.ForeignKey(CelebrationPost, on_delete=models.CASCADE, related_name="wishes")
    author = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="celebration_wishes")
    message = models.TextField(blank=True)
    emoji = models.CharField(max_length=16, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "celebration_wishes"
        ordering = ["created_at"]
        unique_together = ("post", "author")

    def __str__(self):
        return f"Wish by {self.author} on {self.post_id}"

    @property
    def display_line(self) -> str:
        parts = []
        if self.emoji:
            parts.append(self.emoji)
        if self.message.strip():
            parts.append(self.message.strip())
        return " ".join(parts) or self.emoji or "🎉"


# ---------------------------------------------------------------------------
# Company legal document vault (owner / HR — not open to all employees)
# ---------------------------------------------------------------------------
class CompanyDocument(models.Model):
    DOC_TYPES = [
        ("incorporation", "Certificate of Incorporation"),
        ("pan", "Company PAN"),
        ("gst", "GST Registration"),
        ("moa_aoa", "MOA / AOA"),
        ("bank_kyc", "Bank KYC / Account"),
        ("trade_license", "Trade / Business License"),
        ("insurance", "Insurance Policy"),
        ("other", "Other"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="company_documents")
    doc_type = models.CharField(max_length=30, choices=DOC_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to="company_vault/%Y/")
    file_size_bytes = models.PositiveIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    expiry_date = models.DateField(null=True, blank=True, help_text="Renewal reminder for licenses, etc.")
    is_active = models.BooleanField(default=True)
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "company_documents"
        ordering = ["doc_type", "title"]
        indexes = [
            models.Index(fields=["tenant", "doc_type", "is_active"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_doc_type_display()})"


class CompanyDocumentAccessRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending review"),
        ("approved", "Approved"),
        ("denied", "Denied"),
        ("expired", "Access expired"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="company_doc_requests")
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="company_doc_requests"
    )
    doc_type = models.CharField(max_length=30, choices=CompanyDocument.DOC_TYPES)
    purpose = models.TextField(help_text="Why the employee needs this document")
    document = models.ForeignKey(
        CompanyDocument,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="access_requests",
        help_text="Vault file granted on approval",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    access_expires_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    denial_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "company_document_access_requests"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "created_at"]),
            models.Index(fields=["employee", "status"]),
        ]

    def __str__(self):
        return f"{self.employee} — {self.get_doc_type_display()} ({self.status})"

    @property
    def is_access_valid(self) -> bool:
        from django.utils import timezone

        if self.status != "approved" or not self.document_id:
            return False
        if self.access_expires_at and timezone.now() > self.access_expires_at:
            return False
        return True
