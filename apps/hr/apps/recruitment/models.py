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
    # Structured JD components (Phase 1) — feed the matching engine.
    mandatory_skills = models.JSONField(default=list, blank=True)
    preferred_skills = models.JSONField(default=list, blank=True)
    qualifications = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    keywords = models.JSONField(default=list, blank=True)
    competencies = models.JSONField(default=list, blank=True)
    embedding = models.JSONField(null=True, blank=True)  # JD vector (Phase 4)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    published_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "job_openings"

    def __str__(self):
        return self.title


class JDTemplate(models.Model):
    """Reusable job-description template (Phase 1).

    Carries the same structured components as JobOpening so a saved JD can be
    reloaded into a new opening without re-typing.
    """
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    title = models.CharField(max_length=255, blank=True)
    department = models.ForeignKey("employees.Department", on_delete=models.SET_NULL, null=True, blank=True)
    designation = models.ForeignKey("employees.Designation", on_delete=models.SET_NULL, null=True, blank=True)
    employment_type = models.CharField(max_length=20, default="full_time")
    experience_min = models.PositiveSmallIntegerField(default=0)
    experience_max = models.PositiveSmallIntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    mandatory_skills = models.JSONField(default=list, blank=True)
    preferred_skills = models.JSONField(default=list, blank=True)
    qualifications = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    keywords = models.JSONField(default=list, blank=True)
    competencies = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "jd_templates"
        unique_together = ("tenant", "name")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Candidate(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
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

    def __str__(self):
        return self.display_name

    @property
    def display_name(self) -> str:
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.email or f"Candidate #{self.pk}"


class CandidateProfile(models.Model):
    """Persisted, structured parse of a candidate's resume (Phase 2).

    Parse once, store the result + the cached extracted text so the matching
    engine never has to re-read/re-extract the file.
    """
    PARSE_STATUS = [
        ("pending", "Pending"), ("processing", "Processing"),
        ("done", "Done"), ("failed", "Failed"),
    ]
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    candidate = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name="profile")
    skills = models.JSONField(default=list, blank=True)
    education = models.JSONField(default=list, blank=True)
    experience = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    summary = models.TextField(blank=True)
    raw_text = models.TextField(blank=True)  # cached extracted resume text
    embedding = models.JSONField(null=True, blank=True)  # resume vector (Phase 4)
    parse_status = models.CharField(max_length=20, choices=PARSE_STATUS, default="pending")
    parse_error = models.TextField(blank=True)
    is_duplicate = models.BooleanField(default=False)
    duplicate_note = models.CharField(max_length=255, blank=True)
    parsed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "candidate_profiles"


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
    ai_score = models.PositiveSmallIntegerField(null=True, blank=True)
    ai_band = models.CharField(max_length=20, blank=True)
    ai_recommendation = models.TextField(blank=True)
    ai_ranked_at = models.DateTimeField(null=True, blank=True)
    # Multi-dimensional match scoring (Phase 3) — persisted, not transient.
    skill_score = models.PositiveSmallIntegerField(null=True, blank=True)
    experience_score = models.PositiveSmallIntegerField(null=True, blank=True)
    qualification_score = models.PositiveSmallIntegerField(null=True, blank=True)
    certification_score = models.PositiveSmallIntegerField(null=True, blank=True)
    strengths = models.JSONField(default=list, blank=True)
    gaps = models.JSONField(default=list, blank=True)
    score_breakdown = models.JSONField(default=dict, blank=True)  # sub-scores + weights used
    vector_similarity = models.FloatField(null=True, blank=True)  # JD↔resume cosine (Phase 4)
    tags = models.JSONField(default=list, blank=True)  # recruiter tags (Phase 5)

    class Meta:
        db_table = "job_applications"

    # Band → recruiter-facing suggested action.
    RECOMMENDATION_LABELS = {
        "Excellent": "Highly Recommended", "Good": "Recommended",
        "Average": "Consider", "Poor": "Not Recommended",
    }

    @property
    def recommendation_label(self) -> str:
        return self.RECOMMENDATION_LABELS.get(self.ai_band, "")


class ScoringWeights(models.Model):
    """Per-opening weighting of the four match dimensions (Phase 3).

    Optional — when absent, DEFAULTS apply. Weights are relative (need not sum to
    100); they are normalized when computing the weighted overall.
    """
    DEFAULTS = {"skill": 40, "experience": 30, "qualification": 20, "certification": 10}

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    job_opening = models.OneToOneField(JobOpening, on_delete=models.CASCADE, related_name="scoring_weights")
    skill_weight = models.PositiveSmallIntegerField(default=DEFAULTS["skill"])
    experience_weight = models.PositiveSmallIntegerField(default=DEFAULTS["experience"])
    qualification_weight = models.PositiveSmallIntegerField(default=DEFAULTS["qualification"])
    certification_weight = models.PositiveSmallIntegerField(default=DEFAULTS["certification"])
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "scoring_weights"

    def as_dict(self) -> dict:
        return {
            "skill": self.skill_weight, "experience": self.experience_weight,
            "qualification": self.qualification_weight, "certification": self.certification_weight,
        }


class Interview(models.Model):
    """A scheduled interview round for an application (Phase 7)."""
    MODE_CHOICES = [("video", "Video"), ("phone", "Phone"), ("onsite", "Onsite")]
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"), ("completed", "Completed"),
        ("cancelled", "Cancelled"), ("no_show", "No Show"),
    ]
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name="interviews")
    round_name = models.CharField(max_length=120, blank=True)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveSmallIntegerField(default=45)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default="video")
    location_or_link = models.CharField(max_length=500, blank=True)
    interviewer = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="scheduled")
    notes = models.TextField(blank=True)
    invite_sent = models.BooleanField(default=False)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interviews"
        ordering = ["scheduled_at"]

    def __str__(self):
        return f"{self.round_name or 'Interview'} @ {self.scheduled_at:%d %b %H:%M}"


class ResumeVersion(models.Model):
    """An archived snapshot of a candidate's resume file (Phase 7)."""
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="resume_versions")
    file = models.FileField(upload_to="resume_versions/%Y/")
    version = models.PositiveSmallIntegerField(default=1)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "resume_versions"
        ordering = ["-version"]
        unique_together = ("candidate", "version")


class TalentPool(models.Model):
    """A named, reusable segment of candidates that persists across openings (Phase 6)."""
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=500, blank=True)
    candidates = models.ManyToManyField(Candidate, related_name="talent_pools", blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "talent_pools"
        unique_together = ("tenant", "name")
        ordering = ["name"]

    def __str__(self):
        return self.name


class RankingJob(models.Model):
    """Tracks an async pool-ranking run so the UI can poll progress (Phase 4)."""
    STATUS = [
        ("queued", "Queued"), ("running", "Running"),
        ("done", "Done"), ("failed", "Failed"),
    ]
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    job_opening = models.ForeignKey(JobOpening, on_delete=models.CASCADE, related_name="ranking_jobs")
    status = models.CharField(max_length=20, choices=STATUS, default="queued")
    total = models.PositiveIntegerField(default=0)        # candidates to deep-score
    done = models.PositiveIntegerField(default=0)         # deep-scored so far
    pre_ranked = models.PositiveIntegerField(default=0)   # candidates vector pre-ranked
    error = models.TextField(blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ranking_jobs"
        ordering = ["-created_at"]

    def as_dict(self) -> dict:
        pct = round(100 * self.done / self.total) if self.total else (100 if self.status == "done" else 0)
        return {
            "id": self.id, "status": self.status, "total": self.total,
            "done": self.done, "pre_ranked": self.pre_ranked, "percent": pct,
            "error": self.error,
        }
