from django.apps import AppConfig


class TenantsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tenants"

    def ready(self):
        from django.db.backends.signals import connection_created
        from django.db.models.signals import post_save, post_delete
        from django.core.cache import cache

        # M5: TenantMiddleware caches the subdomain→tenant lookup for 5 min. Bust
        # that cache when a tenant changes (e.g. status flips to suspended) so a
        # de-activated workspace stops being served immediately instead of lagging.
        def _invalidate_tenant_cache(sender, instance, **kwargs):
            subdomain = getattr(instance, "subdomain", None)
            if subdomain:
                cache.delete(f"tenant_subdomain:{subdomain}")

        def _connect_tenant_cache_signals():
            from .models import Tenant
            post_save.connect(_invalidate_tenant_cache, sender=Tenant, dispatch_uid="tenant_cache_save")
            post_delete.connect(_invalidate_tenant_cache, sender=Tenant, dispatch_uid="tenant_cache_delete")

        _connect_tenant_cache_signals()

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
