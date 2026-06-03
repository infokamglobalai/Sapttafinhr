from django.urls import include, path
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from .automation_views import AutomationRuleViewSet

_router = DefaultRouter()
_router.register("automation/rules", AutomationRuleViewSet, basename="automation-rule")


class FinanceAIChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"error": "message required"}, status=400)

        company_id = request.data.get("company_id")
        if not company_id:
            from apps.masters.models import Company
            company = Company.objects.first()
            company_id = company.id if company else None
        if not company_id:
            return Response({"error": "company_id required"}, status=400)

        history = request.data.get("history", [])
        from apps.core.ai_chat import chat
        result = chat(message, int(company_id), request.user, history)
        return Response(result)


urlpatterns = [
    path("finance-chat/", FinanceAIChatView.as_view(), name="finance_ai_chat"),
    path("", include(_router.urls)),
]
