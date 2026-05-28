from django.contrib import admin

from .models import Notification, OutboundMessage


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "level", "is_read", "created_at")
    list_filter = ("level", "is_read")


@admin.register(OutboundMessage)
class OutboundAdmin(admin.ModelAdmin):
    list_display = ("channel", "to", "subject", "status", "created_at")
    list_filter = ("channel", "status")
    search_fields = ("to", "subject")
