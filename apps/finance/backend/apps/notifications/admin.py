from django.contrib import admin

from .models import Notification, OutboundMessage, SMTPSettings


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "level", "is_read", "created_at")
    list_filter = ("level", "is_read")


@admin.register(OutboundMessage)
class OutboundAdmin(admin.ModelAdmin):
    list_display = ("channel", "to", "subject", "status", "created_at")
    list_filter = ("channel", "status")
    search_fields = ("to", "subject")


@admin.register(SMTPSettings)
class SMTPSettingsAdmin(admin.ModelAdmin):
    list_display = ("host", "port", "username", "from_email", "is_active")
    list_filter = ("is_active",)
    search_fields = ("host", "username", "from_email")

