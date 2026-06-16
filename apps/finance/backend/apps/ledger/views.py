from datetime import date as _date

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import JournalEntry
from .reports import trial_balance
from .serializers import (
    JournalEntrySerializer,
    ManualJournalEntryCreateSerializer,
    TrialBalanceRowSerializer,
)


class JournalEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """Read endpoints for journal entries. Writes go through ManualJournalEntryCreateView."""

    queryset = JournalEntry.objects.prefetch_related("lines", "lines__account").all()
    serializer_class = JournalEntrySerializer
    filterset_fields = ("company", "fiscal_year", "status", "date", "category")
    search_fields = ("voucher_no", "narration")
    ordering_fields = ("date", "voucher_no")
    ordering = ("-date", "-id")

    @action(detail=True, methods=["post"])
    def reclassify(self, request, pk=None):
        from decimal import Decimal
        from django.db import transaction
        from .serializers import ManualLineInputSerializer
        from .models import JournalLine

        je = self.get_object()
        lines_data = request.data.get("lines")
        if not lines_data:
            raise ValidationError({"lines": "This field is required."})

        serializer = ManualLineInputSerializer(data=lines_data, many=True)
        serializer.is_valid(raise_exception=True)
        validated_lines = serializer.validated_data

        total_d = sum((ln["debit"] for ln in validated_lines), Decimal("0"))
        total_c = sum((ln["credit"] for ln in validated_lines), Decimal("0"))
        if total_d != total_c:
            raise ValidationError({"non_field_errors": f"Unbalanced: debits={total_d} credits={total_c}"})
        if total_d == 0:
            raise ValidationError({"non_field_errors": "Total amount cannot be zero."})

        with transaction.atomic():
            je._assert_period_open()

            je.status = JournalEntry.Status.DRAFT
            je.save(update_fields=["status"])

            je.lines.all().delete()

            for line in validated_lines:
                JournalLine.objects.create(
                    journal_entry=je,
                    account=line["account"],
                    debit=line["debit"],
                    credit=line["credit"],
                    description=line.get("description", ""),
                )

            je.post(user=request.user)

        return Response(JournalEntrySerializer(je).data)


class ManualJournalEntryCreateView(APIView):
    """POST /api/v1/ledger/manual/ — create and post a manual JE in one step."""

    def post(self, request):
        serializer = ManualJournalEntryCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        je = serializer.save()
        return Response(JournalEntrySerializer(je).data, status=status.HTTP_201_CREATED)


class TrialBalanceView(APIView):
    """GET /api/v1/ledger/trial-balance/?company=<id>&as_of=YYYY-MM-DD"""

    def get(self, request):
        company_id = request.query_params.get("company")
        if not company_id:
            raise ValidationError({"company": "required"})
        as_of_str = request.query_params.get("as_of")
        as_of = _date.fromisoformat(as_of_str) if as_of_str else None

        rows = trial_balance(int(company_id), as_of=as_of)
        total_d = sum((r["debit"] for r in rows), start=0)
        total_c = sum((r["credit"] for r in rows), start=0)
        return Response(
            {
                "as_of": as_of_str,
                "rows": TrialBalanceRowSerializer(rows, many=True).data,
                "totals": {"debit": total_d, "credit": total_c},
            }
        )



class AnomalyScanView(APIView):
    """GET /api/v1/ledger/anomalies/?company=&hours=24 — on-demand anomaly scan."""
    def get(self, request):
        company_id = request.query_params.get("company")
        hours = int(request.query_params.get("hours", 24))
        if not company_id:
            raise ValidationError({"company": "required"})
        from .anomaly import detect_anomalies
        anomalies = detect_anomalies(int(company_id), since_hours=hours)
        return Response({"count": len(anomalies), "anomalies": anomalies, "hours_scanned": hours})


class AccountSuggestView(APIView):
    """POST /api/v1/ledger/suggest-account/
    Body: {narration, company_id, amount (optional)}
    Returns up to 3 ranked account suggestions for the given transaction description.
    """

    def post(self, request):
        narration = (request.data.get("narration") or "").strip()
        company_id = request.data.get("company_id")
        amount = request.data.get("amount")

        if not narration:
            raise ValidationError({"narration": "required"})
        if not company_id:
            raise ValidationError({"company_id": "required"})

        from .ai_classify import suggest_account
        suggestions = suggest_account(narration, int(company_id), amount=amount)
        return Response({"narration": narration, "suggestions": suggestions})
