from django.contrib import admin, messages
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
    actions = ("extend_trial_30_days",)

    @admin.action(description="Extend Trial by 30 days")
    def extend_trial_30_days(self, request, queryset):
        from datetime import timedelta
        from django.utils import timezone
        from apps.hr_ops.services import audit_log

        n = 0
        for tenant in queryset:
            if tenant.status in ("trial", "suspended", "cancelled"):
                tenant.status = "trial"
                tenant.save(update_fields=["status", "updated_at"])
                
                # Update product entitlements
                for ent in tenant.product_entitlements.all():
                    base_date = ent.current_period_end or timezone.now().date()
                    ent.current_period_end = base_date + timedelta(days=30)
                    ent.status = ProductEntitlement.Status.TRIAL
                    ent.save(update_fields=["status", "current_period_end", "updated_at"])
                
                # Write to audit log
                audit_log(
                    tenant,
                    request.user,
                    "update",
                    "Tenant",
                    tenant,
                    f"Extended trial for tenant {tenant.name} by 30 days"
                )
                n += 1
        self.message_user(request, f"Extended trial for {n} tenant(s).", messages.SUCCESS)
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
