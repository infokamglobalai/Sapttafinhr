# Generated for P2 letter types — intent, NOC, certificate archive types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0007_historicalemployee_name_ar_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employeedocument",
            name="document_type",
            field=models.CharField(
                choices=[
                    ("aadhaar", "Aadhaar Card"),
                    ("pan", "PAN Card"),
                    ("passport", "Passport"),
                    ("civil_id", "Civil ID"),
                    ("residency", "Residency / Iqama"),
                    ("work_permit", "Work Permit"),
                    ("degree", "Degree Certificate"),
                    ("offer_letter", "Offer Letter"),
                    ("appointment", "Appointment Letter"),
                    ("promotion", "Promotion Letter"),
                    ("increment", "Increment Letter"),
                    ("confirmation", "Confirmation Letter"),
                    ("termination", "Termination Letter"),
                    ("internship", "Internship Letter"),
                    ("warning", "Warning Letter"),
                    ("relieving", "Relieving Letter"),
                    ("experience", "Experience Letter"),
                    ("intent_letter", "Letter of Intent"),
                    ("noc", "No Objection Certificate"),
                    ("certificate", "Certificate"),
                    ("other", "Other"),
                ],
                max_length=50,
            ),
        ),
    ]
