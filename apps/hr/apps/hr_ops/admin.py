from django.contrib import admin
from .models import LetterTemplate, HRLetter, Asset, AssetAssignment, OnboardingTemplate, ExitRequest, Announcement, CelebrationPost, CelebrationWish


@admin.register(LetterTemplate)
class LetterTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "letter_type", "tenant", "is_active")
    list_filter = ("tenant", "letter_type", "is_active")


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
