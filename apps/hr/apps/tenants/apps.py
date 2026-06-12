from django.apps import AppConfig


class TenantsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tenants"

    def ready(self):
        from django.db.backends.signals import connection_created

        def _setup_sqlite_pragmas(sender, connection, **kwargs):
            if connection.vendor != "sqlite":
                return
            cursor = connection.cursor()
            # WAL: writers don't block readers; readers don't block writers.
            cursor.execute("PRAGMA journal_mode=WAL;")
            # NORMAL is the recommended pairing with WAL for app servers.
            cursor.execute("PRAGMA synchronous=NORMAL;")
            # Wait up to 30 seconds when the DB is locked instead of failing.
            cursor.execute("PRAGMA busy_timeout=30000;")

        connection_created.connect(_setup_sqlite_pragmas)

        from django.db.models.signals import post_migrate
        from .seeding import seed_hr_demo_tenant
        post_migrate.connect(seed_hr_demo_tenant, sender=self)
