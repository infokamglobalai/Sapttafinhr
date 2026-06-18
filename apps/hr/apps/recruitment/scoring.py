"""Shared resume-scoring logic (Phase 3/4).

Extracted from the view so both the synchronous ResumeRankView and the async
rank_pool_task use one implementation: build JD text, summarize the candidate from
the persisted CandidateProfile, LLM deep-score across four dimensions, apply the
per-opening weights, and persist.
"""
from __future__ import annotations

import json
import logging

from django.utils import timezone

from .ai_utils import band_for_score, parse_llm_json, weighted_overall

logger = logging.getLogger(__name__)


def weights_for(job) -> dict:
    from .models import ScoringWeights
    w = getattr(job, "scoring_weights", None)
    return w.as_dict() if w else dict(ScoringWeights.DEFAULTS)


def build_jd_text(job) -> str:
    parts = [f"Job Title: {job.title}"]
    if job.department_id and job.department:
        parts.append(f"Department: {job.department.name}")
    parts.append(f"Experience Required: {job.experience_min}–{job.experience_max or '+'} years")
    for label, field in [
        ("Mandatory Skills", job.mandatory_skills), ("Preferred Skills", job.preferred_skills),
        ("Qualifications", job.qualifications), ("Certifications", job.certifications),
    ]:
        if field:
            parts.append(f"{label}: {', '.join(field)}")
    if job.description:
        parts.append(f"Description:\n{job.description}")
    if job.requirements:
        parts.append(f"Requirements:\n{job.requirements}")
    return "\n\n".join(parts)


def candidate_summary(candidate) -> str:
    """Prefer the persisted CandidateProfile (Phase 2) — no live re-parse."""
    summary = (
        f"Name: {candidate.display_name}\n"
        f"Current Role: {candidate.current_designation or 'N/A'}\n"
        f"Current Company: {candidate.current_company or 'N/A'}\n"
        f"Total Experience: {candidate.total_experience or 0} years\n"
    )
    profile = getattr(candidate, "profile", None)
    if profile:
        if profile.skills:
            summary += f"Skills: {', '.join(str(s) for s in profile.skills)}\n"
        if profile.certifications:
            summary += f"Certifications: {', '.join(str(c) for c in profile.certifications)}\n"
        if profile.education:
            summary += f"Education: {json.dumps(profile.education)[:800]}\n"
        if profile.raw_text:
            summary += f"\nResume:\n{profile.raw_text[:3500]}"
        elif profile.summary:
            summary += f"\nSummary: {profile.summary}"
    return summary


def jd_embedding_text(job) -> str:
    """Compact text used to embed a JD for vector pre-ranking."""
    bits = [job.title]
    for field in (job.mandatory_skills, job.preferred_skills, job.qualifications,
                  job.certifications, job.keywords, job.competencies):
        if field:
            bits.append(", ".join(str(x) for x in field))
    if job.description:
        bits.append(job.description)
    return "\n".join(b for b in bits if b)[:4000]


def candidate_embedding_text(profile) -> str:
    """Compact text used to embed a candidate resume for vector pre-ranking."""
    bits = []
    if profile.skills:
        bits.append("Skills: " + ", ".join(str(s) for s in profile.skills))
    if profile.certifications:
        bits.append("Certifications: " + ", ".join(str(c) for c in profile.certifications))
    if profile.summary:
        bits.append(profile.summary)
    if profile.raw_text:
        bits.append(profile.raw_text)
    return "\n".join(bits)[:4000]


def _clamp(v):
    try:
        return max(0, min(100, int(round(float(v)))))
    except (TypeError, ValueError):
        return None


def score_candidate(candidate, jd_text: str, weights: dict, api_key: str) -> dict:
    """LLM deep-score a candidate across four dimensions; compute weighted overall."""
    prompt = f"""You are an expert recruiter. Score this candidate against the job description
across four dimensions, each 0-100.

JOB DESCRIPTION:
{jd_text}

CANDIDATE PROFILE:
{candidate_summary(candidate)}

Return ONLY valid JSON with this exact structure:
{{
  "skill_score": <0-100: match on mandatory + preferred skills>,
  "experience_score": <0-100: match on years and relevance of experience>,
  "qualification_score": <0-100: match on education/qualifications>,
  "certification_score": <0-100: match on required/preferred certifications>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "recommendation": "<one sentence hiring recommendation>"
}}

Be objective. Only use information present in the candidate profile. If a dimension
cannot be assessed from the data, score it conservatively rather than guessing high."""

    try:
        import anthropic
        from django.conf import settings
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            max_tokens=640,
            messages=[{"role": "user", "content": prompt}],
        )
        parsed = parse_llm_json(response.content[0].text)
        if not parsed:
            raise ValueError("Empty/invalid scoring response")
    except Exception as e:
        logger.exception("Resume scoring failed for candidate %s", candidate.id)
        return {
            "score": 0, "band": "Error", "recommendation": f"Scoring failed: {e}",
            "skill_score": None, "experience_score": None,
            "qualification_score": None, "certification_score": None,
            "strengths": [], "gaps": [], "score_breakdown": {},
        }

    subs = {
        "skill": _clamp(parsed.get("skill_score")),
        "experience": _clamp(parsed.get("experience_score")),
        "qualification": _clamp(parsed.get("qualification_score")),
        "certification": _clamp(parsed.get("certification_score")),
    }
    overall = weighted_overall(subs, weights)
    return {
        "score": overall,
        "band": band_for_score(overall),
        "recommendation": str(parsed.get("recommendation", ""))[:500],
        "skill_score": subs["skill"],
        "experience_score": subs["experience"],
        "qualification_score": subs["qualification"],
        "certification_score": subs["certification"],
        "strengths": parsed.get("strengths") or [],
        "gaps": parsed.get("gaps") or [],
        "score_breakdown": {"subscores": subs, "weights": weights, "overall": overall},
    }


def persist_score(app, sd: dict) -> None:
    """Write a score dict onto a JobApplication."""
    app.ai_score = sd["score"]
    app.ai_band = sd["band"]
    app.ai_recommendation = sd["recommendation"]
    app.skill_score = sd["skill_score"]
    app.experience_score = sd["experience_score"]
    app.qualification_score = sd["qualification_score"]
    app.certification_score = sd["certification_score"]
    app.strengths = sd["strengths"]
    app.gaps = sd["gaps"]
    app.score_breakdown = sd["score_breakdown"]
    app.ai_ranked_at = timezone.now()
    app.save(update_fields=[
        "ai_score", "ai_band", "ai_recommendation", "ai_ranked_at",
        "skill_score", "experience_score", "qualification_score", "certification_score",
        "strengths", "gaps", "score_breakdown", "updated_at",
    ])
