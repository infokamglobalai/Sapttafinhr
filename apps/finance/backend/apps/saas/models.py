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
