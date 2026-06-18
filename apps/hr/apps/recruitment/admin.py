from django.contrib import admin
from .models import (
    Candidate, CandidateProfile, Interview, JDTemplate, JobApplication, JobOpening,
    RankingJob, ResumeVersion, ScoringWeights, TalentPool,
)


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


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ("candidate", "parse_status", "is_duplicate", "parsed_at")
    list_filter = ("parse_status", "is_duplicate", "tenant")


@admin.register(JDTemplate)
class JDTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "title", "tenant", "created_at")
    list_filter = ("tenant",)
    search_fields = ("name", "title")


@admin.register(ScoringWeights)
class ScoringWeightsAdmin(admin.ModelAdmin):
    list_display = ("job_opening", "skill_weight", "experience_weight",
                    "qualification_weight", "certification_weight", "updated_at")


@admin.register(RankingJob)
class RankingJobAdmin(admin.ModelAdmin):
    list_display = ("id", "job_opening", "status", "pre_ranked", "done", "total", "created_at")
    list_filter = ("status", "tenant")


@admin.register(TalentPool)
class TalentPoolAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "created_at")
    list_filter = ("tenant",)
    search_fields = ("name",)
    filter_horizontal = ("candidates",)


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ("application", "round_name", "scheduled_at", "mode", "status", "invite_sent")
    list_filter = ("status", "mode", "tenant")


@admin.register(ResumeVersion)
class ResumeVersionAdmin(admin.ModelAdmin):
    list_display = ("candidate", "version", "uploaded_at")
    list_filter = ("tenant",)
