import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("tenants", "0001_initial"),
        ("payroll", "0005_gosi_statutory"),
    ]

    operations = [
        migrations.CreateModel(
            name="PayslipTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                (
                    "layout",
                    models.CharField(
                        choices=[
                            ("builtin_in", "India — Standard"),
                            ("builtin_kw", "Kuwait / GCC — Standard"),
                            ("builtin_gcc", "GCC — Generic"),
                            ("custom", "Custom HTML (Jinja2)"),
                        ],
                        default="builtin_in",
                        max_length=20,
                    ),
                ),
                (
                    "template_html",
                    models.TextField(
                        blank=True,
                        help_text="Jinja2 HTML body — only for Custom layout. Vars: record, employee, tenant, company, run, payslip.",
                    ),
                ),
                ("is_default", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
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
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payslip_templates",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "payslip_templates",
                "ordering": ["-is_default", "name"],
            },
        ),
        migrations.AddField(
            model_name="payslip",
            name="layout_key",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="payslip",
            name="template",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="generated_payslips",
                to="payroll.paysliptemplate",
            ),
        ),
    ]
