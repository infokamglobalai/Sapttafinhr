"""External-integration seams for recruitment (Phase 7).

- Candidate interview-invite email (uses the same EmailMultiAlternatives pattern
  as hr_ops.services.notify, but candidates aren't Users so we email directly).
- ATS push: a pluggable adapter interface. No vendor adapter ships by default —
  configure ATS_PROVIDER + an adapter to enable a real push.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def send_interview_invite(interview) -> bool:
    """Email the candidate their interview details. Returns True if sent."""
    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives

    candidate = interview.application.candidate
    to_email = (candidate.email or "").strip()
    if not to_email:
        return False

    job = interview.application.job_opening
    tenant = interview.tenant
    when = interview.scheduled_at.strftime("%A, %d %B %Y at %H:%M")
    where = interview.location_or_link or "(to be shared)"
    lines = [
        f"Dear {candidate.display_name},",
        "",
        f"You are invited to an interview for the {job.title} position at {tenant.name}.",
        "",
        f"Round: {interview.round_name or 'Interview'}",
        f"When: {when} ({interview.duration_minutes} mins)",
        f"Mode: {interview.get_mode_display()}",
        f"Where / link: {where}",
    ]
    if interview.interviewer:
        lines.append(f"Interviewer: {interview.interviewer}")
    lines += ["", "Please confirm your availability by replying to this email.", "",
              f"Best regards,\n{tenant.name} Talent Team"]
    body = "\n".join(lines)

    try:
        msg = EmailMultiAlternatives(
            subject=f"Interview invitation — {job.title} at {tenant.name}",
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        msg.send(fail_silently=True)
        return True
    except Exception:
        logger.warning("Interview invite email failed for interview %s", interview.id)
        return False


# ── ATS push (stub adapter interface) ───────────────────────────────────────
def push_job_to_ats(job) -> dict:
    """Push a published opening to the configured external ATS.

    Ships as a no-op stub. To enable: set settings.ATS_PROVIDER and register an
    adapter in ATS_ADAPTERS mapping provider → callable(job) -> dict.
    """
    from django.conf import settings
    provider = getattr(settings, "ATS_PROVIDER", "") or ""
    if not provider:
        return {"ok": False, "configured": False,
                "message": "No ATS provider configured. Set ATS_PROVIDER to enable."}

    adapter = (getattr(settings, "ATS_ADAPTERS", {}) or {}).get(provider)
    if not adapter:
        return {"ok": False, "configured": True,
                "message": f"No adapter registered for ATS provider '{provider}'."}
    try:
        result = adapter(job)
        return {"ok": True, "configured": True, "provider": provider, "result": result}
    except Exception as exc:
        logger.exception("ATS push failed for job %s", job.id)
        return {"ok": False, "configured": True, "message": f"ATS push failed: {exc}"}
