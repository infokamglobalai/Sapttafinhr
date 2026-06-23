# Generated manually — finance sync tracking on payroll runs

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0007_payslip_template_branding"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollrun",
            name="finance_journal_id",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="payrollrun",
            name="finance_synced_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="payrollrun",
            name="finance_voucher_no",
            field=models.CharField(blank=True, max_length=40),
        ),
    ]
