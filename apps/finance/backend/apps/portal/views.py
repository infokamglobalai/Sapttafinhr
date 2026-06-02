from django.utils import timezone
from rest_framework import viewsets
from rest_framework import serializers as drf_serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import Invoice

from .models import PortalAccess


class PortalAccessSer(drf_serializers.ModelSerializer):
    party_name = drf_serializers.CharField(source="party.name", read_only=True)
    class Meta:
        model = PortalAccess
        fields = "__all__"
        read_only_fields = ("token", "last_login_at")


class PortalAccessViewSet(viewsets.ModelViewSet):
    queryset = PortalAccess.objects.select_related("party").all()
    serializer_class = PortalAccessSer
    filterset_fields = ("is_active", "party")


class PortalInvoicesView(APIView):
    """GET /api/v1/portal/invoices/?token=...  — public, list customer's invoices."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")
        if not token:
            return Response({"detail": "token required"}, status=400)
        try:
            access = PortalAccess.objects.select_related("party").get(token=token, is_active=True)
        except PortalAccess.DoesNotExist:
            return Response({"detail": "invalid token"}, status=403)

        # Record the visit so admins can see when a customer last opened their portal.
        PortalAccess.objects.filter(pk=access.pk).update(last_login_at=timezone.now())

        invoices = Invoice.objects.filter(customer=access.party, status=Invoice.Status.POSTED).order_by("-date")
        return Response({
            "party": {"id": access.party.id, "name": access.party.name},
            "invoices": [
                {
                    "id": i.id, "invoice_no": i.invoice_no, "date": i.date.isoformat(),
                    "due_date": i.due_date.isoformat() if i.due_date else None,
                    "grand_total": str(i.grand_total),
                    "balance_due": str(i.balance_due),
                    "is_paid": i.is_paid,
                }
                for i in invoices
            ],
        })
