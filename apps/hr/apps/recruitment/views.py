"""Recruitment (ATS) — job openings, candidates, and an applicant pipeline.

Server-rendered to match the rest of HR. Admin-facing (gated by is_hr_admin where
it mutates). Mirrors the leaves/employees view conventions.
"""
import json

from django.contrib import messages
from utils.access import can_generate_letters, perm_required
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.employees.models import Department, Designation, OfficeLocation
from apps.employees.services import EmployeeEmailInUse
from apps.tenants.limits import EmployeeLimitExceeded

from .models import Candidate, JDTemplate, JobApplication, JobOpening, RankingJob, ScoringWeights

PIPELINE = ["applied", "screening", "interview", "offer", "hired", "rejected"]

# Structured JD components captured as comma/newline separated text inputs.
JD_LIST_FIELDS = [
    "mandatory_skills", "preferred_skills", "qualifications",
    "certifications", "keywords", "competencies",
]


def _record_resume_version(candidate):
    """Snapshot a candidate's current resume file as a new ResumeVersion (Phase 7)."""
    from django.core.files.base import ContentFile

    from .models import ResumeVersion
    if not candidate.resume:
        return
    last = ResumeVersion.objects.filter(candidate=candidate).order_by("-version").first()
    next_version = (last.version + 1) if last else 1
    try:
        candidate.resume.open("rb")
        data = candidate.resume.read()
        candidate.resume.close()
        rv = ResumeVersion(tenant=candidate.tenant, candidate=candidate, version=next_version)
        rv.file.save(candidate.resume.name.split("/")[-1], ContentFile(data), save=True)
    except Exception:
        pass


def _parse_list(raw: str) -> list:
    """Split a comma/newline separated string into a clean, de-duplicated list."""
    if not raw:
        return []
    items, seen = [], set()
    for chunk in raw.replace("\n", ",").split(","):
        val = chunk.strip()
        key = val.lower()
        if val and key not in seen:
            seen.add(key)
            items.append(val)
    return items


# ── Job openings ────────────────────────────────────────────────────────────
@perm_required("recruitment.manage")
def job_list(request):
    tenant = request.tenant
    qs = JobOpening.objects.filter(tenant=tenant).select_related("department", "designation")
    status = request.GET.get("status", "")
    search = request.GET.get("q", "")
    if status:
        qs = qs.filter(status=status)
    if search:
        qs = qs.filter(title__icontains=search)
    qs = qs.annotate(applicant_count=Count("applications")).order_by("-created_at")

    page = Paginator(qs, 20).get_page(request.GET.get("page"))
    total_applications = JobApplication.objects.filter(tenant=tenant).count()
    in_pipeline = JobApplication.objects.filter(
        tenant=tenant, status__in=["applied", "screening", "interview", "offer"]
    ).count()
    ctx = {
        "page_obj": page, "status": status, "search": search,
        "status_choices": JobOpening.STATUS_CHOICES,
        "open_count": JobOpening.objects.filter(tenant=tenant, status="published").count(),
        "total_applications": total_applications,
        "in_pipeline": in_pipeline,
    }
    return render(request, "recruitment/job_list.html", ctx)


@perm_required("recruitment.manage")
def job_create(request):
    tenant = request.tenant
    if request.method == "POST":
        p = request.POST
        try:
            structured = {f: _parse_list(p.get(f, "")) for f in JD_LIST_FIELDS}
            job = JobOpening.objects.create(
                tenant=tenant,
                title=p.get("title", "").strip(),
                department_id=p.get("department") or None,
                designation_id=p.get("designation") or None,
                location_id=p.get("location") or None,
                employment_type=p.get("employment_type", "full_time"),
                positions_count=max(1, min(9999, int(p.get("positions_count") or 1))),
                experience_min=int(p.get("experience_min") or 0),
                experience_max=int(p.get("experience_max")) if p.get("experience_max") else None,
                description=p.get("description", ""),
                requirements=p.get("requirements", ""),
                status=p.get("status", "draft"),
                created_by=request.user,
                **structured,
            )
            # Embed the JD for vector pre-ranking (eager in dev).
            from .tasks import embed_job_opening_task
            embed_job_opening_task.delay(job.id)
            if p.get("save_as_template") and p.get("template_name", "").strip():
                JDTemplate.objects.update_or_create(
                    tenant=tenant, name=p["template_name"].strip(),
                    defaults={
                        "title": job.title,
                        "department_id": job.department_id,
                        "designation_id": job.designation_id,
                        "employment_type": job.employment_type,
                        "experience_min": job.experience_min,
                        "experience_max": job.experience_max,
                        "description": job.description,
                        "requirements": job.requirements,
                        "created_by": request.user,
                        **structured,
                    },
                )
            messages.success(request, "Job opening created.")
            return redirect("recruitment:job_list")
        except Exception as e:  # noqa: BLE001
            messages.error(request, f"Could not create: {e}")

    ctx = {
        "departments": Department.objects.filter(tenant=tenant, is_active=True),
        "designations": Designation.objects.filter(tenant=tenant),
        "locations": OfficeLocation.objects.filter(tenant=tenant),
        "employment_types": ["full_time", "part_time", "contract", "intern"],
        "jd_templates": JDTemplate.objects.filter(tenant=tenant),
    }
    return render(request, "recruitment/job_form.html", ctx)


@perm_required("recruitment.manage")
def jd_template_load(request, pk):
    """Return a saved JD template as JSON so the form can populate itself."""
    tpl = get_object_or_404(JDTemplate, pk=pk, tenant=request.tenant)
    return JsonResponse({
        "title": tpl.title,
        "department_id": tpl.department_id,
        "designation_id": tpl.designation_id,
        "employment_type": tpl.employment_type,
        "experience_min": tpl.experience_min,
        "experience_max": tpl.experience_max,
        "description": tpl.description,
        "requirements": tpl.requirements,
        **{f: getattr(tpl, f) for f in JD_LIST_FIELDS},
    })


@perm_required("recruitment.manage")
def job_detail(request, pk):
    tenant = request.tenant
    job = get_object_or_404(JobOpening, pk=pk, tenant=tenant)
    buckets = {s: [] for s in PIPELINE}
    applications = list(
        JobApplication.objects.filter(job_opening=job)
        .select_related("candidate", "candidate__profile")
        .order_by("-applied_at")
    )
    offer_drafts = {}
    if applications:
        from apps.hr_ops.models import HRLetter

        for letter in (
            HRLetter.objects.filter(
                tenant=tenant,
                job_application_id__in=[a.pk for a in applications],
                letter_type="offer",
                is_deleted=False,
            )
            .order_by("-generated_at")
        ):
            offer_drafts.setdefault(letter.job_application_id, letter)

    for app in applications:
        app.offer_draft = offer_drafts.get(app.pk)
        buckets.setdefault(app.status, []).append(app)
    # Template-friendly: ordered list of stages (no custom filter needed).
    stages = [{"key": s, "count": len(buckets[s]), "apps": buckets[s]} for s in PIPELINE]
    from django.conf import settings
    weights = getattr(job, "scoring_weights", None)
    from . import talent
    ctx = {
        "job": job, "stages": stages, "pipeline": PIPELINE,
        "weights": weights.as_dict() if weights else dict(ScoringWeights.DEFAULTS),
        "bias_flags": talent.scan_jd_bias(job),
        "ats_configured": bool(getattr(settings, "ATS_PROVIDER", "")),
        "can_create_offer_letters": can_generate_letters(request.user),
    }
    return render(request, "recruitment/job_detail.html", ctx)


@perm_required("recruitment.manage")
@require_POST
def edit_scoring_weights(request, pk):
    """Set per-opening scoring weights (Phase 3). Used to re-tune AI ranking."""
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    p = request.POST

    def _w(key, default):
        try:
            return max(0, min(100, int(p.get(key, default))))
        except (TypeError, ValueError):
            return default

    d = ScoringWeights.DEFAULTS
    ScoringWeights.objects.update_or_create(
        job_opening=job,
        defaults={
            "tenant": request.tenant,
            "skill_weight": _w("skill_weight", d["skill"]),
            "experience_weight": _w("experience_weight", d["experience"]),
            "qualification_weight": _w("qualification_weight", d["qualification"]),
            "certification_weight": _w("certification_weight", d["certification"]),
        },
    )
    messages.success(request, "Scoring weights updated — re-run AI ranking to apply.")
    return redirect("recruitment:job_detail", pk=pk)


@perm_required("recruitment.manage")
@require_POST
def job_publish(request, pk):
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    job.status = "published"
    job.published_at = timezone.now()
    job.save(update_fields=["status", "published_at"])
    messages.success(request, f"“{job.title}” is now published.")
    return redirect("recruitment:job_detail", pk=pk)


@perm_required("recruitment.manage")
@require_POST
def job_close(request, pk):
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    job.status = "closed"
    job.save(update_fields=["status"])
    messages.success(request, f"“{job.title}” closed.")
    return redirect("recruitment:job_detail", pk=pk)


# ── Candidates / applications ───────────────────────────────────────────────
@perm_required("recruitment.manage")
def add_applicant(request, pk):
    """Add a candidate + application to a job in one step."""
    tenant = request.tenant
    job = get_object_or_404(JobOpening, pk=pk, tenant=tenant)
    if request.method == "POST":
        p = request.POST
        resume_file = request.FILES.get("resume")
        if resume_file:
            from django.core.exceptions import ValidationError as _VErr
            from utils.uploads import RESUME_EXTS, validate_upload
            try:
                validate_upload(resume_file, allowed_exts=RESUME_EXTS, max_mb=10)
            except _VErr as exc:
                messages.error(request, exc.messages[0] if exc.messages else "Invalid resume file.")
                return render(request, "recruitment/applicant_form.html", {"job": job})
        cand = Candidate.objects.create(
            tenant=tenant,
            first_name=p.get("first_name", "").strip(),
            last_name=p.get("last_name", "").strip(),
            email=p.get("email", "").strip(),
            phone=p.get("phone", "").strip(),
            current_company=p.get("current_company", "").strip(),
            current_designation=p.get("current_designation", "").strip(),
            expected_ctc=p.get("expected_ctc") or None,
            total_experience=p.get("total_experience") or None,
            resume=resume_file,
            source=p.get("source", "direct"),
        )
        JobApplication.objects.create(tenant=tenant, job_opening=job, candidate=cand, status="applied")
        if resume_file:
            _record_resume_version(cand)
            # Parse asynchronously (eager in dev) — backfills empty fields + flags dupes.
            from .tasks import parse_resume_task
            parse_resume_task.delay(cand.id)
            cand.refresh_from_db()
        messages.success(request, f"{cand.display_name} added to the pipeline.")
        return redirect("recruitment:job_detail", pk=pk)
    return render(request, "recruitment/applicant_form.html", {"job": job})


@perm_required("recruitment.manage")
@require_POST
def bulk_upload(request, pk):
    """Bulk-upload many resumes to one opening; each is parsed in the background."""
    tenant = request.tenant
    job = get_object_or_404(JobOpening, pk=pk, tenant=tenant)
    files = request.FILES.getlist("resumes")
    if not files:
        messages.error(request, "No resumes selected.")
        return redirect("recruitment:job_detail", pk=pk)

    from django.core.exceptions import ValidationError as _VErr
    from utils.uploads import RESUME_EXTS, validate_upload
    from .tasks import parse_resume_task

    created, skipped = 0, []
    for f in files:
        try:
            validate_upload(f, allowed_exts=RESUME_EXTS, max_mb=10)
        except _VErr as exc:
            skipped.append(f"{f.name}: {exc.messages[0] if exc.messages else 'invalid'}")
            continue
        cand = Candidate.objects.create(tenant=tenant, resume=f, source="bulk_upload")
        JobApplication.objects.create(tenant=tenant, job_opening=job, candidate=cand, status="applied")
        _record_resume_version(cand)
        parse_resume_task.delay(cand.id)
        created += 1

    if created:
        messages.success(request, f"{created} resume(s) uploaded — parsing in the background.")
    if skipped:
        messages.warning(request, "Skipped: " + "; ".join(skipped[:5]) + ("…" if len(skipped) > 5 else ""))
    return redirect("recruitment:job_detail", pk=pk)


@perm_required("recruitment.manage")
@require_POST
def convert_to_employee(request, pk):
    """Create employee from a hired application and start onboarding."""
    app = get_object_or_404(
        JobApplication.objects.select_related("candidate", "job_opening"),
        pk=pk,
        tenant=request.tenant,
    )
    if app.status != "hired":
        messages.error(request, "Move the candidate to Hired before converting to employee.")
        return redirect("recruitment:job_detail", pk=app.job_opening_id)

    from .services import convert_hired_application

    try:
        emp = convert_hired_application(app, created_by=request.user)
    except EmployeeLimitExceeded as exc:
        from apps.tenants.seat_alerts import notify_owners_add_blocked

        notify_owners_add_blocked(request.tenant)
        messages.error(request, str(exc))
        return redirect("recruitment:job_detail", pk=app.job_opening_id)
    except EmployeeEmailInUse as exc:
        messages.error(request, str(exc))
        return redirect("recruitment:job_detail", pk=app.job_opening_id)
    messages.success(request, f"{emp.full_name} added as {emp.employee_code}. Onboarding started.")
    return redirect("employees:detail", pk=emp.pk)


@perm_required("recruitment.manage")
@require_POST
def create_offer_hr_draft(request, pk):
    """Create HR offer letter draft from a recruitment application (template-based)."""
    if not can_generate_letters(request.user):
        messages.error(request, "You need Generate HR letters permission for this action.")
        return redirect("recruitment:job_detail", pk=get_object_or_404(
            JobApplication, pk=pk, tenant=request.tenant
        ).job_opening_id)

    app = get_object_or_404(
        JobApplication.objects.select_related("candidate", "job_opening", "job_opening__department"),
        pk=pk,
        tenant=request.tenant,
    )
    if app.status not in ("interview", "offer", "hired"):
        messages.error(request, "Move the candidate to Interview or Offer stage first.")
        return redirect("recruitment:job_detail", pk=app.job_opening_id)

    from apps.hr_ops.recruitment_offer_bridge import create_recruitment_offer_draft

    try:
        letter = create_recruitment_offer_draft(
            app,
            request.user,
            salary=request.POST.get("salary", "").strip(),
            joining_date=request.POST.get("joining_date", "").strip(),
            use_ai_body=False,
        )
    except ValueError as exc:
        messages.error(request, str(exc))
        return redirect("recruitment:job_detail", pk=app.job_opening_id)

    messages.success(request, f"Offer letter draft created for {app.candidate.display_name}.")
    return redirect("hr_ops:letter_edit_draft", pk=letter.pk)


@perm_required("recruitment.manage")
@require_POST
def move_application(request, pk):
    """Move an application to a new pipeline stage."""
    app = get_object_or_404(
        JobApplication.objects.select_related("job_opening"), pk=pk, tenant=request.tenant
    )
    new_status = request.POST.get("status")
    if new_status in dict(JobApplication.STATUS_CHOICES):
        app.status = new_status
        app.save(update_fields=["status", "updated_at"])
        messages.success(request, f"Moved {app.candidate.first_name} to {new_status}.")
    return redirect("recruitment:job_detail", pk=app.job_opening_id)


@perm_required("recruitment.manage")
@require_POST
def move_application_api(request, pk):
    """JSON API for kanban drag-and-drop stage changes."""
    app = get_object_or_404(
        JobApplication.objects.select_related("job_opening"), pk=pk, tenant=request.tenant
    )
    try:
        data = json.loads(request.body.decode())
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    new_status = data.get("status")
    if new_status not in dict(JobApplication.STATUS_CHOICES):
        return JsonResponse({"error": "Invalid status"}, status=400)
    app.status = new_status
    app.save(update_fields=["status", "updated_at"])
    return JsonResponse({"ok": True, "application_id": app.id, "status": app.status})


# ── Async pool ranking (Phase 4) ────────────────────────────────────────────
@perm_required("recruitment.manage")
@require_POST
def start_pool_ranking(request, pk):
    """Kick off two-stage pool ranking (vector pre-rank → LLM deep-score top N)."""
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    rj = RankingJob.objects.create(tenant=request.tenant, job_opening=job, created_by=request.user)
    from .tasks import rank_pool_task
    rank_pool_task.delay(rj.id)  # eager in dev — may already be done by the time we poll
    rj.refresh_from_db()
    return JsonResponse({"ranking_job_id": rj.id, **rj.as_dict()})


@perm_required("recruitment.manage")
def ranking_progress(request, pk, job_id):
    """Poll a RankingJob's progress."""
    rj = get_object_or_404(RankingJob, pk=job_id, job_opening_id=pk, tenant=request.tenant)
    return JsonResponse(rj.as_dict())


# ── Comparison dashboard & insights (Phase 5) ───────────────────────────────
SORT_FIELDS = {
    "overall": "ai_score", "skill": "skill_score", "experience": "experience_score",
    "qualification": "qualification_score", "certification": "certification_score",
}


@perm_required("recruitment.manage")
def dashboard(request, pk):
    """Ranked candidate dashboard for one opening — scores, sub-scores, skill gaps."""
    from . import insights
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    apps = list(
        JobApplication.objects.filter(job_opening=job)
        .select_related("candidate", "candidate__profile")
    )

    sort = request.GET.get("sort", "overall")
    if sort in SORT_FIELDS and sort != "overall":
        field = SORT_FIELDS[sort]
        apps.sort(key=lambda a: (getattr(a, field) is None, -(getattr(a, field) or 0)))
    else:
        sort = "overall"
        apps.sort(key=insights.rank_key)

    rows = [insights.application_insight(job, a) for a in apps]
    weights = getattr(job, "scoring_weights", None)
    ctx = {
        "job": job, "rows": rows, "sort": sort,
        "sort_cols": [("overall", "Overall"), ("skill", "Skills"), ("experience", "Exp"),
                      ("qualification", "Quals"), ("certification", "Certs")],
        "ranked_count": sum(1 for a in apps if a.ai_score is not None),
        "weights": weights.as_dict() if weights else dict(ScoringWeights.DEFAULTS),
    }
    return render(request, "recruitment/dashboard.html", ctx)


@perm_required("recruitment.manage")
def compare(request, pk):
    """Side-by-side comparison of selected candidates (?ids=1,2,3)."""
    from . import insights
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    raw = request.GET.get("ids", "")
    ids = [int(x) for x in raw.split(",") if x.strip().isdigit()]
    apps = list(
        JobApplication.objects.filter(job_opening=job, pk__in=ids)
        .select_related("candidate", "candidate__profile")
    )
    apps.sort(key=insights.rank_key)
    rows = [insights.application_insight(job, a) for a in apps]
    dims = [("Skill match", "skill_score"), ("Experience match", "experience_score"),
            ("Qualification match", "qualification_score"), ("Certification match", "certification_score")]
    score_rows = [{"label": label, "values": [getattr(r["app"], attr) for r in rows]}
                  for label, attr in dims]
    return render(request, "recruitment/compare.html",
                  {"job": job, "rows": rows, "score_rows": score_rows})


@perm_required("recruitment.manage")
@require_POST
def shortlist_top(request, pk):
    """Move the top-N AI-scored candidates into the 'screening' stage."""
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    try:
        n = max(1, min(50, int(request.POST.get("n", 5))))
    except (TypeError, ValueError):
        n = 5
    top = (JobApplication.objects.filter(job_opening=job, ai_score__isnull=False,
                                         status="applied")
           .order_by("-ai_score")[:n])
    ids = [a.id for a in top]
    moved = JobApplication.objects.filter(pk__in=ids).update(status="screening")
    messages.success(request, f"Shortlisted {moved} candidate(s) into Screening.")
    return redirect("recruitment:dashboard", pk=pk)


@perm_required("recruitment.manage")
@require_POST
def add_tag(request, pk):
    """Add or remove a recruiter tag on an application (JSON)."""
    app = get_object_or_404(
        JobApplication.objects.select_related("job_opening"), pk=pk, tenant=request.tenant
    )
    try:
        data = json.loads(request.body.decode())
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    tags = list(app.tags or [])
    add = (data.get("tag") or "").strip()[:40]
    remove = (data.get("remove") or "").strip()
    if add and add not in tags:
        tags.append(add)
    if remove and remove in tags:
        tags.remove(remove)
    app.tags = tags
    app.save(update_fields=["tags", "updated_at"])
    return JsonResponse({"ok": True, "tags": tags})


# ── Talent intelligence (Phase 6) ───────────────────────────────────────────
@perm_required("recruitment.manage")
def talent_pools(request):
    """List + create reusable candidate pools."""
    from .models import TalentPool
    tenant = request.tenant
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        if name:
            TalentPool.objects.get_or_create(
                tenant=tenant, name=name,
                defaults={"description": request.POST.get("description", "").strip(),
                          "created_by": request.user},
            )
            messages.success(request, f"Pool “{name}” ready.")
        return redirect("recruitment:talent_pools")
    pools = (TalentPool.objects.filter(tenant=tenant)
             .annotate(member_count=Count("candidates")))
    return render(request, "recruitment/talent_pools.html", {"pools": pools})


@perm_required("recruitment.manage")
def talent_pool_detail(request, pk):
    from .models import TalentPool
    tenant = request.tenant
    pool = get_object_or_404(TalentPool, pk=pk, tenant=tenant)
    members = pool.candidates.select_related("profile").all()
    member_ids = {c.id for c in members}
    candidates = Candidate.objects.filter(tenant=tenant).exclude(id__in=member_ids)[:200]
    openings = JobOpening.objects.filter(tenant=tenant).order_by("-created_at")
    return render(request, "recruitment/talent_pool_detail.html", {
        "pool": pool, "members": members, "candidates": candidates, "openings": openings,
    })


@perm_required("recruitment.manage")
@require_POST
def pool_add_candidate(request, pk):
    from .models import TalentPool
    pool = get_object_or_404(TalentPool, pk=pk, tenant=request.tenant)
    cand_id = request.POST.get("candidate")
    cand = Candidate.objects.filter(pk=cand_id, tenant=request.tenant).first()
    if cand:
        pool.candidates.add(cand)
        messages.success(request, f"Added {cand.display_name} to {pool.name}.")
    return redirect("recruitment:talent_pool_detail", pk=pk)


@perm_required("recruitment.manage")
def pool_match(request, pk):
    """Rank a pool's candidates against a chosen JD (embedding similarity)."""
    from . import talent
    from .models import TalentPool
    pool = get_object_or_404(TalentPool, pk=pk, tenant=request.tenant)
    job = get_object_or_404(JobOpening, pk=request.GET.get("job"), tenant=request.tenant)
    ranked = talent.rank_candidates_for_job(job, pool.candidates.select_related("profile").all())
    results = [{
        "name": c.display_name, "subtitle": c.current_designation or c.email or "—",
        "similarity": round(sim * 100), "link": None,
    } for c, sim in ranked]
    return render(request, "recruitment/match_results.html", {
        "title": f"{pool.name} → {job.title}",
        "subtitle": "Candidates ranked by semantic match to the job description",
        "results": results, "back_url": reverse("recruitment:talent_pool_detail", args=[pk]),
        "empty_hint": "No candidates with parsed resumes in this pool yet.",
    })


@perm_required("recruitment.manage")
def similar_candidates(request, pk):
    """Find candidates similar to a given one (nearest neighbour by resume embedding)."""
    from . import talent
    tenant = request.tenant
    candidate = get_object_or_404(Candidate.objects.select_related("profile"), pk=pk, tenant=tenant)
    pool = Candidate.objects.filter(tenant=tenant).select_related("profile")
    ranked = talent.similar_to_candidate(candidate, pool)
    results = [{
        "name": c.display_name, "subtitle": c.current_designation or c.email or "—",
        "similarity": round(sim * 100), "link": None,
    } for c, sim in ranked]
    return render(request, "recruitment/match_results.html", {
        "title": f"Similar to {candidate.display_name}",
        "subtitle": "Candidates with the most similar resume profile",
        "results": results, "back_url": reverse("recruitment:job_list"),
        "empty_hint": "No similar candidates found (needs parsed resumes).",
    })


@perm_required("recruitment.manage")
def internal_matches(request, pk):
    """Rank active internal employees against a JD for internal mobility."""
    from apps.employees.models import Employee
    from . import talent
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    employees = (Employee.objects.filter(tenant=request.tenant, is_active=True,
                                          employment_status__in=["active", "notice_period"])
                 .select_related("designation", "department"))
    ranked = talent.rank_employees_for_job(job, employees)
    results = [{
        "name": e.full_name,
        "subtitle": (e.designation.name if e.designation else "—") +
                    (f" · {e.department.name}" if e.department else ""),
        "similarity": round(sim * 100), "link": None,
    } for e, sim in ranked]
    return render(request, "recruitment/match_results.html", {
        "title": f"Internal candidates for {job.title}",
        "subtitle": "Existing employees ranked by fit for internal mobility",
        "results": results, "back_url": reverse("recruitment:job_detail", args=[pk]),
        "empty_hint": "No internal matches (embeddings unavailable or no active employees).",
    })


@perm_required("recruitment.manage")
def recruitment_analytics(request):
    """Hiring funnel, source effectiveness, score distribution, time-to-hire."""
    from . import talent
    data = talent.recruitment_analytics(request.tenant)
    return render(request, "recruitment/analytics.html", {"a": data})


# ── Workflow & integrations (Phase 7) ───────────────────────────────────────
@perm_required("recruitment.manage")
def interviews(request, pk):
    """Interview schedule for one opening + a scheduling form."""
    from .models import Interview
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    upcoming = (Interview.objects.filter(application__job_opening=job)
                .select_related("application__candidate").order_by("scheduled_at"))
    applicants = (JobApplication.objects.filter(job_opening=job)
                  .exclude(status__in=["rejected", "withdrawn"])
                  .select_related("candidate"))
    return render(request, "recruitment/interviews.html", {
        "job": job, "interviews": upcoming, "applicants": applicants,
        "modes": Interview.MODE_CHOICES,
    })


@perm_required("recruitment.manage")
@require_POST
def schedule_interview(request, pk):
    """Create an interview for an application (and optionally email the candidate)."""
    from django.utils.dateparse import parse_datetime

    from .integrations import send_interview_invite
    from .models import Interview
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    p = request.POST
    app = get_object_or_404(JobApplication, pk=p.get("application"),
                            job_opening=job, tenant=request.tenant)
    when = parse_datetime(p.get("scheduled_at", ""))
    if when is None:
        messages.error(request, "Please provide a valid date and time.")
        return redirect("recruitment:interviews", pk=pk)
    if timezone.is_naive(when):
        when = timezone.make_aware(when, timezone.get_current_timezone())

    iv = Interview.objects.create(
        tenant=request.tenant, application=app,
        round_name=p.get("round_name", "").strip(),
        scheduled_at=when,
        duration_minutes=int(p.get("duration_minutes") or 45),
        mode=p.get("mode", "video"),
        location_or_link=p.get("location_or_link", "").strip(),
        interviewer=p.get("interviewer", "").strip(),
        created_by=request.user,
    )
    # Move the application into the interview stage if earlier.
    if app.status in ("applied", "screening"):
        app.status = "interview"
        app.save(update_fields=["status", "updated_at"])

    if p.get("send_invite"):
        if send_interview_invite(iv):
            iv.invite_sent = True
            iv.save(update_fields=["invite_sent"])
            messages.success(request, f"Interview scheduled and invite emailed to {app.candidate.display_name}.")
        else:
            messages.warning(request, "Interview scheduled, but the candidate has no email — invite not sent.")
    else:
        messages.success(request, f"Interview scheduled for {app.candidate.display_name}.")
    return redirect("recruitment:interviews", pk=pk)


@perm_required("recruitment.manage")
@require_POST
def set_interview_status(request, pk):
    """Update an interview's status (completed / cancelled / no-show)."""
    from .models import Interview
    iv = get_object_or_404(Interview.objects.select_related("application__job_opening"),
                           pk=pk, tenant=request.tenant)
    status = request.POST.get("status")
    if status in dict(Interview.STATUS_CHOICES):
        iv.status = status
        iv.notes = request.POST.get("notes", iv.notes)
        iv.save(update_fields=["status", "notes"])
        messages.success(request, "Interview updated.")
    return redirect("recruitment:interviews", pk=iv.application.job_opening_id)


@perm_required("recruitment.manage")
def recommend_candidates(request, pk):
    """Recommend candidates across the whole tenant pool for this JD (embeddings)."""
    from . import talent
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    all_candidates = Candidate.objects.filter(tenant=request.tenant).select_related("profile")
    ranked = talent.rank_candidates_for_job(job, all_candidates, limit=25)
    results = [{
        "name": c.display_name, "subtitle": c.current_designation or c.email or "—",
        "similarity": round(sim * 100), "link": None,
    } for c, sim in ranked]
    return render(request, "recruitment/match_results.html", {
        "title": f"Recommended candidates for {job.title}",
        "subtitle": "Every candidate in your database, ranked by semantic fit to this JD",
        "results": results, "back_url": reverse("recruitment:job_detail", args=[pk]),
        "empty_hint": "No candidates with parsed resumes yet.",
    })


@perm_required("recruitment.manage")
@require_POST
def push_ats(request, pk):
    """Push a published opening to the configured external ATS (stub by default)."""
    from .integrations import push_job_to_ats
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    result = push_job_to_ats(job)
    if result.get("ok"):
        messages.success(request, f"Pushed “{job.title}” to {result.get('provider')}.")
    else:
        messages.info(request, result.get("message", "ATS push not available."))
    return redirect("recruitment:job_detail", pk=pk)
