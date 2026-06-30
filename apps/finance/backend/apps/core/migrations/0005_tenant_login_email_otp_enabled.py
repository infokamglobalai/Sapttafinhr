from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_tenant_provision_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="login_email_otp_enabled",
            field=models.BooleanField(default=False),
        ),
    ]
