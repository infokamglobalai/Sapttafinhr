from django.contrib import admin
from .models import ProductEntitlement, Tenant, TenantSetting


class TenantSettingInline(admin.TabularInline):
    model = TenantSetting
    extra = 1


class ProductEntitlementInline(admin.TabularInline):
    model = ProductEntitlement
    extra = 1


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "subdomain", "plan", "status", "employee_count", "created_at")
    list_filter = ("plan", "status", "country")
    search_fields = ("name", "subdomain", "gstin", "pan", "customer_uid")
    readonly_fields = ("id", "customer_uid", "created_at", "updated_at", "employee_count")
    inlines = [ProductEntitlementInline, TenantSettingInline]
    fieldsets = (
        ("Identity", {"fields": ("id", "customer_uid", "name", "subdomain", "logo_url")}),
        ("Plan", {"fields": ("plan", "status", "max_employees", "employee_count")}),
        ("Locale", {"fields": ("country", "currency", "timezone")}),
        ("Legal", {"fields": ("gstin", "pan", "cin", "address")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(ProductEntitlement)
class ProductEntitlementAdmin(admin.ModelAdmin):
    list_display = ("tenant", "product", "status", "current_period_end")
    list_filter = ("product", "status")
    search_fields = ("tenant__name", "tenant__subdomain", "external_subscription_id")
