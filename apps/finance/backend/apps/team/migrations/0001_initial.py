from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='TenantMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user_id', models.IntegerField(db_index=True, unique=True)),
                ('email', models.EmailField(db_index=True, max_length=254, unique=True)),
                ('full_name', models.CharField(blank=True, max_length=200)),
                ('role', models.CharField(
                    choices=[
                        ('OWNER', 'Owner'), ('ADMIN', 'Admin'), ('MANAGER', 'Manager'),
                        ('ACCOUNTANT', 'Accountant'), ('EMPLOYEE', 'Employee'), ('VIEWER', 'Viewer'),
                    ],
                    default='EMPLOYEE',
                    max_length=20,
                )),
                ('is_active', models.BooleanField(default=True)),
                ('invited_by_email', models.EmailField(blank=True, max_length=254)),
            ],
            options={'ordering': ['email'], 'abstract': False},
        ),
    ]
