# P5 — link recruitment offer to HR letter draft

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recruitment", "0006_candidateprofile_embedding_and_more"),
        ("hr_ops", "0015_company_letter_signatories"),
    ]

    operations = [
        migrations.AddField(
            model_name="hrletter",
            name="job_application",
            field=models.ForeignKey(
                blank=True,
                help_text="Recruitment application this offer letter was created from (P5).",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="hr_offer_letters",
                to="recruitment.jobapplication",
            ),
        ),
        migrations.AddIndex(
            model_name="hrletter",
            index=models.Index(
                fields=["tenant", "job_application", "letter_type"],
                name="hr_letters_tenant__rec_offer_idx",
            ),
        ),
    ]
