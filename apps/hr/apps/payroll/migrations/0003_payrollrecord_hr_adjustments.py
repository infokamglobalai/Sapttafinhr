from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0002_form16_taxdeclaration"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollrecord",
            name="lop_override",
            field=models.DecimalField(
                blank=True,
                decimal_places=1,
                help_text="HR override for LOP days; blank = use attendance summary",
                max_digits=4,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="payrollrecord",
            name="bonus_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="payrollrecord",
            name="manual_deduction",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="payrollrecord",
            name="hr_notes",
            field=models.TextField(blank=True),
        ),
    ]
