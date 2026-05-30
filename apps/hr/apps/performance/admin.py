from django.contrib import admin
from .models import ReviewCycle, PerformanceReview


@admin.register(ReviewCycle)
class ReviewCycleAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "cycle_type", "status", "review_period_start", "review_period_end", "closes_at")
    list_filter = ("tenant", "status", "cycle_type")
    date_hierarchy = "review_period_end"


@admin.register(PerformanceReview)
class PerformanceReviewAdmin(admin.ModelAdmin):
    list_display = ("employee", "cycle", "reviewer", "overall_rating", "status", "updated_at")
    list_filter = ("tenant", "cycle", "status", "overall_rating")
    search_fields = ("employee__first_name", "employee__last_name", "employee__employee_code")
    readonly_fields = ("created_at", "updated_at", "submitted_at", "acknowledged_at", "average_rating")
