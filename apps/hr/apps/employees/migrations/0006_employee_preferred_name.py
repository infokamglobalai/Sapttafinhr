from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0005_employee_name_ar"),
    ]

    operations = [
        migrations.AddField(
            model_name="employee",
            name="preferred_name",
            field=models.CharField(
                blank=True,
                help_text="Nickname or display name shown across the company directory (optional).",
                max_length=80,
            ),
        ),
    ]
