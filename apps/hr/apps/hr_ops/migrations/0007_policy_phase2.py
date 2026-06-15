# Policy Phase 2: versions, acknowledgment, reminders

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hr_ops", "0006_policy_distribution"),
    ]

    operations = [
        migrations.AddField(
            model_name="policydocument",
            name="version_number",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="policydistribution",
            name="requires_acknowledgment",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="policydistribution",
            name="version_number",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="policyrecipient",
            name="acknowledged_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="policyrecipient",
            name="last_reminded_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="PolicyVersion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("version_number", models.PositiveIntegerField()),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField(blank=True)),
                ("category", models.CharField(blank=True, max_length=100)),
                ("attachment", models.FileField(blank=True, null=True, upload_to="policies/versions/%Y/")),
                ("change_notes", models.CharField(blank=True, max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("policy", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="versions", to="hr_ops.policydocument")),
            ],
            options={
                "db_table": "policy_versions",
                "ordering": ["-version_number"],
                "unique_together": {("policy", "version_number")},
            },
        ),
    ]
