from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers as drf_serializers

from .models import Notification, OutboundMessage
from .channels import send_email, send_whatsapp


class NotificationSer(drf_serializers.ModelSerializer):
    class Meta: model = Notification; fields = "__all__"


class OutboundSer(drf_serializers.ModelSerializer):
    class Meta: model = OutboundMessage; fields = "__all__"


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSer
    filterset_fields = ("is_read",)

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        n = self.get_object()
        n.is_read = True
        n.save(update_fields=["is_read", "updated_at"])
        return Response(NotificationSer(n).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"ok": True})


class OutboundLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OutboundMessage.objects.all()
    serializer_class = OutboundSer
    filterset_fields = ("channel", "status")


class SendNotificationView(APIView):
    """Internal helper for testing channels.
       POST /api/v1/notifications/send/  { channel, to, subject, body }"""
    def post(self, request):
        ch = request.data["channel"]
        to = request.data["to"]
        body = request.data["body"]
        if ch == "EMAIL":
            msg = send_email(to, request.data.get("subject", ""), body)
        elif ch == "WHATSAPP":
            msg = send_whatsapp(to, body)
        else:
            return Response({"detail": "unsupported channel"}, status=400)
        return Response(OutboundSer(msg).data, status=status.HTTP_201_CREATED)
