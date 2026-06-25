from django.contrib import admin
from .models import (
    LetterTemplate, HRLetter, CompanyLetterBranding, Asset, AssetAssignment,
    OnboardingTemplate, ExitRequest, Announcement, CelebrationPost, CelebrationWish,
)


@admin.register(LetterTemplate)
class LetterTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "letter_type", "tenant", "requires_approval", "is_active")
    list_filter = ("tenant", "letter_type", "is_active", "requires_approval")


@admin.register(HRLetter)
class HRLetterAdmin(admin.ModelAdmin):
    list_display = ("employee", "letter_type", "status", "version", "reference_number", "generated_at")
    list_filter = ("tenant", "letter_type", "status")
    search_fields = ("employee__first_name", "employee__last_name", "reference_number")


@admin.register(CompanyLetterBranding)
class CompanyLetterBrandingAdmin(admin.ModelAdmin):
    list_display = ("tenant", "updated_at")


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("asset_code", "name", "category", "status", "tenant")
    list_filter = ("tenant", "status", "category")
    search_fields = ("asset_code", "name", "serial_number")


@admin.register(ExitRequest)
class ExitRequestAdmin(admin.ModelAdmin):
    list_display = ("employee", "resignation_date", "last_working_date", "status")
    list_filter = ("tenant", "status")


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "tenant", "is_published", "published_at")
    list_filter = ("tenant", "is_published")


@admin.register(CelebrationPost)
class CelebrationPostAdmin(admin.ModelAdmin):
    list_display = ("display_title", "tenant", "celebration_type", "is_published", "published_at")
    list_filter = ("tenant", "celebration_type", "is_published")


@admin.register(CelebrationWish)
class CelebrationWishAdmin(admin.ModelAdmin):
    list_display = ("post", "author", "emoji", "created_at")
    list_filter = ("post__tenant",)
