# Generated manually for seat-limit notification types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hr_ops", "0017_exit_settlement_acknowledgement"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="notification_type",
            field=models.CharField(
                choices=[
                    ("leave_applied", "Leave Applied"),
                    ("leave_approved", "Leave Approved"),
                    ("leave_rejected", "Leave Rejected"),
                    ("leave_cancelled", "Leave Cancelled"),
                    ("payslip_published", "Payslip Published"),
                    ("review_submitted", "Review Submitted"),
                    ("review_acknowledged", "Review Acknowledged"),
                    ("attendance_regularization_requested", "Attendance Correction Requested"),
                    ("attendance_regularization_approved", "Attendance Correction Approved"),
                    ("attendance_regularization_rejected", "Attendance Correction Rejected"),
                    ("announcement", "Announcement"),
                    ("policy_published", "Policy Published"),
                    ("birthday", "Birthday"),
                    ("work_anniversary", "Work Anniversary"),
                    ("document_expiring", "Document Expiring"),
                    ("probation_ending", "Probation Ending"),
                    ("calendar_reminder", "Calendar Reminder"),
                    ("celebration", "Celebration"),
                    ("seat_limit_warning", "Seat Limit Warning"),
                    ("seat_limit_reached", "Seat Limit Reached"),
                    ("seat_freed", "Seat Available"),
                    ("general", "General"),
                ],
                default="general",
                max_length=50,
            ),
        ),
    ]
