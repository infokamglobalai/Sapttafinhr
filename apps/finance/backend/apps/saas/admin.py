from django.contrib import admin

from .models import Plan, SaasInvoice, Subscription, SubscriptionEntitlement


class SubscriptionEntitlementInline(admin.TabularInline):
    model = SubscriptionEntitlement
    extra = 1


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "monthly_price", "annual_price", "is_active")


@admin.register(Subscription)
class SubAdmin(admin.ModelAdmin):
    list_display = ("tenant", "plan", "status", "current_period_end")
    list_filter = ("status",)
    inlines = [SubscriptionEntitlementInline]


@admin.register(SubscriptionEntitlement)
class SubscriptionEntitlementAdmin(admin.ModelAdmin):
    list_display = ("subscription", "product", "status", "current_period_end")
    list_filter = ("product", "status")
    search_fields = ("subscription__tenant__name", "external_product_tenant_id")


@admin.register(SaasInvoice)
class InvAdmin(admin.ModelAdmin):
    list_display = ("subscription", "period_start", "period_end", "amount", "status")
    list_filter = ("status",)
