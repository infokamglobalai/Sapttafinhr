"""Talent-intelligence services (Phase 6).

Embedding-based matching (talent pool ↔ JD, similar candidates, internal
mobility), hiring analytics, and JD bias scanning. Reuses the Phase 4 embedding
layer and the existing performance bias word-list.
"""
from __future__ import annotations

from .embeddings import cosine, embed_text, embed_texts
from .scoring import jd_embedding_text


# ── Embedding match helpers ─────────────────────────────────────────────────
def rank_candidates_for_job(job, candidates, limit=50):
    """Rank candidates against a JD by resume↔JD cosine (uses stored embeddings)."""
    jd_vec = job.embedding or embed_text(jd_embedding_text(job))
    if not jd_vec:
        return []
    out = []
    for c in candidates:
        profile = getattr(c, "profile", None)
        vec = profile.embedding if profile else None
        if vec:
            out.append((c, cosine(jd_vec, vec)))
    out.sort(key=lambda t: t[1], reverse=True)
    return out[:limit]


def similar_to_candidate(candidate, pool, limit=10):
    """Nearest-neighbour candidates to `candidate` within `pool` (same tenant)."""
    profile = getattr(candidate, "profile", None)
    base = profile.embedding if profile else None
    if not base:
        return []
    out = []
    for c in pool:
        if c.pk == candidate.pk:
            continue
        p = getattr(c, "profile", None)
        if p and p.embedding:
            out.append((c, cosine(base, p.embedding)))
    out.sort(key=lambda t: t[1], reverse=True)
    return out[:limit]


def employee_embedding_text(emp) -> str:
    """Internal candidates have no resume — embed role + department signal."""
    bits = [emp.full_name]
    if emp.designation_id and emp.designation:
        bits.append(emp.designation.name)
    if emp.department_id and emp.department:
        bits.append(emp.department.name)
    return " · ".join(b for b in bits if b)


def rank_employees_for_job(job, employees, limit=20):
    """Rank internal employees against a JD for internal mobility."""
    jd_vec = job.embedding or embed_text(jd_embedding_text(job))
    if not jd_vec:
        return []
    emps = list(employees)
    vecs = embed_texts([employee_embedding_text(e) for e in emps])
    out = [(e, cosine(jd_vec, v)) for e, v in zip(emps, vecs) if v]
    out.sort(key=lambda t: t[1], reverse=True)
    return out[:limit]


# ── Hiring analytics ────────────────────────────────────────────────────────
def recruitment_analytics(tenant) -> dict:
    """Funnel, source effectiveness, score distribution, and time-to-hire."""
    from django.db.models import Count, Q

    from .models import Candidate, JobApplication, JobOpening

    apps = JobApplication.objects.filter(tenant=tenant)

    funnel_raw = dict(apps.values_list("status").annotate(n=Count("id")))
    funnel = [{"status": s, "count": funnel_raw.get(s, 0)}
              for s, _ in JobApplication.STATUS_CHOICES]

    # Source effectiveness: applications vs hires per candidate source.
    sources = {}
    for row in (apps.values("candidate__source")
                .annotate(total=Count("id"),
                          hired=Count("id", filter=Q(status="hired")))):
        sources[row["candidate__source"] or "unknown"] = {
            "total": row["total"], "hired": row["hired"],
        }

    # Score distribution across scored applications.
    bands = {"Excellent (80-100)": 0, "Good (60-79)": 0, "Average (40-59)": 0, "Poor (0-39)": 0}
    for s in apps.filter(ai_score__isnull=False).values_list("ai_score", flat=True):
        if s >= 80:
            bands["Excellent (80-100)"] += 1
        elif s >= 60:
            bands["Good (60-79)"] += 1
        elif s >= 40:
            bands["Average (40-59)"] += 1
        else:
            bands["Poor (0-39)"] += 1

    # Average days applied → hired (computed in Python — DB-agnostic).
    spans = [(upd - app).days for app, upd in
             apps.filter(status="hired").values_list("applied_at", "updated_at")
             if app and upd]
    tth = (sum(spans) / len(spans)) if spans else None

    return {
        "totals": {
            "openings": JobOpening.objects.filter(tenant=tenant).count(),
            "candidates": Candidate.objects.filter(tenant=tenant).count(),
            "applications": apps.count(),
            "hired": funnel_raw.get("hired", 0),
        },
        "funnel": funnel,
        "sources": sources,
        "score_bands": bands,
        "avg_days_to_hire": round(tth, 1) if tth else None,
    }


# ── JD bias scanning ────────────────────────────────────────────────────────
def scan_jd_bias(job) -> list:
    """Flag biased / coded language in a JD (reuses the performance bias list)."""
    from apps.performance.ai import detect_bias_terms
    text = " ".join(filter(None, [job.title, job.description, job.requirements]))
    return detect_bias_terms(text)
