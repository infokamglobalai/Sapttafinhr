from django.apps import AppConfig


class BillingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.billing"
    label = "billing"

    def ready(self):
        # Wire post_save signals (E-Invoice auto-trigger)
        from . import signals  # noqa: F401
