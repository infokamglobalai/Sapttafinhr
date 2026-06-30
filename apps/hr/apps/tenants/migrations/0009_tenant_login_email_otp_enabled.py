from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0008_tenant_ui_language"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="login_email_otp_enabled",
            field=models.BooleanField(default=False),
        ),
    ]
