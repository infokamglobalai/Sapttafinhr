"""General Saptta product Q&A assistant — no tools, no live data.

Answers questions about what Saptta HR and fin-saptta can do. Refuses any
request for live company data, personal advice, or out-of-scope topics.
"""
from __future__ import annotations

import json
import logging

from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Saptta AI Assistant — a product guide for the Saptta platform.

═══ YOUR ROLE ═══
You help users understand what Saptta's products can do and how to use them:
• Saptta HR (HRMS) — employee management, attendance, leave, payroll, recruitment, performance
• fin-saptta (Finance) — invoicing, billing, ledger, bank reconciliation, GST, reports

═══ WHAT YOU CAN HELP WITH ═══
• Explain Saptta features and how to navigate them
• Guide users to the right module or product for their task
• Answer general questions about how HRMS or accounting workflows work
• Help users understand billing, plans, and subscription options

═══ WHAT YOU CANNOT DO ═══
• Access any live company data (invoices, employees, balances, etc.) — you have no tools
• For live finance data: "Please use the Finance AI inside fin-saptta for that."
• For live HR data: "Please use the HR Assistant inside Saptta HR for that."
• Provide legal, tax, or investment advice
• Discuss other software products or general topics unrelated to Saptta

Keep answers concise, practical, and friendly. If a user needs live data, always name the specific AI tool they should switch to."""


def _product_chat(request: Request) -> Response:
    """Shared product Q&A handler — no tools, no live data."""
    message = (request.data.get("message") or "").strip()
    if not message:
        return Response({"error": "message is required"}, status=400)

    history = request.data.get("history") or []

    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return Response({"reply": "Saptta AI is not configured.", "actions_taken": []})

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
    except Exception:
        return Response({"reply": "AI service unavailable.", "actions_taken": []})

    messages = list(history)
    messages.append({"role": "user", "content": message})

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=768,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        reply = " ".join(b.text for b in response.content if hasattr(b, "text"))
    except Exception as e:
        logger.exception("General AI chat failed")
        return Response({"reply": f"Sorry, I couldn't respond right now. ({e})", "actions_taken": []})

    return Response({"reply": reply, "actions_taken": []})


class GeneralAIChatView(APIView):
    """POST /api/v1/auth/general-chat/ — product Q&A, no tools (signed-in)."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        return _product_chat(request)


class GuestChatThrottle(AnonRateThrottle):
    """Per-IP cap for the public marketing chatbot; emits HTTP 429 when exceeded."""

    scope = "guest_chat"

    def get_rate(self):  # not config-dependent — fixed guardrail
        return "20/hour"


class GuestAIChatView(APIView):
    """POST /api/v1/auth/guest-chat/ — public product Q&A for marketing visitors."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [GuestChatThrottle]

    def post(self, request: Request) -> Response:
        return _product_chat(request)
