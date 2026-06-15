# Generated manually for policy distribution feature

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0002_employee_esi_number_employee_uan_number_and_more"),
        ("hr_ops", "0005_servicerequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="policydocument",
            name="attachment",
            field=models.FileField(blank=True, help_text="PDF, DOCX, or other policy document", null=True, upload_to="policies/%Y/"),
        ),
        migrations.AddField(
            model_name="policydocument",
            name="last_distributed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="policydocument",
            name="body",
            field=models.TextField(blank=True, help_text="Plain text or markdown — auto-filled when you upload PDF/DOCX"),
        ),
        migrations.CreateModel(
            name="PolicyDistribution",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("audience", models.CharField(choices=[("company", "Entire company"), ("departments", "Selected departments"), ("employees", "Selected employees")], default="company", max_length=20)),
                ("distributed_at", models.DateTimeField(auto_now_add=True)),
                ("recipient_count", models.PositiveIntegerField(default=0)),
                ("departments", models.ManyToManyField(blank=True, related_name="+", to="employees.department")),
                ("distributed_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("employees", models.ManyToManyField(blank=True, related_name="+", to="employees.employee")),
                ("policy", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="distributions", to="hr_ops.policydocument")),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="policy_distributions", to="tenants.tenant")),
            ],
            options={
                "db_table": "policy_distributions",
                "ordering": ["-distributed_at"],
            },
        ),
        migrations.CreateModel(
            name="PolicyRecipient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("distribution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipients", to="hr_ops.policydistribution")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="policy_receipts", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "policy_recipients",
                "unique_together": {("distribution", "user")},
            },
        ),
    ]
