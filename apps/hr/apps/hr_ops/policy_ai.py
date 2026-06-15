"""Policy Q&A — answers from tenant-uploaded HR policy documents."""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def get_policy_context(tenant, max_chars: int = 12000) -> str:
    from .models import PolicyDocument

    docs = PolicyDocument.objects.filter(tenant=tenant, is_active=True).order_by("title")
    if not docs.exists():
        return ""

    parts = []
    total = 0
    for doc in docs:
        chunk = f"## {doc.title}\n{doc.body.strip()}\n"
        if total + len(chunk) > max_chars:
            remaining = max_chars - total
            if remaining > 200:
                parts.append(chunk[:remaining] + "\n...[truncated]")
            break
        parts.append(chunk)
        total += len(chunk)
    return "\n\n".join(parts)


def answer_policy_question(tenant, question: str) -> str:
    """Answer a policy question using uploaded policy documents."""
    from django.conf import settings

    context = get_policy_context(tenant)
    if not context:
        return (
            "No HR policy documents are uploaded yet. "
            "Ask your HR admin to add policies under HR → Policies."
        )

    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return "Policy assistant requires ANTHROPIC_API_KEY to be configured."

    prompt = f"""You are the HR policy assistant for {tenant.name}.
Answer ONLY from the policy documents below. If the answer is not in the documents, say so clearly
and suggest the employee contact HR directly. Do not invent policies.

POLICY DOCUMENTS:
{context}

EMPLOYEE QUESTION:
{question}

Give a concise, friendly answer in plain language. Cite the policy title when relevant."""

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        return " ".join(b.text for b in response.content if hasattr(b, "text"))
    except Exception:
        logger.exception("Policy Q&A failed")
        return "Sorry, I couldn't answer that right now. Please try again or contact HR."
