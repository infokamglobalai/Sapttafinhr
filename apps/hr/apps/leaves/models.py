from django.db import models
from django.core.validators import MinValueValidator


class LeaveType(models.Model):
    ACCRUAL_CHOICES = [
        ("upfront", "Upfront (full year at start)"),
        ("monthly", "Monthly accrual"),
        ("yearly", "Yearly accrual"),
        ("manual", "Manual credit only"),
    ]
    GENDER_CHOICES = [("all", "All"), ("male", "Male Only"), ("female", "Female Only")]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="leave_types")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)  # CL, EL, SL, ML
    is_paid = models.BooleanField(default=True)
    accrual_type = models.CharField(max_length=20, choices=ACCRUAL_CHOICES, default="upfront")
    accrual_value = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    max_annual_balance = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    max_carry_forward = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    min_notice_days = models.PositiveSmallIntegerField(default=0)
    max_consecutive_days = models.PositiveSmallIntegerField(null=True, blank=True)
    requires_document_after = models.PositiveSmallIntegerField(null=True, blank=True)
    applicable_gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default="all")
    applicable_after_months = models.PositiveSmallIntegerField(default=0)
    allow_half_day = models.BooleanField(default=True)
    include_holidays = models.BooleanField(default=False)
    include_weekends = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "leave_types"
        unique_together = ("tenant", "code")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class HolidayCalendar(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="holiday_calendars")
    name = models.CharField(max_length=255)
    year = models.PositiveSmallIntegerField()
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "holiday_calendars"
        unique_together = ("tenant", "year", "name")

    def __str__(self):
        return f"{self.name} {self.year}"


class Holiday(models.Model):
    HOLIDAY_TYPES = [
        ("national", "National"),
        ("regional", "Regional"),
        ("optional", "Optional"),
        ("restricted", "Restricted"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    calendar = models.ForeignKey(HolidayCalendar, on_delete=models.CASCADE, related_name="holidays")
    name = models.CharField(max_length=255)
    holiday_date = models.DateField()
    holiday_type = models.CharField(max_length=20, choices=HOLIDAY_TYPES, default="national")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "holidays"
        indexes = [models.Index(fields=["calendar", "holiday_date"])]

    def __str__(self):
        return f"{self.name} ({self.holiday_date})"


class LeaveBalance(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="leave_balances")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year = models.PositiveSmallIntegerField()
    opening_balance = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    credited = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    taken = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    adjusted = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    carry_forward = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leave_balances"
        unique_together = ("tenant", "employee", "leave_type", "year")
        indexes = [models.Index(fields=["employee", "year"])]

    def __str__(self):
        return f"{self.employee} | {self.leave_type.code} | {self.year}"

    @property
    def closing_balance(self):
        return self.opening_balance + self.credited - self.taken + self.adjusted

    @property
    def available(self):
        return max(self.closing_balance, 0)


class LeaveRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
        ("withdrawn", "Withdrawn"),
    ]
    HALF_DAY_CHOICES = [
        ("", "Full Day"),
        ("first_half", "First Half"),
        ("second_half", "Second Half"),
    ]
    APPROVAL_STAGE_CHOICES = [
        ("manager", "Manager"),
        ("hr", "HR"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="leave_requests")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    from_date = models.DateField()
    to_date = models.DateField()
    total_days = models.DecimalField(max_digits=4, decimal_places=1)
    half_day_type = models.CharField(max_length=15, choices=HALF_DAY_CHOICES, blank=True)
    reason = models.TextField(blank=True)
    document = models.FileField(upload_to="leave_docs/%Y/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    approval_stage = models.CharField(max_length=20, choices=APPROVAL_STAGE_CHOICES, default="manager")
    applied_at = models.DateTimeField(auto_now_add=True)
    manager_approved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    manager_approved_at = models.DateTimeField(null=True, blank=True)
    actioned_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    actioned_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        db_table = "leave_requests"
        indexes = [
            models.Index(fields=["employee", "status"]),
            models.Index(fields=["tenant", "from_date"]),
        ]

    def __str__(self):
        return f"{self.employee} | {self.leave_type.code} | {self.from_date}–{self.to_date}"


class CompOffCredit(models.Model):
    """Compensatory-off earned by working on a holiday/week-off."""
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="comp_offs")
    worked_date = models.DateField()
    days_earned = models.DecimalField(max_digits=3, decimal_places=1, default=1)
    valid_until = models.DateField()
    status = models.CharField(max_length=20, default="available")  # available | used | expired
    approved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    leave_request = models.ForeignKey(
        "LeaveRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="comp_off_credits",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comp_off_credits"
