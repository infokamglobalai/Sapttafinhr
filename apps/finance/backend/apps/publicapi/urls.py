from rest_framework.routers import DefaultRouter

from .views import APIKeyViewSet, WebhookDeliveryViewSet, WebhookViewSet

router = DefaultRouter()
router.register("api-keys", APIKeyViewSet)
router.register("webhooks", WebhookViewSet)
router.register("webhook-deliveries", WebhookDeliveryViewSet)

urlpatterns = router.urls
