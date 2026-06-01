from django.contrib import admin

from .models import AuditLog, Domain, Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "schema_name", "created_on", "is_active", "billing_email", "subscription_status")
    search_fields = ("name", "schema_name", "billing_email")
    list_filter = ("is_active",)

    @admin.display(description="Subscription")
    def subscription_status(self, obj):
        """Tenant diagnostics at a glance — its commercial subscription state."""
        sub = getattr(obj, "subscription", None)
        return sub.status if sub else "—"


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ("domain", "tenant", "is_primary")
    search_fields = ("domain",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Append-only operator action trail — read-only in the admin."""

    list_display = ("created_at", "actor_email", "action", "target")
    list_filter = ("action",)
    search_fields = ("actor_email", "action", "target")
    readonly_fields = ("actor_email", "action", "target", "detail", "created_at")
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
