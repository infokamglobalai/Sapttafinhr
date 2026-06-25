# Generated for coupon codes feature

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_tenant_provision_status"),
        ("saas", "0008_platformannouncement_tenantnote"),
    ]

    operations = [
        migrations.CreateModel(
            name="CouponCode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(db_index=True, max_length=40, unique=True)),
                ("description", models.CharField(blank=True, max_length=255)),
                (
                    "discount_type",
                    models.CharField(
                        choices=[("percent", "Percentage off"), ("fixed_inr", "Fixed INR off")],
                        default="percent",
                        max_length=20,
                    ),
                ),
                ("discount_value", models.DecimalField(decimal_places=2, max_digits=10)),
                (
                    "applies_to_plans",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Empty = all plans. Else list of plan codes e.g. ['saptta-hr','saptta-complete']",
                    ),
                ),
                (
                    "applies_to_cycles",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Empty = monthly+annual. Else ['monthly'] or ['annual']",
                    ),
                ),
                ("max_redemptions", models.PositiveIntegerField(blank=True, null=True)),
                ("redemptions_used", models.PositiveIntegerField(default=0)),
                ("valid_from", models.DateField(blank=True, null=True)),
                ("valid_until", models.DateField(blank=True, null=True)),
                (
                    "first_time_only",
                    models.BooleanField(
                        default=False,
                        help_text="Only tenants with no prior PAID invoice / redemption",
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_by", models.CharField(blank=True, max_length=254)),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
        migrations.CreateModel(
            name="CouponRedemption",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("plan_code", models.CharField(blank=True, max_length=40)),
                ("billing_cycle", models.CharField(blank=True, max_length=20)),
                ("original_amount", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("discount_amount", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("final_amount", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("razorpay_order_id", models.CharField(blank=True, max_length=100)),
                ("razorpay_payment_id", models.CharField(blank=True, max_length=100)),
                ("redeemed_by_email", models.CharField(blank=True, max_length=254)),
                (
                    "coupon",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="redemptions",
                        to="saas.couponcode",
                    ),
                ),
                (
                    "subscription",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="coupon_redemptions",
                        to="saas.subscription",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="coupon_redemptions",
                        to="core.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
    ]
