from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0006_payslip_templates"),
    ]

    operations = [
        migrations.AddField(
            model_name="paysliptemplate",
            name="company_address_override",
            field=models.TextField(
                blank=True,
                help_text="Address under company name. Leave blank to use letterhead address.",
            ),
        ),
        migrations.AddField(
            model_name="paysliptemplate",
            name="company_display_name",
            field=models.CharField(
                blank=True,
                help_text="Company name on payslip header. Leave blank to use letterhead name.",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="paysliptemplate",
            name="footer_mode",
            field=models.CharField(
                choices=[
                    ("system_generated", "System generated — no signature required"),
                    ("certified", "Certified — authorized signatory"),
                    ("custom", "Custom footer text"),
                    ("none", "No footer"),
                ],
                default="system_generated",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="paysliptemplate",
            name="footer_text",
            field=models.TextField(
                blank=True,
                help_text="Custom footer line, or certification note when mode is Certified.",
            ),
        ),
        migrations.AddField(
            model_name="paysliptemplate",
            name="payslip_title",
            field=models.CharField(
                blank=True,
                help_text='Document title. Use {month_year} e.g. "Payslip for the month of {month_year}".',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="paysliptemplate",
            name="signatory_name_override",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="paysliptemplate",
            name="signatory_title_override",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="paysliptemplate",
            name="template_logo",
            field=models.ImageField(
                blank=True,
                help_text="Optional logo for this template only. Leave blank to use company logo.",
                null=True,
                upload_to="payslip_templates/%Y/",
            ),
        ),
    ]
