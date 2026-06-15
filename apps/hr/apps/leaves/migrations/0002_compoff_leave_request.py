from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("leaves", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="compoffcredit",
            name="leave_request",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="comp_off_credits",
                to="leaves.leaverequest",
            ),
        ),
    ]
