from datetime import date as _date

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .integrations.razorpay import get_razorpay
from .models import Advance, BankAccount, BankStatement, BankStatementLine, FXRate, PostDatedCheque
from .serializers import (
    AdvanceSerializer,
    BankAccountSerializer,
    BankStatementLineSer,
    BankStatementSer,
    FXRateSerializer,
    PDCSerializer,
)
from . import services


class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.select_related("ledger_account").all()
    serializer_class = BankAccountSerializer
    filterset_fields = ("company", "is_active", "currency")


class BankStatementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BankStatement.objects.prefetch_related("lines").all()
    serializer_class = BankStatementSer
    filterset_fields = ("bank_account",)


class BankStatementLineViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BankStatementLine.objects.select_related("statement").all()
    serializer_class = BankStatementLineSer
    filterset_fields = ("statement", "status")


class ImportStatementView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        bank_id = int(request.data.get("bank_account"))
        bank = BankAccount.objects.get(pk=bank_id)
        file = request.FILES.get("file")
        if not file:
            raise ValidationError({"file": "required"})
        stmt = services.import_statement(
            bank_account=bank, file_bytes=file.read(),
            period_start=_date.fromisoformat(request.data["period_start"]),
            period_end=_date.fromisoformat(request.data["period_end"]),
            opening=request.data.get("opening", "0"),
            closing=request.data.get("closing", "0"),
        )
        # Auto-run reconciliation immediately so the user lands on a matched-up table.
        match_result = services.auto_reconcile(bank)

        data = BankStatementSer(stmt).data
        data["auto_reconcile"] = match_result
        return Response(data, status=status.HTTP_201_CREATED)


class ReconcileView(APIView):
    def post(self, request, bank_id):
        bank = BankAccount.objects.get(pk=bank_id)
        return Response(services.auto_reconcile(bank))


class PDCViewSet(viewsets.ModelViewSet):
    queryset = PostDatedCheque.objects.select_related("party", "bank_account").all()
    serializer_class = PDCSerializer
    filterset_fields = ("company", "direction", "status", "party")
    ordering = ("cheque_date",)


class AdvanceViewSet(viewsets.ModelViewSet):
    queryset = Advance.objects.select_related("party").all()
    serializer_class = AdvanceSerializer
    filterset_fields = ("company", "kind", "party")


class FXRateViewSet(viewsets.ModelViewSet):
    queryset = FXRate.objects.all()
    serializer_class = FXRateSerializer
    filterset_fields = ("company", "currency", "date")


class CreatePaymentLinkView(APIView):
    """POST /api/v1/banking/payment-link/  body: { invoice_id, amount, description }"""
    def post(self, request):
        rzp = get_razorpay()
        link = rzp.create_payment_link(
            amount=int(float(request.data["amount"]) * 100),
            currency=request.data.get("currency", "INR"),
            description=request.data.get("description", ""),
            reference_id=str(request.data["invoice_id"]),
        )
        return Response({"id": link.id, "short_url": link.short_url, "status": link.status})


class RazorpayWebhookView(APIView):
    """POST /api/v1/banking/webhooks/razorpay/  — HMAC-verified in real integration."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        rzp = get_razorpay()
        sig = request.headers.get("X-Razorpay-Signature", "")
        if not rzp.verify_webhook(request.body, sig, "stub-secret"):
            return Response({"detail": "invalid signature"}, status=400)
        # Stub: just acknowledge.
        return Response({"ok": True})
