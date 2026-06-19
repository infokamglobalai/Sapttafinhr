import uuid
from django.db import models
from django.core.validators import RegexValidator


class ProductCode(models.TextChoices):
    FIN = "FIN", "Finance"
    HR = "HR", "HRMS"


class Tenant(models.Model):
    PLAN_CHOICES = [
        ("trial", "Trial"),
        ("starter", "Starter"),
        ("growth", "Growth"),
        ("enterprise", "Enterprise"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("suspended", "Suspended"),
        ("trial", "Trial"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_uid = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    name = models.CharField(max_length=255)
    subdomain = models.SlugField(max_length=100, unique=True)
    plan = models.CharField(max_length=50, choices=PLAN_CHOICES, default="trial")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="trial")

    country = models.CharField(max_length=2, default="IN")
    currency = models.CharField(max_length=3, default="INR")
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")
    payroll_jurisdiction = models.CharField(
        max_length=2,
        default="IN",
        choices=[
            ("IN", "India"),
            ("KW", "Kuwait"),
            ("AE", "United Arab Emirates"),
            ("SA", "Saudi Arabia"),
            ("BH", "Bahrain"),
            ("OM", "Oman"),
            ("QA", "Qatar"),
        ],
    )
    UI_LANGUAGE_CHOICES = [("en", "English"), ("ar", "Arabic")]
    ui_language = models.CharField(max_length=5, choices=UI_LANGUAGE_CHOICES, default="en")

    logo_url = models.TextField(blank=True)
    company_logo = models.ImageField(upload_to="tenant_logos/%Y/", null=True, blank=True)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    tan = models.CharField(max_length=10, blank=True)  # TDS deduction account number
    cin = models.CharField(max_length=21, blank=True)

    # First-run setup gate: HR shows the setup wizard until the admin completes
    # it (company info, departments, leave types, holidays, first employees…).
    setup_complete = models.BooleanField(default=False)

    # Denormalized for quick billing/limit checks
    employee_count = models.PositiveIntegerField(default=0)
    max_employees = models.PositiveIntegerField(default=30)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenants"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.subdomain})"

    @property
    def is_active(self):
        return self.status in ("active", "trial")

    @property
    def is_india_payroll(self) -> bool:
        from .jurisdiction import is_india_payroll
        return is_india_payroll(self.payroll_jurisdiction)

    @property
    def is_gcc_payroll(self) -> bool:
        from .jurisdiction import is_gcc_payroll
        return is_gcc_payroll(self.payroll_jurisdiction)

    @property
    def jurisdiction_label(self) -> str:
        from .jurisdiction import jurisdiction_label
        return jurisdiction_label(self.payroll_jurisdiction)

    def has_product_access(self, product_code: str) -> bool:
        if not self.is_active:
            return False

        entitlements = getattr(self, "_prefetched_objects_cache", {}).get("product_entitlements")
        if entitlements is not None:
            matches = [item for item in entitlements if item.product == product_code]
            if matches:
                return any(item.is_active for item in matches)
            return False

        qs = self.product_entitlements.filter(product=product_code)
        if qs.exists():
            return qs.filter(status__in=ProductEntitlement.ACTIVE_STATUSES).exists()

        # Legacy safety: existing HR tenants created before entitlements keep HR access.
        return product_code == ProductCode.HR


class TenantSetting(models.Model):
    """Key-value store for tenant-specific configuration."""

    # Keys used in the system
    WORK_WEEK_DAYS = "work_week_days"           # e.g. "monday,tuesday,wednesday,thursday,friday"
    FINANCIAL_YEAR_START = "financial_year_start_month"  # e.g. "4" (April)
    PAYROLL_PROCESSING_DAY = "payroll_processing_day"    # e.g. "1" (1st of month)
    ATTENDANCE_AUTO_ABSENT_HOUR = "attendance_auto_absent_hour"  # e.g. "23" (11pm)
    LEAVE_APPROVAL_LEVELS = "leave_approval_levels"      # e.g. "2"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="settings")
    key = models.CharField(max_length=100)
    value = models.TextField(blank=True)

    class Meta:
        db_table = "tenant_settings"
        unique_together = ("tenant", "key")

    def __str__(self):
        return f"{self.tenant.subdomain} | {self.key}"

    @classmethod
    def get(cls, tenant, key, default=""):
        try:
            return cls.objects.get(tenant=tenant, key=key).value
        except cls.DoesNotExist:
            return default

    @classmethod
    def set(cls, tenant, key, value):
        obj, _ = cls.objects.update_or_create(
            tenant=tenant, key=key, defaults={"value": str(value)}
        )
        return obj


class ProductEntitlement(models.Model):
    """Product access granted to this HR tenant by the commercial subscription."""

    class Status(models.TextChoices):
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past Due"
        SUSPENDED = "suspended", "Suspended"
        CANCELLED = "cancelled", "Cancelled"

    ACTIVE_STATUSES = (Status.TRIAL, Status.ACTIVE)

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="product_entitlements")
    product = models.CharField(max_length=10, choices=ProductCode.choices, default=ProductCode.HR)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    external_subscription_id = models.CharField(max_length=100, blank=True)
    current_period_start = models.DateField(null=True, blank=True)
    current_period_end = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_product_entitlements"
        unique_together = ("tenant", "product")

    def __str__(self):
        return f"{self.tenant.subdomain} | {self.product} | {self.status}"

    @property
    def is_active(self):
        return self.tenant.is_active and self.status in self.ACTIVE_STATUSES
