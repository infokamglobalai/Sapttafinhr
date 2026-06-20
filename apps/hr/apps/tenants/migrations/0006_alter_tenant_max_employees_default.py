from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0005_tenant_company_logo"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tenant",
            name="max_employees",
            field=models.PositiveIntegerField(default=30),
        ),
    ]
