from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0001_initial"),
        ("tenants", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("hr_ops", "0013_letter_management"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "doc_type",
                    models.CharField(
                        choices=[
                            ("incorporation", "Certificate of Incorporation"),
                            ("pan", "Company PAN"),
                            ("gst", "GST Registration"),
                            ("moa_aoa", "MOA / AOA"),
                            ("bank_kyc", "Bank KYC / Account"),
                            ("trade_license", "Trade / Business License"),
                            ("insurance", "Insurance Policy"),
                            ("other", "Other"),
                        ],
                        max_length=30,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("file", models.FileField(upload_to="company_vault/%Y/")),
                ("file_size_bytes", models.PositiveIntegerField(blank=True, null=True)),
                ("mime_type", models.CharField(blank=True, max_length=100)),
                ("expiry_date", models.DateField(blank=True, help_text="Renewal reminder for licenses, etc.", null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="company_documents",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "company_documents",
                "ordering": ["doc_type", "title"],
            },
        ),
        migrations.CreateModel(
            name="CompanyDocumentAccessRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "doc_type",
                    models.CharField(
                        choices=[
                            ("incorporation", "Certificate of Incorporation"),
                            ("pan", "Company PAN"),
                            ("gst", "GST Registration"),
                            ("moa_aoa", "MOA / AOA"),
                            ("bank_kyc", "Bank KYC / Account"),
                            ("trade_license", "Trade / Business License"),
                            ("insurance", "Insurance Policy"),
                            ("other", "Other"),
                        ],
                        max_length=30,
                    ),
                ),
                ("purpose", models.TextField(help_text="Why the employee needs this document")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending review"),
                            ("approved", "Approved"),
                            ("denied", "Denied"),
                            ("expired", "Access expired"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("access_expires_at", models.DateTimeField(blank=True, null=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("denial_reason", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "document",
                    models.ForeignKey(
                        blank=True,
                        help_text="Vault file granted on approval",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="access_requests",
                        to="hr_ops.companydocument",
                    ),
                ),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="company_doc_requests",
                        to="employees.employee",
                    ),
                ),
                (
                    "reviewed_by",
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
                        related_name="company_doc_requests",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "company_document_access_requests",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="companydocument",
            index=models.Index(fields=["tenant", "doc_type", "is_active"], name="company_doc_tenant__a1b2c3_idx"),
        ),
        migrations.AddIndex(
            model_name="companydocumentaccessrequest",
            index=models.Index(fields=["tenant", "status", "created_at"], name="company_req_tenant__d4e5f6_idx"),
        ),
        migrations.AddIndex(
            model_name="companydocumentaccessrequest",
            index=models.Index(fields=["employee", "status"], name="company_req_employe_g7h8i9_idx"),
        ),
    ]
