from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("leaves", "0002_compoff_leave_request"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="leaverequest",
                    name="approval_stage",
                    field=models.CharField(
                        choices=[("manager", "Manager"), ("hr", "HR")],
                        default="manager",
                        max_length=20,
                    ),
                ),
                migrations.AddField(
                    model_name="leaverequest",
                    name="manager_approved_at",
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="leaverequest",
                    name="manager_approved_by",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
