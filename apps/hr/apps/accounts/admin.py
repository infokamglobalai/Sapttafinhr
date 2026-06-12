from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Permission, RolePermission, UserRole


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "tenant", "is_active", "is_staff", "date_joined")
    list_filter = ("is_active", "is_staff", "tenant")
    search_fields = ("email", "tenant__name")
    ordering = ("-date_joined",)
    readonly_fields = ("id", "date_joined", "last_login")
    actions = ("generate_sso_impersonation_link",)

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

    @admin.action(description="Generate SSO Impersonation Link (Audited)")
    def generate_sso_impersonation_link(self, request, queryset):
        if not request.user.is_superuser:
            self.message_user(request, "Only platform superusers can generate impersonation links.", messages.ERROR)
            return

        from django.core.signing import TimestampSigner
        from django.conf import settings
        from apps.hr_ops.services import audit_log

        secret = getattr(settings, "SSO_SHARED_SECRET", "")
        if not secret:
            self.message_user(request, "SSO_SHARED_SECRET is not configured on this server.", messages.ERROR)
            return

        signer = TimestampSigner(key=secret, salt="saptta.hr-sso")

        for user in queryset:
            workspace = user.tenant.subdomain if user.tenant else ""
            payload = f"{user.email}|{workspace}"
            token = signer.sign(payload)
            sso_url = f"/auth/sso/?token={token}"

            if user.tenant:
                audit_log(
                    user.tenant,
                    request.user,
                    "impersonate",
                    "User",
                    user,
                    f"Generated SSO impersonation link for user {user.email}"
                )

            self.message_user(
                request,
                f"Generated SSO login URL for {user.email}: {sso_url}",
                messages.WARNING
            )
            break  # Generate for one user at a time



@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("codename", "name", "module")
    list_filter = ("module",)
    search_fields = ("codename", "name")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "is_system", "created_at")
    list_filter = ("is_system", "tenant")
