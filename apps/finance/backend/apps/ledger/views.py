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
    filterset_fields = ("company", "fiscal_year", "status", "date")
    search_fields = ("voucher_no", "narration")
    ordering_fields = ("date", "voucher_no")
    ordering = ("-date", "-id")


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
