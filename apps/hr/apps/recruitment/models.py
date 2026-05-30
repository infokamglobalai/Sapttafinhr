"""
Recruitment module — schema only (v2 implementation).
Models are defined now so the DB schema is complete from day one.
"""
from django.db import models


class JobOpening(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"), ("published", "Published"),
        ("closed", "Closed"), ("on_hold", "On Hold"),
    ]
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    department = models.ForeignKey("employees.Department", on_delete=models.SET_NULL, null=True, blank=True)
    designation = models.ForeignKey("employees.Designation", on_delete=models.SET_NULL, null=True, blank=True)
    location = models.ForeignKey("employees.OfficeLocation", on_delete=models.SET_NULL, null=True, blank=True)
    employment_type = models.CharField(max_length=20, default="full_time")
    positions_count = models.PositiveSmallIntegerField(default=1)
    experience_min = models.PositiveSmallIntegerField(default=0)
    experience_max = models.PositiveSmallIntegerField(null=True, blank=True)
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    published_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "job_openings"

    def __str__(self):
        return self.title


class Candidate(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15, blank=True)
    current_company = models.CharField(max_length=255, blank=True)
    current_designation = models.CharField(max_length=255, blank=True)
    current_ctc = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expected_ctc = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_experience = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    resume = models.FileField(upload_to="resumes/%Y/", null=True, blank=True)
    source = models.CharField(max_length=30, default="direct")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "candidates"


class JobApplication(models.Model):
    STATUS_CHOICES = [
        ("applied", "Applied"), ("screening", "Screening"),
        ("interview", "Interview"), ("offer", "Offer"),
        ("hired", "Hired"), ("rejected", "Rejected"), ("withdrawn", "Withdrawn"),
    ]
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    job_opening = models.ForeignKey(JobOpening, on_delete=models.CASCADE, related_name="applications")
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="applications")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="applied")
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "job_applications"
