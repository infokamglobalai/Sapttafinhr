from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0005_tenant_company_logo"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("hr_ops", "0007_policy_phase2"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyCalendarEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("event_date", models.DateField()),
                ("description", models.TextField(blank=True)),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("meeting", "Meeting"),
                            ("reminder", "Reminder"),
                            ("task", "Task"),
                            ("other", "Other"),
                        ],
                        default="reminder",
                        max_length=20,
                    ),
                ),
                ("notify_on_day", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="calendar_events_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="calendar_events",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "company_calendar_events",
                "ordering": ["event_date", "title"],
                "indexes": [models.Index(fields=["tenant", "event_date"], name="company_cal_tenant__a1b2c3_idx")],
            },
        ),
    ]
