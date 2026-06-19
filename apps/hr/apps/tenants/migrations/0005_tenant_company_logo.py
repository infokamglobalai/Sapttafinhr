from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0004_tenant_setup_complete"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="company_logo",
            field=models.ImageField(blank=True, null=True, upload_to="tenant_logos/%Y/"),
        ),
    ]
