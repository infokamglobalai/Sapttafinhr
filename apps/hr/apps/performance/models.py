from django.db import models


class ReviewCycle(models.Model):
    """A named review period (e.g. 'Annual 2024', 'Q1 2025')."""
    CYCLE_TYPES = [
        ("annual", "Annual"),
        ("half_yearly", "Half-Yearly"),
        ("quarterly", "Quarterly"),
        ("probation", "Probation"),
        ("project", "Project-based"),
    ]
    STATUS_CHOICES = [
        ("planning", "Planning"),
        ("active", "Active — reviews in progress"),
        ("review", "Manager Review"),
        ("calibration", "HR Calibration"),
        ("closed", "Closed"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="review_cycles")
    name = models.CharField(max_length=255)
    cycle_type = models.CharField(max_length=20, choices=CYCLE_TYPES, default="annual")
    review_period_start = models.DateField(help_text="Performance window — start of the period being reviewed")
    review_period_end = models.DateField(help_text="Performance window — end")
    opens_at = models.DateField(help_text="When managers can start writing reviews")
    closes_at = models.DateField(help_text="When reviews must be submitted by")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planning")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "review_cycles"
        unique_together = ("tenant", "name")
        ordering = ["-review_period_end"]

    def __str__(self):
        return f"{self.name} ({self.get_cycle_type_display()})"

    @property
    def is_open(self):
        import datetime
        today = datetime.date.today()
        return self.status == "active" and self.opens_at <= today <= self.closes_at


class PerformanceReview(models.Model):
    """One review per employee per cycle, written by their manager."""
    RATING_CHOICES = [
        (1, "1 — Below Expectations"),
        (2, "2 — Needs Improvement"),
        (3, "3 — Meets Expectations"),
        (4, "4 — Exceeds Expectations"),
        (5, "5 — Outstanding"),
    ]
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted to Employee"),
        ("acknowledged", "Acknowledged by Employee"),
    ]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE)
    cycle = models.ForeignKey(ReviewCycle, on_delete=models.CASCADE, related_name="reviews")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="reviews_received")
    reviewer = models.ForeignKey(
        "employees.Employee", on_delete=models.SET_NULL, null=True, related_name="reviews_written"
    )

    # Ratings on key dimensions
    overall_rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, null=True, blank=True)
    technical_rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, null=True, blank=True,
                                                        help_text="Skill, expertise, output quality")
    communication_rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, null=True, blank=True,
                                                            help_text="Clarity, responsiveness, collaboration")
    ownership_rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, null=True, blank=True,
                                                        help_text="Initiative, accountability, follow-through")
    teamwork_rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, null=True, blank=True,
                                                       help_text="Collaboration, mentorship, team spirit")

    # Narrative
    key_achievements = models.TextField(blank=True, help_text="Top accomplishments during the review period")
    strengths = models.TextField(blank=True, help_text="What the employee does well")
    areas_for_improvement = models.TextField(blank=True, help_text="Where the employee should grow")
    goals_next_period = models.TextField(blank=True, help_text="Goals for the next cycle")
    manager_comments = models.TextField(blank=True, help_text="Overall manager remarks")

    # Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    submitted_at = models.DateTimeField(null=True, blank=True)
    employee_comments = models.TextField(blank=True, help_text="Employee's response after acknowledging")
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "performance_reviews"
        unique_together = ("cycle", "employee")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee.full_name} — {self.cycle.name} ({self.get_status_display()})"

    @property
    def average_rating(self):
        """Compute weighted average of the 4 dimension ratings."""
        ratings = [r for r in [self.technical_rating, self.communication_rating,
                               self.ownership_rating, self.teamwork_rating] if r]
        if not ratings:
            return None
        return round(sum(ratings) / len(ratings), 2)
