"""REST API for Automation Rules."""
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.notifications.models import AutomationLog, AutomationRule


class AutomationRuleSerializer(serializers.ModelSerializer):
    last_log = serializers.SerializerMethodField()

    class Meta:
        model = AutomationRule
        fields = [
            "id", "name", "is_active", "trigger", "trigger_filter",
            "action", "action_config", "last_run_at", "run_count",
            "last_log", "created_at",
        ]
        read_only_fields = ["id", "last_run_at", "run_count", "created_at", "last_log"]

    def get_last_log(self, obj):
        log = obj.logs.order_by("-created_at").first()
        if not log:
            return None
        return {"status": log.status, "triggered_by": log.triggered_by, "at": log.created_at.isoformat()}


class AutomationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AutomationRuleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["is_active", "trigger", "action"]

    def get_queryset(self):
        qs = AutomationRule.objects.prefetch_related("logs")
        company = self.request.query_params.get("company")
        if company:
            qs = qs.filter(company_id=company)
        return qs

    def perform_create(self, serializer):
        company_id = self.request.data.get("company")
        serializer.save(company_id=company_id)

    @action(detail=False, methods=["get"])
    def triggers(self, request):
        return Response([
            {"value": t.value, "label": t.label}
            for t in AutomationRule.Trigger
        ])

    @action(detail=False, methods=["get"])
    def actions(self, request):
        return Response([
            {"value": a.value, "label": a.label}
            for a in AutomationRule.Action
        ])

    @action(detail=True, methods=["post"])
    def test_run(self, request, pk=None):
        """Manually trigger this rule right now."""
        rule = self.get_object()
        company_id = rule.company_id
        from .automation_engine import _evaluate_trigger, _fire_action
        from django.utils import timezone
        items = _evaluate_trigger(rule, company_id)
        for item in items:
            _fire_action(rule, item, company_id)
        rule.last_run_at = timezone.now()
        rule.save(update_fields=["last_run_at"])
        return Response({"items_matched": len(items), "items": items[:5]})
