from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("hr_ops", "0014_company_vault"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyLetterSignatory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("title", models.CharField(blank=True, max_length=255)),
                (
                    "signature_image",
                    models.ImageField(
                        blank=True,
                        help_text="PNG scan of signature (transparent background works best).",
                        null=True,
                        upload_to="letter_signatures/%Y/",
                    ),
                ),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="letter_signatories",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "company_letter_signatories",
                "ordering": ["sort_order", "id"],
            },
        ),
    ]
