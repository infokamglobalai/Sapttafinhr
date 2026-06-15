"""Recruitment (ATS) — job openings, candidates, and an applicant pipeline.

Server-rendered to match the rest of HR. Admin-facing (gated by is_hr_admin where
it mutates). Mirrors the leaves/employees view conventions.
"""
import json

from django.contrib import messages
from utils.access import hr_admin_required
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.employees.models import Department, Designation, OfficeLocation

from .models import Candidate, JobApplication, JobOpening

PIPELINE = ["applied", "screening", "interview", "offer", "hired", "rejected"]


# ── Job openings ────────────────────────────────────────────────────────────
@hr_admin_required
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


@hr_admin_required
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


@hr_admin_required
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


@hr_admin_required
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


@hr_admin_required
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
@hr_admin_required
def add_applicant(request, pk):
    """Add a candidate + application to a job in one step."""
    if not request.user.is_hr_admin:
        return redirect("recruitment:job_detail", pk=pk)
    tenant = request.tenant
    job = get_object_or_404(JobOpening, pk=pk, tenant=tenant)
    if request.method == "POST":
        p = request.POST
        resume_file = request.FILES.get("resume")
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
        if resume_file:
            try:
                from .resume_parser import parse_resume
                parsed = parse_resume(resume_file.read(), resume_file.name)
                if parsed.get("name") and not cand.first_name:
                    parts = parsed["name"].split(None, 1)
                    cand.first_name = parts[0]
                    cand.last_name = parts[1] if len(parts) > 1 else ""
                if parsed.get("email") and not cand.email:
                    cand.email = parsed["email"]
                if parsed.get("phone") and not cand.phone:
                    cand.phone = parsed["phone"]
                if parsed.get("current_company") and not cand.current_company:
                    cand.current_company = parsed["current_company"]
                if parsed.get("current_designation") and not cand.current_designation:
                    cand.current_designation = parsed["current_designation"]
                if parsed.get("total_experience") and not cand.total_experience:
                    cand.total_experience = parsed["total_experience"]
                cand.save()
            except Exception:
                pass
        JobApplication.objects.create(tenant=tenant, job_opening=job, candidate=cand, status="applied")
        messages.success(request, f"{cand.first_name} added to the pipeline.")
        return redirect("recruitment:job_detail", pk=pk)
    return render(request, "recruitment/applicant_form.html", {"job": job})


@hr_admin_required
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


@hr_admin_required
@require_POST
def move_application_api(request, pk):
    """JSON API for kanban drag-and-drop stage changes."""
    if not request.user.is_hr_admin:
        return JsonResponse({"error": "Forbidden"}, status=403)
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
