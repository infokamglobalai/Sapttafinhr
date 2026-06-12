from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("identity", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_verified",
            field=models.BooleanField(default=False),
        ),
        # Existing accounts (created before email verification existed) are
        # grandfathered in as verified so they are never locked out.
        migrations.RunPython(
            code=lambda apps, schema_editor: apps.get_model("identity", "User")
            .objects.update(is_verified=True),
            reverse_code=migrations.RunPython.noop,
        ),
    ]
