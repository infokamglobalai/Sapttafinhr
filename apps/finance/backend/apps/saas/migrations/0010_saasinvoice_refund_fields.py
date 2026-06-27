from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("saas", "0009_couponcode_couponredemption"),
    ]

    operations = [
        migrations.AddField(
            model_name="saasinvoice",
            name="razorpay_payment_id",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="saasinvoice",
            name="razorpay_refund_id",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="saasinvoice",
            name="refunded_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="saasinvoice",
            name="status",
            field=models.CharField(
                choices=[
                    ("OPEN", "Open"),
                    ("PAID", "Paid"),
                    ("VOID", "Void"),
                    ("REFUNDED", "Refunded"),
                ],
                default="OPEN",
                max_length=10,
            ),
        ),
    ]
