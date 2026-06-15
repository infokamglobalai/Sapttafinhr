"""HR AI chat view — session-authenticated endpoint for the manager chatbot."""
from __future__ import annotations

import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View


@method_decorator(login_required, name="dispatch")
class HRAIChatView(View):
    """POST /api/ai/hr-chat/ — manager-level HR assistant.

    Accepts: {message: str, history?: [{role, content}]}
    Returns: {reply: str, actions_taken: list}
    """

    def post(self, request):
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return JsonResponse({"error": "Tenant not found"}, status=400)

        try:
            data = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        message = (data.get("message") or "").strip()
        if not message:
            return JsonResponse({"error": "message is required"}, status=400)

        history = data.get("history") or []

        from apps.ai_chat import chat
        result = chat(message=message, tenant=tenant, user=request.user, history=history)
        return JsonResponse(result)
