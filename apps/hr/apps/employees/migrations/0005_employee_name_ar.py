from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0004_gcc_p1"),
    ]

    operations = [
        migrations.AddField(
            model_name="employee",
            name="name_ar",
            field=models.CharField(blank=True, help_text="Arabic name for GCC payslips", max_length=255),
        ),
    ]
