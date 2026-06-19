from django.db import migrations, models

GCC = ("KW", "AE", "SA", "BH", "OM", "QA")


def backfill_jurisdiction(apps, schema_editor):
    Tenant = apps.get_model("tenants", "Tenant")
    for code in GCC:
        Tenant.objects.filter(country=code).update(payroll_jurisdiction=code)


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0006_alter_tenant_max_employees_default"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="payroll_jurisdiction",
            field=models.CharField(
                choices=[
                    ("IN", "India"),
                    ("KW", "Kuwait"),
                    ("AE", "United Arab Emirates"),
                    ("SA", "Saudi Arabia"),
                    ("BH", "Bahrain"),
                    ("OM", "Oman"),
                    ("QA", "Qatar"),
                ],
                default="IN",
                max_length=2,
            ),
        ),
        migrations.RunPython(backfill_jurisdiction, migrations.RunPython.noop),
    ]
