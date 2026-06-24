# Async self-serve provisioning: track schema build state per tenant.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_auditlog'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='provision_status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('PROVISIONING', 'Provisioning'),
                    ('READY', 'Ready'),
                    ('FAILED', 'Failed'),
                ],
                default='READY',
                max_length=16,
            ),
        ),
    ]
