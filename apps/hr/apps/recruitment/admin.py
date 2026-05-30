from django.contrib import admin
from .models import JobOpening, Candidate, JobApplication


@admin.register(JobOpening)
class JobOpeningAdmin(admin.ModelAdmin):
    list_display = ("title", "tenant", "status", "positions_count", "created_at")
    list_filter = ("status", "tenant")


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "tenant", "created_at")
    search_fields = ("first_name", "last_name", "email")


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ("candidate", "job_opening", "status", "applied_at")
    list_filter = ("status", "tenant")
