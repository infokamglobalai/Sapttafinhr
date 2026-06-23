import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("employees", "0001_initial"),
        ("tenants", "0001_initial"),
        ("hr_ops", "0010_notification_types_phase2"),
    ]

    operations = [
        migrations.CreateModel(
            name="CelebrationPost",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "celebration_type",
                    models.CharField(
                        choices=[
                            ("birthday", "Birthday"),
                            ("work_anniversary", "Work Anniversary"),
                            ("new_joiner", "Welcome / New Joiner"),
                            ("promotion", "Promotion"),
                            ("wedding", "Wedding"),
                            ("new_baby", "New Baby"),
                            ("festival", "Festival / Holiday"),
                            ("achievement", "Achievement"),
                            ("farewell", "Farewell"),
                            ("custom", "Custom"),
                        ],
                        default="birthday",
                        max_length=30,
                    ),
                ),
                ("title", models.CharField(blank=True, max_length=255)),
                ("message", models.TextField(help_text="Main wish or announcement from HR / manager.")),
                ("poster_image", models.ImageField(blank=True, null=True, upload_to="celebrations/%Y/")),
                ("is_published", models.BooleanField(default=True)),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
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
                    "subject_employee",
                    models.ForeignKey(
                        blank=True,
                        help_text="Person being celebrated (optional for company-wide festivals).",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="celebration_posts",
                        to="employees.employee",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="celebration_posts",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "celebration_posts",
                "ordering": ["-published_at", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="CelebrationWish",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("message", models.TextField(blank=True)),
                ("emoji", models.CharField(blank=True, max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="celebration_wishes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "post",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wishes",
                        to="hr_ops.celebrationpost",
                    ),
                ),
            ],
            options={
                "db_table": "celebration_wishes",
                "ordering": ["created_at"],
                "unique_together": {("post", "author")},
            },
        ),
        migrations.AlterField(
            model_name="notification",
            name="notification_type",
            field=models.CharField(
                choices=[
                    ("leave_applied", "Leave Applied"),
                    ("leave_approved", "Leave Approved"),
                    ("leave_rejected", "Leave Rejected"),
                    ("leave_cancelled", "Leave Cancelled"),
                    ("payslip_published", "Payslip Published"),
                    ("review_submitted", "Review Submitted"),
                    ("review_acknowledged", "Review Acknowledged"),
                    ("attendance_regularization_requested", "Attendance Correction Requested"),
                    ("attendance_regularization_approved", "Attendance Correction Approved"),
                    ("attendance_regularization_rejected", "Attendance Correction Rejected"),
                    ("announcement", "Announcement"),
                    ("policy_published", "Policy Published"),
                    ("birthday", "Birthday"),
                    ("work_anniversary", "Work Anniversary"),
                    ("document_expiring", "Document Expiring"),
                    ("probation_ending", "Probation Ending"),
                    ("calendar_reminder", "Calendar Reminder"),
                    ("celebration", "Celebration"),
                    ("general", "General"),
                ],
                default="general",
                max_length=50,
            ),
        ),
    ]
