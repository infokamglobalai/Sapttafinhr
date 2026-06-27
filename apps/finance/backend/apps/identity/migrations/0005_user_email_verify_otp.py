from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("identity", "0004_user_mfa"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="email_verify_otp_hash",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="user",
            name="email_verify_otp_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
