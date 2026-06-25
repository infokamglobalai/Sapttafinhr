"""SaaS layer: Plans + Subscriptions for the PLATFORM (not customer accounting).

Lives in the public/shared schema. Used to gate features per tenant.
"""
from django.db import models

from apps.core.models import TimeStampedModel, Tenant


class ProductCode(models.TextChoices):
    FIN = "FIN", "Finance"
    HR = "HR", "HRMS"


class Plan(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    annual_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    features = models.JSONField(default=dict,
                                 help_text='e.g. {"max_users":5,"einvoice":true}')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code}: {self.name}"


class Subscription(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Payment"   # signed up, not paid → NO access
        TRIAL = "TRIAL", "Trial"                 # retained for legacy rows
        ACTIVE = "ACTIVE", "Active"
        PAST_DUE = "PAST_DUE", "Past Due"
        CANCELLED = "CANCELLED", "Cancelled"

    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE,
                                   related_name="subscription")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)
    # Pay-first: new signups start PENDING and gain access only after payment
    # flips them to ACTIVE (see billing.activate_subscription_for_tenant).
    status = models.CharField(max_length=10, choices=Status.choices,
                               default=Status.PENDING)
    trial_ends_at = models.DateField(null=True, blank=True)
    current_period_start = models.DateField(null=True, blank=True)
    current_period_end = models.DateField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    razorpay_subscription_id = models.CharField(max_length=100, null=True, blank=True)

    @property
    def is_commercially_active(self) -> bool:
        # ACTIVE = paid; TRIAL = legacy rows from before pay-first (keep access).
        return self.status in (self.Status.ACTIVE, self.Status.TRIAL)

    def allows_product(self, product_code: str) -> bool:
        """Return True when this subscription includes an active product seat."""
        if not self.is_commercially_active:
            return False

        entitlements = getattr(self, "_prefetched_objects_cache", {}).get("entitlements")
        if entitlements is not None:
            matches = [item for item in entitlements if item.product == product_code]
            if matches:
                return any(item.is_active for item in matches)
            return False

        qs = self.entitlements.filter(product=product_code)
        if qs.exists():
            return qs.filter(status__in=SubscriptionEntitlement.ACTIVE_STATUSES).exists()

        # Legacy safety: existing FIN tenants created before entitlements keep FIN access.
        return product_code == ProductCode.FIN and self.is_commercially_active


class SubscriptionEntitlement(TimeStampedModel):
    """Product access granted by a subscription, e.g. FIN only, HR only, or both."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Payment"
        TRIAL = "TRIAL", "Trial"
        ACTIVE = "ACTIVE", "Active"
        PAST_DUE = "PAST_DUE", "Past Due"
        SUSPENDED = "SUSPENDED", "Suspended"
        CANCELLED = "CANCELLED", "Cancelled"

    # ACTIVE = paid; TRIAL = legacy rows from before pay-first (keep access).
    ACTIVE_STATUSES = (Status.ACTIVE, Status.TRIAL)

    subscription = models.ForeignKey(
        Subscription, on_delete=models.CASCADE, related_name="entitlements"
    )
    product = models.CharField(max_length=10, choices=ProductCode.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    external_product_tenant_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional tenant/customer id in the separate product system.",
    )
    current_period_end = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("subscription", "product")

    def __str__(self) -> str:
        return f"{self.subscription_id}:{self.product}:{self.status}"

    @property
    def is_active(self) -> bool:
        return self.subscription.is_commercially_active and self.status in self.ACTIVE_STATUSES


class SaasInvoice(TimeStampedModel):
    """Invoice from the platform TO the tenant for SaaS subscription."""
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        PAID = "PAID", "Paid"
        VOID = "VOID", "Void"

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE,
                                      related_name="invoices")
    # Human-facing GST invoice number, e.g. SAAS/2026-27/000123.
    number = models.CharField(max_length=40, blank=True, db_index=True)
    period_start = models.DateField()
    period_end = models.DateField()
    # `amount` is the GST-inclusive grand total (kept for back-compat). The GST
    # breakup below makes the invoice India-GST compliant: SaaS is a service
    # (SAC 9983 / 18%); place of supply decides CGST+SGST vs IGST.
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    taxable_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    sac_code = models.CharField(max_length=10, default="9983")
    place_of_supply = models.CharField(max_length=2, blank=True)
    customer_gstin = models.CharField(max_length=15, blank=True)
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices,
                               default=Status.OPEN)


class SaasAuditLog(models.Model):
    """Append-only record of privileged super-admin actions on the platform.

    Every mutating operation in the /superadmin console (activate, suspend,
    change plan, provision, impersonate, billing changes, …) writes one row so
    there is an accountable trail of who did what, to which tenant, and when.
    """

    actor_email = models.CharField(max_length=254, db_index=True)
    action = models.CharField(max_length=64, db_index=True)
    target_schema = models.CharField(max_length=63, blank=True, db_index=True)
    target_label = models.CharField(max_length=200, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.actor_email} {self.action} {self.target_schema}"


class TenantNote(models.Model):
    """Internal operator note attached to a tenant (CRM-style). Public schema."""

    tenant_schema = models.CharField(max_length=63, db_index=True)
    author_email = models.CharField(max_length=254, blank=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.tenant_schema}: {self.body[:40]}"


class PlatformAnnouncement(models.Model):
    """Platform-wide announcement broadcast to all tenants (in-app banner)."""

    class Level(models.TextChoices):
        INFO = "INFO", "Info"
        WARNING = "WARNING", "Warning"
        CRITICAL = "CRITICAL", "Critical"

    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.INFO)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_by = models.CharField(max_length=254, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"[{self.level}] {self.title}"

    @property
    def is_live(self) -> bool:
        from django.utils import timezone
        now = timezone.now()
        if not self.is_active:
            return False
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        return True


class ProcessedWebhookEvent(models.Model):
    """Replay guard for inbound payment webhooks.

    The gateway can legitimately re-deliver the same (validly signed) event. The
    unique event_id lets the webhook view detect a duplicate and skip
    re-processing, so a captured-payment event can't be replayed to repeatedly
    drive the subscription state machine.
    """
    event_id = models.CharField(max_length=255, unique=True)
    received_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.event_id


class CouponCode(TimeStampedModel):
    """Platform promo / discount codes for SaaS checkout."""

    class DiscountType(models.TextChoices):
        PERCENT = "percent", "Percentage off"
        FIXED = "fixed_inr", "Fixed INR off"

    code = models.CharField(max_length=40, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, default=DiscountType.PERCENT)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    applies_to_plans = models.JSONField(
        default=list, blank=True,
        help_text="Empty = all plans. Else list of plan codes e.g. ['saptta-hr','saptta-complete']",
    )
    applies_to_cycles = models.JSONField(
        default=list, blank=True,
        help_text="Empty = monthly+annual. Else ['monthly'] or ['annual']",
    )
    max_redemptions = models.PositiveIntegerField(null=True, blank=True)
    redemptions_used = models.PositiveIntegerField(default=0)
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    first_time_only = models.BooleanField(
        default=False,
        help_text="Only tenants with no prior PAID invoice / redemption",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.CharField(max_length=254, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.code


class CouponRedemption(TimeStampedModel):
    coupon = models.ForeignKey(CouponCode, on_delete=models.CASCADE, related_name="redemptions")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="coupon_redemptions")
    subscription = models.ForeignKey(
        Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name="coupon_redemptions",
    )
    plan_code = models.CharField(max_length=40, blank=True)
    billing_cycle = models.CharField(max_length=20, blank=True)
    original_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)
    redeemed_by_email = models.CharField(max_length=254, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.coupon.code} → {self.tenant_id}"
