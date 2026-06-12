from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet, OutboundLogViewSet, SendNotificationView

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")
router.register("outbound-log", OutboundLogViewSet)

urlpatterns = [
    path("send/", SendNotificationView.as_view()),
] + router.urls
