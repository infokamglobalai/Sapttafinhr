# P6 — client SOW / contract templates

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("masters", "0006_numberseries"),
        ("billing", "0004_creditnote_vat_historicalcreditnote_vat_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClientDocumentTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "doc_type",
                    models.CharField(
                        choices=[
                            ("sow", "Statement of Work (SOW)"),
                            ("msa", "Master Service Agreement (MSA)"),
                            ("nda", "Non-Disclosure Agreement (NDA)"),
                            ("custom", "Custom"),
                        ],
                        default="sow",
                        max_length=20,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                (
                    "template_html",
                    models.TextField(
                        help_text="Jinja2 HTML. Vars: company, customer, quotation, project_name, milestones, …"
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="client_doc_templates",
                        to="masters.company",
                    ),
                ),
            ],
            options={
                "ordering": ("doc_type", "name"),
                "unique_together": {("company", "doc_type", "name")},
            },
        ),
        migrations.CreateModel(
            name="ClientDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("doc_type", models.CharField(default="sow", max_length=20)),
                ("doc_no", models.CharField(db_index=True, max_length=40)),
                ("title", models.CharField(max_length=255)),
                ("body_html", models.TextField(blank=True)),
                ("extra_context", models.JSONField(blank=True, default=dict)),
                (
                    "status",
                    models.CharField(
                        choices=[("DRAFT", "Draft"), ("FINAL", "Final")],
                        default="DRAFT",
                        max_length=10,
                    ),
                ),
                ("finalized_at", models.DateTimeField(blank=True, null=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="client_documents",
                        to="masters.company",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="client_documents",
                        to="masters.party",
                    ),
                ),
                (
                    "quotation",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="client_documents",
                        to="billing.quotation",
                    ),
                ),
                (
                    "sales_order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="client_documents",
                        to="billing.salesorder",
                    ),
                ),
                (
                    "template",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="documents",
                        to="billing.clientdocumenttemplate",
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
                "unique_together": {("company", "doc_no")},
            },
        ),
    ]
