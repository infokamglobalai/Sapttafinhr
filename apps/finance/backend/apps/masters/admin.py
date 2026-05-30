from django.contrib import admin

from .models import Account, Branch, Company, FiscalYear, HSNCode, Item, Party


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "gstin", "state_code", "base_currency", "books_closed_until")
    search_fields = ("name", "gstin")


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("company", "name", "code")
    list_filter = ("company",)


@admin.register(FiscalYear)
class FiscalYearAdmin(admin.ModelAdmin):
    list_display = ("company", "name", "start_date", "end_date", "is_active", "is_closed")
    list_filter = ("company", "is_active", "is_closed")


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "type", "company", "is_postable", "is_active")
    list_filter = ("type", "company", "is_postable", "is_active")
    search_fields = ("code", "name")


@admin.register(Party)
class PartyAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "gstin", "company", "is_active")
    list_filter = ("kind", "company", "is_active")
    search_fields = ("name", "gstin", "email")


@admin.register(HSNCode)
class HSNCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "default_tax_rate", "company")
    search_fields = ("code", "description")


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "kind", "sale_price", "tax_rate", "is_active")
    list_filter = ("kind", "company", "is_active")
    search_fields = ("sku", "name")
