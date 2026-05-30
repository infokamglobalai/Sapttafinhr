import datetime
from django.db import models
from django.core.validators import MinValueValidator


class Shift(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="shifts")
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_in_minutes = models.PositiveSmallIntegerField(default=0)
    grace_out_minutes = models.PositiveSmallIntegerField(default=0)
    break_duration_minutes = models.PositiveSmallIntegerField(default=0)
    half_day_threshold_minutes = models.PositiveSmallIntegerField(default=240)
    full_day_threshold_minutes = models.PositiveSmallIntegerField(default=360)
    is_night_shift = models.BooleanField(default=False)
    overtime_applicable = models.BooleanField(default=True)
    overtime_after_minutes = models.PositiveSmallIntegerField(default=480)
    # Comma-separated day names: "saturday,sunday"
    weekly_off_days = models.CharField(max_length=100, default="saturday,sunday")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "shifts"
        unique_together = ("tenant", "name")

    def __str__(self):
        return f"{self.name} ({self.start_time}–{self.end_time})"

    def get_weekly_off_list(self):
        return [d.strip().lower() for d in self.weekly_off_days.split(",") if d.strip()]

    def is_week_off(self, date: datetime.date) -> bool:
        day_name = date.strftime("%A").lower()
        return day_name in self.get_weekly_off_list()


class EmployeeShiftAssignment(models.Model):
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="shift_assignments"
    )
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE)
    effective_date = models.DateField()
    assigned_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_shift_assignments"
        ordering = ["-effective_date"]
        indexes = [models.Index(fields=["employee", "effective_date"])]


class AttendanceLog(models.Model):
    """Raw, immutable punch records — one row per tap."""
    LOG_TYPE_CHOICES = [("check_in", "Check In"), ("check_out", "Check Out")]
    SOURCE_CHOICES = [
        ("mobile", "Mobile App"),
        ("web", "Web"),
        ("biometric", "Biometric"),
        ("manual", "Manual"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="attendance_logs")
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="punch_logs"
    )
    log_time = models.DateTimeField()
    log_type = models.CharField(max_length=20, choices=LOG_TYPE_CHOICES)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="mobile")
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    accuracy_meters = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    location = models.ForeignKey(
        "employees.OfficeLocation", on_delete=models.SET_NULL, null=True, blank=True
    )
    is_within_fence = models.BooleanField(null=True)
    device_info = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attendance_logs"
        indexes = [
            models.Index(fields=["employee", "log_time"]),
            models.Index(fields=["tenant", "log_time"]),
        ]

    def __str__(self):
        return f"{self.employee} {self.log_type} @ {self.log_time}"


class AttendanceRecord(models.Model):
    """Processed daily attendance — one row per employee per day."""
    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent", "Absent"),
        ("half_day", "Half Day"),
        ("on_leave", "On Leave"),
        ("holiday", "Holiday"),
        ("week_off", "Week Off"),
        ("on_duty", "On Duty"),
        ("wfh", "Work From Home"),
        ("lop", "Loss of Pay"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="attendance_records")
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="attendance_records"
    )
    attendance_date = models.DateField()
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True)
    first_in_time = models.DateTimeField(null=True, blank=True)
    last_out_time = models.DateTimeField(null=True, blank=True)
    total_working_minutes = models.PositiveSmallIntegerField(default=0)
    break_minutes = models.PositiveSmallIntegerField(default=0)
    net_working_minutes = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    overtime_minutes = models.PositiveSmallIntegerField(default=0)
    late_by_minutes = models.PositiveSmallIntegerField(default=0)
    is_regularized = models.BooleanField(default=False)
    regularization_reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "attendance_records"
        unique_together = ("tenant", "employee", "attendance_date")
        indexes = [
            models.Index(fields=["tenant", "attendance_date"]),
            models.Index(fields=["employee", "attendance_date"]),
        ]

    def __str__(self):
        return f"{self.employee} | {self.attendance_date} | {self.status}"

    @property
    def net_working_hours(self):
        return round(self.net_working_minutes / 60, 2)


class AttendanceRegularization(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="regularizations")
    attendance_date = models.DateField()
    requested_in_time = models.TimeField(null=True, blank=True)
    requested_out_time = models.TimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    requested_at = models.DateTimeField(auto_now_add=True)
    actioned_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    actioned_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        db_table = "attendance_regularizations"

    def __str__(self):
        return f"Regularization: {self.employee} {self.attendance_date}"


class MonthlyAttendanceSummary(models.Model):
    """Pre-computed monthly roll-up — refreshed by Celery at month end and on demand."""

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="monthly_summaries")
    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()
    total_working_days = models.PositiveSmallIntegerField(default=0)
    present_days = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    absent_days = models.PositiveSmallIntegerField(default=0)
    half_days = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    on_leave_days = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    holiday_days = models.PositiveSmallIntegerField(default=0)
    week_off_days = models.PositiveSmallIntegerField(default=0)
    lop_days = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    late_arrivals = models.PositiveSmallIntegerField(default=0)
    computed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "monthly_attendance_summary"
        unique_together = ("tenant", "employee", "year", "month")
