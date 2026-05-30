from django.contrib import admin

from .models import DepreciationEntry, FixedAsset


@admin.register(FixedAsset)
class FixedAssetAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "purchase_date", "purchase_cost",
                    "current_book_value", "method", "is_disposed")
    list_filter = ("method", "is_disposed", "company")


@admin.register(DepreciationEntry)
class DepEntryAdmin(admin.ModelAdmin):
    list_display = ("asset", "period_end", "amount")
