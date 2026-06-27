# P7 — CRM lite (sales leads on Parties)

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("masters", "0008_company_country_company_standard_vat_rate_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="SalesLead",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(help_text="Deal or opportunity name", max_length=255)),
                ("contact_name", models.CharField(blank=True, max_length=200)),
                ("organization", models.CharField(blank=True, help_text="Prospect company name", max_length=255)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("phone", models.CharField(blank=True, max_length=20)),
                (
                    "stage",
                    models.CharField(
                        choices=[
                            ("new", "New"),
                            ("contacted", "Contacted"),
                            ("qualified", "Qualified"),
                            ("proposal", "Proposal sent"),
                            ("negotiation", "Negotiation"),
                            ("won", "Won"),
                            ("lost", "Lost"),
                        ],
                        db_index=True,
                        default="new",
                        max_length=20,
                    ),
                ),
                ("expected_value", models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ("next_follow_up", models.DateField(blank=True, db_index=True, null=True)),
                ("source", models.CharField(blank=True, help_text="e.g. referral, inbound, event", max_length=80)),
                ("notes", models.TextField(blank=True)),
                ("lost_reason", models.CharField(blank=True, max_length=255)),
                ("closed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sales_leads",
                        to="masters.company",
                    ),
                ),
                (
                    "party",
                    models.ForeignKey(
                        blank=True,
                        help_text="Linked customer/vendor master record when the prospect is in Parties.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sales_leads",
                        to="masters.party",
                    ),
                ),
            ],
            options={
                "ordering": ("-updated_at",),
            },
        ),
        migrations.CreateModel(
            name="LeadActivity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "activity_type",
                    models.CharField(
                        choices=[
                            ("note", "Note"),
                            ("call", "Call"),
                            ("email", "Email"),
                            ("meeting", "Meeting"),
                        ],
                        default="note",
                        max_length=20,
                    ),
                ),
                ("summary", models.TextField()),
                ("activity_at", models.DateTimeField()),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "lead",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="activities",
                        to="masters.saleslead",
                    ),
                ),
            ],
            options={
                "ordering": ("-activity_at",),
            },
        ),
        migrations.AddIndex(
            model_name="saleslead",
            index=models.Index(fields=["company", "stage"], name="masters_sal_company_8a1c2d_idx"),
        ),
        migrations.AddIndex(
            model_name="saleslead",
            index=models.Index(fields=["company", "next_follow_up"], name="masters_sal_company_9b2e3f_idx"),
        ),
    ]
