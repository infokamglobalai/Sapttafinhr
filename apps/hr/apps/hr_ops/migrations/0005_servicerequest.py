from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0001_initial"),
        ("tenants", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("hr_ops", "0004_policydocument"),
    ]

    operations = [
        migrations.CreateModel(
            name="ServiceRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("request_no", models.CharField(max_length=20)),
                ("category", models.CharField(max_length=20, choices=[
                    ("it_issue", "IT / Laptop issue"),
                    ("hardware", "Hardware request"),
                    ("software", "Software / Subscription / API key"),
                    ("hr_other", "HR / Other"),
                ])),
                ("subject", models.CharField(max_length=255)),
                ("description", models.TextField()),
                ("priority", models.CharField(max_length=10, choices=[
                    ("low", "Low"), ("normal", "Normal"), ("urgent", "Urgent"),
                ], default="normal")),
                ("status", models.CharField(max_length=20, choices=[
                    ("pending_manager", "Pending manager approval"),
                    ("pending_it", "Pending IT / Procurement"),
                    ("in_progress", "In progress"),
                    ("resolved", "Resolved"),
                    ("closed", "Closed"),
                    ("rejected", "Rejected"),
                ], default="pending_it")),
                ("attachment", models.FileField(blank=True, null=True, upload_to="service_requests/%Y/")),
                ("manager_actioned_at", models.DateTimeField(blank=True, null=True)),
                ("rejection_reason", models.TextField(blank=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("asset", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="service_requests", to="hr_ops.asset")),
                ("assigned_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_service_requests", to=settings.AUTH_USER_MODEL)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="service_requests", to="employees.employee")),
                ("manager", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="employees.employee")),
                ("manager_actioned_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="service_requests", to="tenants.tenant")),
            ],
            options={
                "db_table": "service_requests",
                "ordering": ["-created_at"],
                "unique_together": {("tenant", "request_no")},
            },
        ),
        migrations.CreateModel(
            name="ServiceRequestComment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField()),
                ("is_internal", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("author", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("request", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="comments", to="hr_ops.servicerequest")),
            ],
            options={
                "db_table": "service_request_comments",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="servicerequest",
            index=models.Index(fields=["tenant", "status", "created_at"], name="service_req_tenant__a1b2c3_idx"),
        ),
        migrations.AddIndex(
            model_name="servicerequest",
            index=models.Index(fields=["employee", "created_at"], name="service_req_employe_d4e5f6_idx"),
        ),
    ]
