"""Recruitment (ATS) — job openings, candidates, and an applicant pipeline.

Server-rendered to match the rest of HR. Admin-facing (gated by is_hr_admin where
it mutates). Mirrors the leaves/employees view conventions.
"""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.employees.models import Department, Designation, OfficeLocation

from .models import Candidate, JobApplication, JobOpening

PIPELINE = ["applied", "screening", "interview", "offer", "hired", "rejected"]


# ── Job openings ────────────────────────────────────────────────────────────
@login_required
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
    ctx = {
        "page_obj": page, "status": status, "search": search,
        "status_choices": JobOpening.STATUS_CHOICES,
        "open_count": JobOpening.objects.filter(tenant=tenant, status="published").count(),
    }
    return render(request, "recruitment/job_list.html", ctx)


@login_required
def job_create(request):
    if not request.user.is_hr_admin:
        return redirect("recruitment:job_list")
    tenant = request.tenant
    if request.method == "POST":
        p = request.POST
        try:
            JobOpening.objects.create(
                tenant=tenant,
                title=p.get("title", "").strip(),
                department_id=p.get("department") or None,
                designation_id=p.get("designation") or None,
                location_id=p.get("location") or None,
                employment_type=p.get("employment_type", "full_time"),
                positions_count=int(p.get("positions_count") or 1),
                experience_min=int(p.get("experience_min") or 0),
                experience_max=int(p.get("experience_max")) if p.get("experience_max") else None,
                description=p.get("description", ""),
                requirements=p.get("requirements", ""),
                status=p.get("status", "draft"),
                created_by=request.user,
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
    }
    return render(request, "recruitment/job_form.html", ctx)


@login_required
def job_detail(request, pk):
    tenant = request.tenant
    job = get_object_or_404(JobOpening, pk=pk, tenant=tenant)
    buckets = {s: [] for s in PIPELINE}
    for app in (JobApplication.objects.filter(job_opening=job)
                .select_related("candidate").order_by("-applied_at")):
        buckets.setdefault(app.status, []).append(app)
    # Template-friendly: ordered list of stages (no custom filter needed).
    stages = [{"key": s, "count": len(buckets[s]), "apps": buckets[s]} for s in PIPELINE]
    ctx = {"job": job, "stages": stages, "pipeline": PIPELINE}
    return render(request, "recruitment/job_detail.html", ctx)


@login_required
@require_POST
def job_publish(request, pk):
    if not request.user.is_hr_admin:
        return redirect("recruitment:job_list")
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    job.status = "published"
    job.published_at = timezone.now()
    job.save(update_fields=["status", "published_at"])
    messages.success(request, f"“{job.title}” is now published.")
    return redirect("recruitment:job_detail", pk=pk)


@login_required
@require_POST
def job_close(request, pk):
    if not request.user.is_hr_admin:
        return redirect("recruitment:job_list")
    job = get_object_or_404(JobOpening, pk=pk, tenant=request.tenant)
    job.status = "closed"
    job.save(update_fields=["status"])
    messages.success(request, f"“{job.title}” closed.")
    return redirect("recruitment:job_detail", pk=pk)


# ── Candidates / applications ───────────────────────────────────────────────
@login_required
def add_applicant(request, pk):
    """Add a candidate + application to a job in one step."""
    if not request.user.is_hr_admin:
        return redirect("recruitment:job_detail", pk=pk)
    tenant = request.tenant
    job = get_object_or_404(JobOpening, pk=pk, tenant=tenant)
    if request.method == "POST":
        p = request.POST
        resume = request.FILES.get("resume")
        if resume:
            from django.core.exceptions import ValidationError as _VErr
            from utils.uploads import RESUME_EXTS, validate_upload
            try:
                validate_upload(resume, allowed_exts=RESUME_EXTS, max_mb=10)
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
            resume=resume,
            source=p.get("source", "direct"),
        )
        JobApplication.objects.create(tenant=tenant, job_opening=job, candidate=cand, status="applied")
        messages.success(request, f"{cand.first_name} added to the pipeline.")
        return redirect("recruitment:job_detail", pk=pk)
    return render(request, "recruitment/applicant_form.html", {"job": job})


@login_required
@require_POST
def move_application(request, pk):
    """Move an application to a new pipeline stage."""
    if not request.user.is_hr_admin:
        return redirect("recruitment:job_list")
    app = get_object_or_404(
        JobApplication.objects.select_related("job_opening"), pk=pk, tenant=request.tenant
    )
    new_status = request.POST.get("status")
    if new_status in dict(JobApplication.STATUS_CHOICES):
        app.status = new_status
        app.save(update_fields=["status", "updated_at"])
        messages.success(request, f"Moved {app.candidate.first_name} to {new_status}.")
    return redirect("recruitment:job_detail", pk=app.job_opening_id)
