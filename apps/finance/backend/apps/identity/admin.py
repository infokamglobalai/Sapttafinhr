from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Role, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "full_name", "is_active", "is_staff")
    search_fields = ("email", "full_name")
    actions = ("generate_impersonation_token",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name",)}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),
    )

    @admin.action(description="Generate Impersonation Token (Audited)")
    def generate_impersonation_token(self, request, queryset):
        if not request.user.is_superuser:
            self.message_user(request, "Only platform superusers can impersonate users.", messages.ERROR)
            return

        from rest_framework_simplejwt.tokens import RefreshToken
        from apps.core.models import AuditLog

        for user in queryset:
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            
            AuditLog.record(
                actor_email=request.user.email,
                action="user.impersonate",
                target=user.email,
                detail=f"Generated impersonation token. Access token starts with: {access_token[:15]}..."
            )
            
            self.message_user(
                request,
                f"Generated access token for {user.email} (Bearer token): {access_token}",
                messages.WARNING
            )
            break  # Generate for one user at a time



@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_system")
