"""Celery tasks for recruitment — async resume parsing (Phase 2).

In development CELERY_TASK_ALWAYS_EAGER=True runs these inline; in production a
worker (`celery -A hrms worker`) processes them off the request thread.
"""
import logging
import re

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


def _normalize_phone(phone: str) -> str:
    """Reduce a phone string to its trailing 10 digits for loose matching."""
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits


def _flag_duplicates(candidate, profile) -> None:
    """Flag (never block) this candidate if an earlier one shares email/phone."""
    from .models import Candidate

    email = (candidate.email or "").strip().lower()
    phone = _normalize_phone(candidate.phone)
    if not email and not phone:
        return

    siblings = Candidate.objects.filter(tenant=candidate.tenant).exclude(pk=candidate.pk)
    match = None
    if email:
        match = siblings.filter(email__iexact=email).order_by("created_at").first()
    if not match and phone:
        for c in siblings.exclude(phone="").order_by("created_at"):
            if _normalize_phone(c.phone) == phone:
                match = c
                break
    if match:
        profile.is_duplicate = True
        profile.duplicate_note = f"Possible duplicate of {match.display_name} (#{match.pk})"


@shared_task(bind=True, max_retries=2)
def parse_resume_task(self, candidate_id):
    """Extract + structure a candidate's resume, persisting to CandidateProfile.

    Fills empty Candidate fields (never overwrites manually-entered data) and
    flags likely duplicates by email/phone.
    """
    from .models import Candidate, CandidateProfile
    from .resume_parser import extract_text, parse_resume_text

    try:
        candidate = Candidate.objects.select_related("tenant").get(pk=candidate_id)
    except Candidate.DoesNotExist:
        logger.warning("parse_resume_task: candidate %s gone", candidate_id)
        return {"candidate_id": candidate_id, "status": "missing"}

    profile, _ = CandidateProfile.objects.get_or_create(
        candidate=candidate, defaults={"tenant": candidate.tenant}
    )
    profile.parse_status = "processing"
    profile.save(update_fields=["parse_status"])

    if not candidate.resume:
        profile.parse_status = "failed"
        profile.parse_error = "No resume file attached."
        profile.save(update_fields=["parse_status", "parse_error"])
        return {"candidate_id": candidate_id, "status": "failed"}

    try:
        candidate.resume.open("rb")
        raw = candidate.resume.read()
        candidate.resume.close()
        text = extract_text(raw, candidate.resume.name)
        profile.raw_text = (text or "")[:20000]

        parsed = parse_resume_text(text) if text else {"error": "Empty resume text"}
        if parsed.get("error"):
            profile.parse_status = "failed"
            profile.parse_error = parsed["error"]
            profile.save()
            return {"candidate_id": candidate_id, "status": "failed", "error": parsed["error"]}

        # Persist structured data.
        profile.skills = parsed.get("skills") or []
        profile.education = parsed.get("education") or []
        profile.experience = parsed.get("experience") or []
        profile.certifications = parsed.get("certifications") or []
        profile.summary = parsed.get("summary") or ""

        # Backfill empty candidate fields only.
        _apply_candidate_fields(candidate, parsed)
        _flag_duplicates(candidate, profile)

        # Embed the resume for vector pre-ranking (best-effort; None if unavailable).
        try:
            from .embeddings import embed_text
            from .scoring import candidate_embedding_text
            profile.embedding = embed_text(candidate_embedding_text(profile))
        except Exception:
            logger.exception("Resume embedding failed for candidate %s", candidate_id)

        profile.parse_status = "done"
        profile.parse_error = ""
        profile.parsed_at = timezone.now()
        profile.save()
        return {"candidate_id": candidate_id, "status": "done",
                "is_duplicate": profile.is_duplicate, "embedded": profile.embedding is not None}

    except Exception as exc:
        logger.exception("parse_resume_task failed for candidate %s", candidate_id)
        profile.parse_status = "failed"
        profile.parse_error = str(exc)[:2000]
        profile.save(update_fields=["parse_status", "parse_error"])
        try:
            raise self.retry(exc=exc, countdown=10)
        except self.MaxRetriesExceededError:
            return {"candidate_id": candidate_id, "status": "failed", "error": str(exc)}


def _apply_candidate_fields(candidate, parsed: dict) -> None:
    """Fill only the empty Candidate fields from parsed resume data, then save."""
    changed = []
    name = (parsed.get("full_name") or "").strip()
    if name and not candidate.first_name and not candidate.last_name:
        parts = name.split(None, 1)
        candidate.first_name = parts[0][:100]
        candidate.last_name = (parts[1] if len(parts) > 1 else "")[:100]
        changed += ["first_name", "last_name"]
    for src, dst, cap in [
        ("email", "email", 254), ("phone", "phone", 15),
        ("current_company", "current_company", 255), ("current_role", "current_designation", 255),
    ]:
        val = (parsed.get(src) or "").strip()
        if val and not getattr(candidate, dst):
            setattr(candidate, dst, val[:cap])
            changed.append(dst)
    exp = parsed.get("total_experience_years")
    if exp and candidate.total_experience is None:
        try:
            candidate.total_experience = round(float(exp), 1)
            changed.append("total_experience")
        except (TypeError, ValueError):
            pass
    if changed:
        candidate.save(update_fields=changed)


@shared_task
def embed_job_opening_task(job_opening_id):
    """Compute and store a JD embedding for vector pre-ranking (Phase 4)."""
    from .embeddings import embed_text
    from .models import JobOpening
    from .scoring import jd_embedding_text
    try:
        job = JobOpening.objects.get(pk=job_opening_id)
    except JobOpening.DoesNotExist:
        return {"job_opening_id": job_opening_id, "status": "missing"}
    job.embedding = embed_text(jd_embedding_text(job))
    job.save(update_fields=["embedding"])
    return {"job_opening_id": job_opening_id, "embedded": job.embedding is not None}


@shared_task(bind=True)
def rank_pool_task(self, ranking_job_id, top_n=None):
    """Two-stage pool ranking (Phase 4): cheap vector pre-rank of the whole pool,
    then LLM deep-score of the top N. Progress is tracked on the RankingJob row.
    """
    from django.conf import settings

    from .embeddings import cosine, embed_text
    from .models import JobApplication, RankingJob
    from . import scoring

    try:
        rj = RankingJob.objects.select_related("job_opening").get(pk=ranking_job_id)
    except RankingJob.DoesNotExist:
        return {"ranking_job_id": ranking_job_id, "status": "missing"}

    rj.status = "running"
    rj.save(update_fields=["status", "updated_at"])
    job = rj.job_opening

    try:
        # Ensure the JD has an embedding.
        if not job.embedding:
            job.embedding = embed_text(scoring.jd_embedding_text(job))
            job.save(update_fields=["embedding"])

        apps = list(
            JobApplication.objects.filter(job_opening=job)
            .select_related("candidate", "candidate__profile")
        )

        # Stage 1 — vector pre-rank (cheap, whole pool). Candidates without a
        # resume embedding sort last but are still included.
        jd_vec = job.embedding
        scored = []
        for app in apps:
            profile = getattr(app.candidate, "profile", None)
            sim = cosine(jd_vec, profile.embedding) if (jd_vec and profile and profile.embedding) else -1.0
            if app.vector_similarity != sim:
                app.vector_similarity = sim
                app.save(update_fields=["vector_similarity", "updated_at"])
            scored.append((sim, app))
        scored.sort(key=lambda t: t[0], reverse=True)
        rj.pre_ranked = len(scored)

        # Stage 2 — LLM deep-score only the top N.
        n = int(top_n or getattr(settings, "RANK_DEEP_TOP_N", 20))
        top = [app for _, app in scored[:n]]
        rj.total = len(top)
        rj.done = 0
        rj.save(update_fields=["pre_ranked", "total", "done", "updated_at"])

        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if not api_key:
            rj.status = "failed"
            rj.error = "ANTHROPIC_API_KEY not configured"
            rj.save(update_fields=["status", "error", "updated_at"])
            return {"ranking_job_id": ranking_job_id, "status": "failed", "error": rj.error}

        jd_text = scoring.build_jd_text(job)
        weights = scoring.weights_for(job)
        for app in top:
            sd = scoring.score_candidate(app.candidate, jd_text, weights, api_key)
            scoring.persist_score(app, sd)
            rj.done += 1
            rj.save(update_fields=["done", "updated_at"])

        rj.status = "done"
        rj.save(update_fields=["status", "updated_at"])
        return {"ranking_job_id": ranking_job_id, "status": "done",
                "pre_ranked": rj.pre_ranked, "deep_scored": rj.done}

    except Exception as exc:
        logger.exception("rank_pool_task failed for ranking job %s", ranking_job_id)
        rj.status = "failed"
        rj.error = str(exc)[:2000]
        rj.save(update_fields=["status", "error", "updated_at"])
        return {"ranking_job_id": ranking_job_id, "status": "failed", "error": str(exc)}
