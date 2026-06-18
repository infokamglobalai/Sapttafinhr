"""Explainable-insight helpers for the comparison dashboard (Phase 5).

Pure functions over already-persisted data (JobOpening structured fields +
CandidateProfile.skills + JobApplication scores) — no LLM calls here.
"""
from __future__ import annotations


def _norm(s) -> str:
    return str(s).strip().lower()


def skill_match(required: list, candidate_skills: list) -> dict:
    """Compare a JD's required skills against a candidate's parsed skills.

    Lenient matching (case-insensitive, substring either direction) so "AWS" and
    "AWS (EC2, S3)" count as a hit. Returns matched/missing lists + counts for the
    "matches 9/10 required skills" readout.
    """
    req = [r for r in (required or []) if str(r).strip()]
    cand = [_norm(s) for s in (candidate_skills or []) if str(s).strip()]
    matched, missing = [], []
    for r in req:
        rn = _norm(r)
        hit = any(rn == c or rn in c or c in rn for c in cand)
        (matched if hit else missing).append(r)
    return {
        "matched": matched, "missing": missing,
        "matched_count": len(matched), "total": len(req),
    }


def application_insight(job, app) -> dict:
    """Bundle one application's scores + skill-gap analysis for the dashboard/compare."""
    profile = getattr(app.candidate, "profile", None)
    cand_skills = profile.skills if profile else []
    mandatory = skill_match(job.mandatory_skills, cand_skills)
    preferred = skill_match(job.preferred_skills, cand_skills)
    return {
        "app": app,
        "candidate": app.candidate,
        "profile": profile,
        "mandatory_match": mandatory,
        "preferred_match": preferred,
        "has_score": app.ai_score is not None,
    }


# Order applications: scored first (desc), then unscored by vector similarity,
# then the rest. Used by the ranked dashboard.
def rank_key(app):
    scored = 0 if app.ai_score is not None else 1
    primary = -(app.ai_score if app.ai_score is not None else 0)
    secondary = -(app.vector_similarity if app.vector_similarity is not None else -1)
    return (scored, primary, secondary)
