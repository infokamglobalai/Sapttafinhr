"""Public (unauthenticated) careers pages + JD feed (Phase 7).

Served under /careers/<slug>/ which is exempt from TenantMiddleware, so these
resolve the tenant from the URL slug themselves and never require a login. Only
PUBLISHED openings are exposed; everything is read-only.
"""
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render

from apps.tenants.models import Tenant

from .models import JobOpening


def _tenant(slug):
    return get_object_or_404(Tenant, subdomain=slug, status__in=["active", "trial"])


def _published(tenant):
    return (JobOpening.objects.filter(tenant=tenant, status="published")
            .select_related("department", "location").order_by("-published_at"))


def careers_index(request, slug):
    tenant = _tenant(slug)
    return render(request, "recruitment/public/careers_index.html", {
        "tenant": tenant, "openings": _published(tenant), "slug": slug,
    })


def careers_job(request, slug, job_id):
    tenant = _tenant(slug)
    job = get_object_or_404(JobOpening, pk=job_id, tenant=tenant, status="published")
    applied = False
    error = ""
    if request.method == "POST":
        applied, error = _handle_public_apply(request, tenant, job)
    return render(request, "recruitment/public/careers_job.html", {
        "tenant": tenant, "job": job, "slug": slug,
        "applied": applied, "apply_error": error,
    })


def _handle_public_apply(request, tenant, job):
    """Create candidate + application from public careers form."""
    from django.core.files.uploadedfile import UploadedFile

    first = (request.POST.get("first_name") or "").strip()
    last = (request.POST.get("last_name") or "").strip()
    email = (request.POST.get("email") or "").strip()
    phone = (request.POST.get("phone") or "").strip()
    if not (first and email):
        return False, "Please enter your name and email."

    from .models import Candidate, JobApplication

    candidate = Candidate.objects.filter(tenant=tenant, email__iexact=email).first()
    if not candidate:
        candidate = Candidate.objects.create(
            tenant=tenant,
            first_name=first,
            last_name=last,
            email=email,
            phone=phone,
            source="careers_page",
        )
    else:
        candidate.first_name = first
        candidate.last_name = last
        if phone:
            candidate.phone = phone
        candidate.save(update_fields=["first_name", "last_name", "phone"])

    resume = request.FILES.get("resume")
    if isinstance(resume, UploadedFile) and resume.size:
        candidate.resume = resume
        candidate.save(update_fields=["resume"])

    app, created = JobApplication.objects.get_or_create(
        tenant=tenant,
        job_opening=job,
        candidate=candidate,
        defaults={"status": "applied"},
    )
    if not created and app.status in ("rejected", "withdrawn"):
        app.status = "applied"
        app.save(update_fields=["status", "updated_at"])

    if resume and isinstance(resume, UploadedFile):
        try:
            from .tasks import parse_resume_task
            parse_resume_task.delay(candidate.pk)
        except Exception:
            pass

    return True, ""


def careers_feed(request, slug):
    """Machine-readable JSON feed of published openings for job-board syndication."""
    tenant = _tenant(slug)
    jobs = [{
        "id": j.id,
        "title": j.title,
        "department": j.department.name if j.department_id else None,
        "location": j.location.name if j.location_id else None,
        "employment_type": j.employment_type,
        "experience_min": j.experience_min,
        "experience_max": j.experience_max,
        "mandatory_skills": j.mandatory_skills,
        "preferred_skills": j.preferred_skills,
        "description": j.description,
        "published_at": j.published_at.isoformat() if j.published_at else None,
        "url": request.build_absolute_uri(f"/careers/{slug}/{j.id}/"),
    } for j in _published(tenant)]
    return JsonResponse({"company": tenant.name, "count": len(jobs), "jobs": jobs})
