from django.apps import AppConfig
from django.db.models.signals import post_migrate


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    label = "core"

    def ready(self):
        from .seeding import seed_platform_and_demo_tenant
        post_migrate.connect(seed_platform_and_demo_tenant, sender=self)
