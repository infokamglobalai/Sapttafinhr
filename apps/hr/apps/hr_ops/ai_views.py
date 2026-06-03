"""HR AI Chat API view."""
import json
from django.http import JsonResponse
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


@method_decorator([login_required, csrf_exempt], name="dispatch")
class AIChatView(View):
    """POST /hr/ai/chat/ — { message, history? } → { reply, actions_taken }"""

    def post(self, request):
        try:
            data = json.loads(request.body.decode())
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        message = (data.get("message") or "").strip()
        if not message:
            return JsonResponse({"error": "message is required"}, status=400)

        history = data.get("history", [])
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return JsonResponse({"error": "No tenant context"}, status=400)

        from .ai_chat import chat
        result = chat(message, tenant, request.user, history)
        return JsonResponse(result)
