from django.contrib import admin

from .models import Receipt, ReceiptAllocation


class AllocationInline(admin.TabularInline):
    model = ReceiptAllocation
    extra = 0


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("receipt_no", "date", "customer", "amount", "mode", "status")
    list_filter = ("status", "mode", "company")
    search_fields = ("receipt_no", "customer__name", "reference")
    inlines = [AllocationInline]
    readonly_fields = ("journal_entry",)
