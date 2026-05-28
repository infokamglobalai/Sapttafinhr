from django.contrib import admin

from .models import PortalAccess


@admin.register(PortalAccess)
class PortalAccessAdmin(admin.ModelAdmin):
    list_display = ("party", "is_active", "last_login_at")
    readonly_fields = ("token", "last_login_at")
