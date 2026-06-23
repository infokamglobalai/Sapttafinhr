# Generated migration for projects app

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("employees", "0004_gcc_p1"),
        ("tenants", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Project",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=40)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(
                    choices=[
                        ("planning", "Planning"),
                        ("active", "Active"),
                        ("on_hold", "On Hold"),
                        ("completed", "Completed"),
                    ],
                    default="active",
                    max_length=20,
                )),
                ("start_date", models.DateField(blank=True, null=True)),
                ("end_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+", to=settings.AUTH_USER_MODEL,
                )),
                ("department", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="projects", to="employees.department",
                )),
                ("lead", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="led_projects", to="employees.employee",
                )),
                ("tenant", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="projects", to="tenants.tenant",
                )),
            ],
            options={
                "db_table": "projects",
                "ordering": ["-updated_at", "name"],
                "unique_together": {("tenant", "code")},
            },
        ),
        migrations.CreateModel(
            name="ProjectMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(
                    choices=[("lead", "Lead"), ("member", "Member"), ("viewer", "Viewer")],
                    default="member", max_length=20,
                )),
                ("added_at", models.DateTimeField(auto_now_add=True)),
                ("employee", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="project_memberships", to="employees.employee",
                )),
                ("project", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="members", to="projects.project",
                )),
            ],
            options={
                "db_table": "project_members",
                "ordering": ["role", "employee__first_name"],
                "unique_together": {("project", "employee")},
            },
        ),
        migrations.CreateModel(
            name="ProjectDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("file", models.FileField(upload_to="project_docs/%Y/")),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("is_team_visible", models.BooleanField(default=True)),
                ("project", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="documents", to="projects.project",
                )),
                ("uploaded_by", models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "project_documents",
                "ordering": ["-uploaded_at"],
            },
        ),
        migrations.CreateModel(
            name="ProjectUpdate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("message", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("author", models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+", to=settings.AUTH_USER_MODEL,
                )),
                ("project", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="updates", to="projects.project",
                )),
            ],
            options={
                "db_table": "project_updates",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="TimeEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("entry_date", models.DateField()),
                ("hours", models.DecimalField(decimal_places=2, max_digits=5)),
                ("description", models.CharField(blank=True, max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("employee", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="time_entries", to="employees.employee",
                )),
                ("project", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="time_entries", to="projects.project",
                )),
            ],
            options={
                "db_table": "project_time_entries",
                "ordering": ["-entry_date"],
                "unique_together": {("project", "employee", "entry_date")},
            },
        ),
    ]
