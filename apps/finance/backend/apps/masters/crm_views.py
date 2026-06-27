"""CRM lite API — sales leads on Parties."""
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .crm_serializers import (
    LeadActivityCreateSerializer,
    LeadActivitySerializer,
    SalesLeadSerializer,
    SalesLeadWriteSerializer,
)
from .crm_services import OPEN_STAGES, ensure_party_for_lead, move_lead_stage, pipeline_summary
from .models import SalesLead

PIPELINE_STAGES = [s.value for s in SalesLead.Stage]


class SalesLeadViewSet(viewsets.ModelViewSet):
    queryset = SalesLead.objects.select_related("party").annotate(
        activity_count=Count("activities")
    ).all()
    filterset_fields = ("company", "stage", "party")
    search_fields = ("title", "contact_name", "organization", "email", "phone")
    ordering = ("-updated_at",)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return SalesLeadWriteSerializer
        return SalesLeadSerializer

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        lead = ser.save()
        lead = self.get_queryset().get(pk=lead.pk)
        return Response(SalesLeadSerializer(lead).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        lead = self.get_object()
        ser = self.get_serializer(lead, data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        ser.save()
        lead = self.get_queryset().get(pk=lead.pk)
        return Response(SalesLeadSerializer(lead).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def pipeline(self, request):
        company_id = request.query_params.get("company")
        if not company_id:
            return Response({"detail": "company query param required"}, status=400)
        buckets = {s: [] for s in PIPELINE_STAGES}
        for lead in self.filter_queryset(
            self.get_queryset().filter(company_id=company_id)
        ):
            buckets.setdefault(lead.stage, []).append(SalesLeadSerializer(lead).data)
        stages = [{"key": s, "count": len(buckets[s]), "leads": buckets[s]} for s in PIPELINE_STAGES]
        return Response({"stages": stages, "summary": pipeline_summary(company_id)})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        company_id = request.query_params.get("company")
        if not company_id:
            return Response({"detail": "company query param required"}, status=400)
        return Response(pipeline_summary(company_id))

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        lead = self.get_object()
        new_stage = request.data.get("stage")
        if new_stage not in PIPELINE_STAGES:
            return Response({"detail": "Invalid stage"}, status=400)
        move_lead_stage(lead, new_stage)
        return Response(SalesLeadSerializer(lead).data)

    @action(detail=True, methods=["post"], url_path="move-api")
    def move_api(self, request, pk=None):
        """JSON API for kanban drag-and-drop."""
        lead = self.get_object()
        new_stage = request.data.get("stage")
        if new_stage not in PIPELINE_STAGES:
            return Response({"error": "Invalid stage"}, status=400)
        move_lead_stage(lead, new_stage)
        return Response({"ok": True, "lead_id": lead.id, "stage": lead.stage})

    @action(detail=True, methods=["post"], url_path="create-party")
    def create_party(self, request, pk=None):
        lead = self.get_object()
        try:
            party = ensure_party_for_lead(lead)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        lead.refresh_from_db()
        return Response({
            "party_id": party.id,
            "party_name": party.name,
            "lead": SalesLeadSerializer(lead).data,
        })

    @action(detail=True, methods=["get", "post"])
    def activities(self, request, pk=None):
        lead = self.get_object()
        if request.method == "GET":
            qs = lead.activities.select_related("created_by").all()[:50]
            return Response(LeadActivitySerializer(qs, many=True).data)
        ser = LeadActivityCreateSerializer(data=request.data, context={"lead": lead, "request": request})
        ser.is_valid(raise_exception=True)
        act = ser.save()
        return Response(LeadActivitySerializer(act).data, status=status.HTTP_201_CREATED)
