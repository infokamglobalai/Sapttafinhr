from django.contrib import admin, messages
from django.utils import timezone

from apps.core.models import AuditLog

from .models import Plan, SaasInvoice, Subscription, SubscriptionEntitlement


class SubscriptionEntitlementInline(admin.TabularInline):
    model = SubscriptionEntitlement
    extra = 1


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "monthly_price", "annual_price", "is_active")


@admin.register(Subscription)
class SubAdmin(admin.ModelAdmin):
    list_display = ("tenant", "plan", "status", "is_commercially_active", "current_period_end", "trial_ends_at")
    list_filter = ("status",)
    search_fields = ("tenant__name", "tenant__schema_name")
    inlines = [SubscriptionEntitlementInline]
    actions = ("suspend_subscriptions", "reactivate_subscriptions", "extend_trial_30_days")

    @admin.action(description="Extend Trial by 30 days")
    def extend_trial_30_days(self, request, queryset):
        from datetime import timedelta
        n = 0
        for sub in queryset:
            if sub.status in (Subscription.Status.TRIAL, Subscription.Status.PENDING, Subscription.Status.PAST_DUE):
                base_date = sub.trial_ends_at or timezone.now().date()
                sub.trial_ends_at = base_date + timedelta(days=30)
                sub.status = Subscription.Status.TRIAL
                sub.save(update_fields=["status", "trial_ends_at", "updated_at"])
                sub.entitlements.update(status=SubscriptionEntitlement.Status.TRIAL)
                AuditLog.record(
                    actor_email=getattr(request.user, "email", ""),
                    action="subscription.extend_trial",
                    target=sub.tenant.schema_name,
                    detail=f"Extended trial until {sub.trial_ends_at}"
                )
                n += 1
        self.message_user(request, f"Extended trial for {n} subscription(s).", messages.SUCCESS)

    @admin.action(description="Suspend (set PAST_DUE → blocks tenant access)")
    def suspend_subscriptions(self, request, queryset):
        n = 0
        for sub in queryset:
            sub.status = Subscription.Status.PAST_DUE
            sub.save(update_fields=["status", "updated_at"])
            sub.entitlements.update(status=SubscriptionEntitlement.Status.SUSPENDED)
            AuditLog.record(
                actor_email=getattr(request.user, "email", ""),
                action="subscription.suspend", target=sub.tenant.schema_name,
                previous_status=str(sub.status),
            )
            n += 1
        self.message_user(request, f"Suspended {n} subscription(s).", messages.WARNING)

    @admin.action(description="Reactivate (set ACTIVE for 30 days)")
    def reactivate_subscriptions(self, request, queryset):
        from datetime import timedelta

        n = 0
        for sub in queryset:
            sub.status = Subscription.Status.ACTIVE
            sub.current_period_start = timezone.now().date()
            sub.current_period_end = timezone.now().date() + timedelta(days=30)
            sub.cancelled_at = None
            sub.save(update_fields=["status", "current_period_start", "current_period_end", "cancelled_at", "updated_at"])
            sub.entitlements.update(status=SubscriptionEntitlement.Status.ACTIVE)
            AuditLog.record(
                actor_email=getattr(request.user, "email", ""),
                action="subscription.reactivate", target=sub.tenant.schema_name,
            )
            n += 1
        self.message_user(request, f"Reactivated {n} subscription(s).", messages.SUCCESS)


@admin.register(SubscriptionEntitlement)
class SubscriptionEntitlementAdmin(admin.ModelAdmin):
    list_display = ("subscription", "product", "status", "current_period_end")
    list_filter = ("product", "status")
    search_fields = ("subscription__tenant__name", "external_product_tenant_id")


@admin.register(SaasInvoice)
class InvAdmin(admin.ModelAdmin):
    list_display = ("subscription", "period_start", "period_end", "amount", "status")
    list_filter = ("status",)
