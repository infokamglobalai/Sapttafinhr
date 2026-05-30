from django.contrib import admin

from .models import JournalEntry, JournalLine


class JournalLineInline(admin.TabularInline):
    model = JournalLine
    extra = 0
    fields = ("account", "debit", "credit", "description", "cost_center", "project")


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("voucher_no", "date", "company", "fiscal_year", "status", "posted_at")
    list_filter = ("status", "company", "fiscal_year")
    search_fields = ("voucher_no", "narration")
    inlines = [JournalLineInline]
    readonly_fields = ("posted_at", "posted_by", "source_content_type", "source_object_id")
