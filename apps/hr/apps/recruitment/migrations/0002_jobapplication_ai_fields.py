from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recruitment", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="jobapplication",
            name="ai_band",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="jobapplication",
            name="ai_ranked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="jobapplication",
            name="ai_recommendation",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="jobapplication",
            name="ai_score",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]
