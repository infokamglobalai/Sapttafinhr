from django.contrib import admin

from .models import APIKey, WebhookDelivery, WebhookSubscription


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "is_active", "last_used_at", "key")
    readonly_fields = ("key", "last_used_at")
    list_filter = ("is_active", "company")


@admin.register(WebhookSubscription)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "url", "events", "is_active")
    readonly_fields = ("secret",)


@admin.register(WebhookDelivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ("event", "subscription", "response_status", "success", "attempted_at")
    list_filter = ("success", "event")
