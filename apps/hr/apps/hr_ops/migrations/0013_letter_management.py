# Generated manually for letter management module

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0004_gcc_p1"),
        ("hr_ops", "0012_alter_celebrationpost_created_by"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="lettertemplate",
            name="requires_approval",
            field=models.BooleanField(
                default=False,
                help_text="When enabled, letters must be approved before PDF is issued.",
            ),
        ),
        migrations.CreateModel(
            name="CompanyLetterBranding",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("logo", models.ImageField(blank=True, null=True, upload_to="letter_branding/%Y/")),
                ("signature_image", models.ImageField(blank=True, null=True, upload_to="letter_branding/%Y/")),
                ("stamp_image", models.ImageField(blank=True, null=True, upload_to="letter_branding/%Y/")),
                (
                    "footer_html",
                    models.TextField(
                        blank=True,
                        help_text="Optional footer text/HTML shown at the bottom of every letter.",
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tenant",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="letter_branding",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "company_letter_branding",
            },
        ),
        migrations.AddField(
            model_name="hrletter",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("pending_approval", "Pending Approval"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("issued", "Issued"),
                    ("superseded", "Superseded"),
                ],
                default="issued",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="reference_number",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="version",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="parent",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="revisions",
                to="hr_ops.hrletter",
            ),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="draft_html",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="extra_context",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="submitted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="approved_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="rejected_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="rejected_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="rejection_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="issued_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="employee_document",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="hr_letters",
                to="employees.employeedocument",
            ),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="emailed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="hrletter",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name="hrletter",
            index=models.Index(fields=["tenant", "status", "letter_type"], name="hr_letters_tenant__a1b2c3_idx"),
        ),
        migrations.AddIndex(
            model_name="hrletter",
            index=models.Index(fields=["tenant", "employee", "letter_type", "status"], name="hr_letters_tenant__d4e5f6_idx"),
        ),
        migrations.RunPython(
            code=lambda apps, schema_editor: _backfill_issued_letters(apps),
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="hrletter",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("pending_approval", "Pending Approval"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("issued", "Issued"),
                    ("superseded", "Superseded"),
                ],
                default="draft",
                max_length=30,
            ),
        ),
    ]


def _backfill_issued_letters(apps):
    HRLetter = apps.get_model("hr_ops", "HRLetter")
    for letter in HRLetter.objects.filter(pdf__isnull=False).exclude(pdf=""):
        letter.status = "issued"
        if not letter.issued_at:
            letter.issued_at = letter.generated_at
        letter.save(update_fields=["status", "issued_at"])
