from rest_framework import viewsets
from rest_framework import serializers as drf_serializers

from .models import APIKey, WebhookDelivery, WebhookSubscription


class APIKeySer(drf_serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = "__all__"
        read_only_fields = ("key", "last_used_at")


class WebhookSer(drf_serializers.ModelSerializer):
    class Meta:
        model = WebhookSubscription
        fields = "__all__"
        read_only_fields = ("secret",)


class WebhookDelSer(drf_serializers.ModelSerializer):
    class Meta: model = WebhookDelivery; fields = "__all__"


class APIKeyViewSet(viewsets.ModelViewSet):
    queryset = APIKey.objects.all()
    serializer_class = APIKeySer
    filterset_fields = ("company", "is_active")


class WebhookViewSet(viewsets.ModelViewSet):
    queryset = WebhookSubscription.objects.all()
    serializer_class = WebhookSer
    filterset_fields = ("company", "is_active")


class WebhookDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WebhookDelivery.objects.select_related("subscription").all()
    serializer_class = WebhookDelSer
    filterset_fields = ("subscription", "event", "success")
