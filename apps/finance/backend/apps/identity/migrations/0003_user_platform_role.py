from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("identity", "0002_user_is_verified"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="platform_role",
            field=models.CharField(
                blank=True,
                choices=[
                    ("OWNER", "Platform Owner"),
                    ("BILLING", "Billing Ops"),
                    ("SUPPORT", "Support"),
                    ("READONLY", "Read Only"),
                ],
                default="",
                help_text="Scoped superadmin access. Empty + is_staff = full platform owner.",
                max_length=20,
            ),
        ),
    ]
