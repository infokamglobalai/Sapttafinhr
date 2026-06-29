from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("hr_ops", "0016_hrletter_job_application"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="exitrequest",
            name="hr_acknowledged_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="exitrequest",
            name="hr_acknowledged_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="exitrequest",
            name="hr_acknowledgement_method",
            field=models.CharField(
                blank=True,
                choices=[("online", "Online in Saptta HR"), ("offline", "Signed offline (paper)")],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="exitrequest",
            name="employee_acknowledged_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="exitrequest",
            name="employee_acknowledgement_method",
            field=models.CharField(
                blank=True,
                choices=[("online", "Online in Saptta HR"), ("offline", "Signed offline (paper)")],
                max_length=20,
            ),
        ),
    ]
