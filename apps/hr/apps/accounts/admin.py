from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Permission, RolePermission, UserRole


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "tenant", "is_active", "is_staff", "date_joined")
    list_filter = ("is_active", "is_staff", "tenant")
    search_fields = ("email", "tenant__name")
    ordering = ("-date_joined",)
    readonly_fields = ("id", "date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        ("Tenant", {"fields": ("tenant",)}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("date_joined", "last_login")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "tenant", "password1", "password2"),
        }),
    )


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("codename", "name", "module")
    list_filter = ("module",)
    search_fields = ("codename", "name")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "is_system", "created_at")
    list_filter = ("is_system", "tenant")
