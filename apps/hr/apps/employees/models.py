from django.db import models
from django.utils.functional import cached_property
from simple_history.models import HistoricalRecords

from utils.encryption import encrypt, decrypt


# ---------------------------------------------------------------------------
# Org structure
# ---------------------------------------------------------------------------
class Department(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="departments")
    name = models.CharField(max_length=255)
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children")
    cost_center_code = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "departments"
        unique_together = ("tenant", "name")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Designation(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="designations")
    name = models.CharField(max_length=255)
    level = models.PositiveSmallIntegerField(null=True, blank=True)
    grade = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "designations"
        unique_together = ("tenant", "name")
        ordering = ["level", "name"]

    def __str__(self):
        return self.name


class OfficeLocation(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="locations")
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state_code = models.CharField(max_length=10, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    geo_fence_radius_m = models.PositiveIntegerField(default=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "office_locations"
        ordering = ["name"]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------
class Employee(models.Model):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("prefer_not_to_say", "Prefer not to say"),
    ]
    EMPLOYMENT_TYPE_CHOICES = [
        ("full_time", "Full Time"),
        ("part_time", "Part Time"),
        ("contract", "Contract"),
        ("intern", "Intern"),
    ]
    EMPLOYMENT_STATUS_CHOICES = [
        ("active", "Active"),
        ("notice_period", "Notice Period"),
        ("exited", "Exited"),
        ("terminated", "Terminated"),
    ]
    EXIT_TYPE_CHOICES = [
        ("resignation", "Resignation"),
        ("termination", "Termination"),
        ("retirement", "Retirement"),
        ("absconding", "Absconding"),
        ("end_of_contract", "End of Contract"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="employees")
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
    )
    employee_code = models.CharField(max_length=50)

    # Personal info
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=255, blank=True, help_text="Arabic name for GCC payslips")
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)
    personal_email = models.EmailField(blank=True)
    official_email = models.EmailField(blank=True)
    phone_primary = models.CharField(max_length=15, blank=True)
    phone_alternate = models.CharField(max_length=15, blank=True)
    profile_photo = models.ImageField(upload_to="profile_photos/%Y/", null=True, blank=True)
    preferred_name = models.CharField(
        max_length=80,
        blank=True,
        help_text="Nickname or display name shown across the company directory (optional).",
    )

    # Encrypted PII — stored as Fernet tokens
    _aadhaar_enc = models.TextField(db_column="aadhaar_number_enc", blank=True)
    _pan_enc = models.TextField(db_column="pan_number_enc", blank=True)

    # Statutory identifiers (UAN = 12-digit PF number, ESI = 10-digit insurance number)
    uan_number = models.CharField(max_length=12, blank=True)
    esi_number = models.CharField(max_length=10, blank=True)

    # GCC / Kuwait compliance (P1)
    nationality = models.CharField(max_length=2, blank=True, help_text="ISO country code")
    is_kuwaiti_national = models.BooleanField(default=False)
    _civil_id_enc = models.TextField(db_column="civil_id_enc", blank=True)
    residency_number = models.CharField(max_length=50, blank=True)
    residency_expiry = models.DateField(null=True, blank=True)
    passport_number = models.CharField(max_length=50, blank=True)
    passport_expiry = models.DateField(null=True, blank=True)
    work_permit_number = models.CharField(max_length=50, blank=True)
    work_permit_expiry = models.DateField(null=True, blank=True)
    civil_id_expiry = models.DateField(null=True, blank=True)
    sponsor_file_number = models.CharField(max_length=50, blank=True)
    CONTRACT_TYPE_CHOICES = [
        ("limited", "Limited"),
        ("unlimited", "Unlimited"),
    ]
    contract_type = models.CharField(max_length=20, choices=CONTRACT_TYPE_CHOICES, blank=True)
    contract_end_date = models.DateField(null=True, blank=True)
    pifss_number = models.CharField(max_length=50, blank=True)

    # Org
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    designation = models.ForeignKey(Designation, on_delete=models.SET_NULL, null=True, blank=True)
    reporting_manager = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="direct_reports"
    )
    location = models.ForeignKey(OfficeLocation, on_delete=models.SET_NULL, null=True, blank=True)
    work_state_code = models.CharField(max_length=10, blank=True)

    # Employment
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default="full_time")
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS_CHOICES, default="active")
    date_of_joining = models.DateField()
    date_of_confirmation = models.DateField(null=True, blank=True)
    probation_end_date = models.DateField(null=True, blank=True)
    date_of_exit = models.DateField(null=True, blank=True)
    exit_type = models.CharField(max_length=30, choices=EXIT_TYPE_CHOICES, blank=True)
    exit_reason = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        db_table = "employees"
        unique_together = ("tenant", "employee_code")
        indexes = [
            models.Index(fields=["tenant", "employment_status"]),
            models.Index(fields=["tenant", "department"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.employee_code})"

    @cached_property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join(p for p in parts if p)

    @property
    def directory_name(self) -> str:
        """Name shown in directory, cards, and search results."""
        nick = (self.preferred_name or "").strip()
        return nick or self.full_name

    @property
    def uses_preferred_name(self) -> bool:
        nick = (self.preferred_name or "").strip()
        return bool(nick) and nick.lower() != self.full_name.lower()

    # Encrypted field accessors
    @property
    def aadhaar_number(self):
        return decrypt(self._aadhaar_enc)

    @aadhaar_number.setter
    def aadhaar_number(self, value):
        self._aadhaar_enc = encrypt(value) if value else ""

    @property
    def pan_number(self):
        return decrypt(self._pan_enc)

    @pan_number.setter
    def pan_number(self, value):
        self._pan_enc = encrypt(value) if value else ""

    @property
    def civil_id(self):
        return decrypt(self._civil_id_enc)

    @civil_id.setter
    def civil_id(self, value):
        self._civil_id_enc = encrypt(value) if value else ""

    def get_current_salary(self):
        return self.salaries.filter(is_active=True).order_by("-effective_date").first()


class EmployeeAddress(models.Model):
    ADDRESS_TYPES = [("current", "Current"), ("permanent", "Permanent")]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="addresses")
    address_type = models.CharField(max_length=20, choices=ADDRESS_TYPES)
    line1 = models.TextField()
    line2 = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state_code = models.CharField(max_length=10, blank=True)
    country = models.CharField(max_length=2, default="IN")
    pincode = models.CharField(max_length=10, blank=True)

    class Meta:
        db_table = "employee_addresses"
        unique_together = ("employee", "address_type")


class EmployeeEmergencyContact(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="emergency_contacts")
    name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=15)
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = "employee_emergency_contacts"


class EmployeeBankAccount(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="bank_accounts")
    account_holder_name = models.CharField(max_length=255)
    bank_name = models.CharField(max_length=255)
    branch_name = models.CharField(max_length=255, blank=True)
    _account_number_enc = models.TextField(db_column="account_number_enc")
    ifsc_code = models.CharField(max_length=11)
    account_type = models.CharField(max_length=20, default="savings")
    is_primary = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_bank_accounts"

    @property
    def account_number(self):
        return decrypt(self._account_number_enc)

    @account_number.setter
    def account_number(self, value):
        self._account_number_enc = encrypt(value) if value else ""

    @property
    def masked_account_number(self):
        from utils.encryption import mask
        return mask(self.account_number)


class EmployeeDocument(models.Model):
    DOC_TYPES = [
        ("aadhaar", "Aadhaar Card"),
        ("pan", "PAN Card"),
        ("passport", "Passport"),
        ("civil_id", "Civil ID"),
        ("residency", "Residency / Iqama"),
        ("work_permit", "Work Permit"),
        ("degree", "Degree Certificate"),
        ("offer_letter", "Offer Letter"),
        ("appointment", "Appointment Letter"),
        ("promotion", "Promotion Letter"),
        ("increment", "Increment Letter"),
        ("confirmation", "Confirmation Letter"),
        ("termination", "Termination Letter"),
        ("internship", "Internship Letter"),
        ("warning", "Warning Letter"),
        ("relieving", "Relieving Letter"),
        ("experience", "Experience Letter"),
        ("intent_letter", "Letter of Intent"),
        ("noc", "No Objection Certificate"),
        ("certificate", "Certificate"),
        ("other", "Other"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=50, choices=DOC_TYPES)
    document_name = models.CharField(max_length=255)
    file = models.FileField(upload_to="employee_docs/%Y/%m/")
    file_size_bytes = models.PositiveIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, related_name="+"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        db_table = "employee_documents"
        indexes = [models.Index(fields=["employee", "document_type"])]


class AttritionScore(models.Model):
    """
    Nightly-computed flight-risk score per employee. Pure heuristic over
    attendance, leave, review, tenure and salary-change signals.
    NO machine-learning training, NO external API.
    """
    RISK_LOW = "low"
    RISK_MEDIUM = "medium"
    RISK_HIGH = "high"
    RISK_CHOICES = [(RISK_LOW, "Low"), (RISK_MEDIUM, "Medium"), (RISK_HIGH, "High")]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="attrition_scores")
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name="attrition_score")
    score = models.PositiveSmallIntegerField(default=0, help_text="0 (no risk) - 100 (very high)")
    risk_band = models.CharField(max_length=10, choices=RISK_CHOICES, default=RISK_LOW)
    # JSON list of {label, weight, value, contribution} explaining the score
    factors = models.JSONField(default=list)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "attrition_scores"
        ordering = ["-score"]
        indexes = [
            models.Index(fields=["tenant", "-score"]),
            models.Index(fields=["tenant", "risk_band"]),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.score} ({self.risk_band})"
