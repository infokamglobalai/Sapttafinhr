from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django import forms as djforms

from .models import ReviewCycle, PerformanceReview
from .forms import PerformanceReviewForm, EmployeeAcknowledgementForm
from apps.employees.models import Employee
from utils.access import hr_admin_required, manager_or_hr_required


# ────────────────────────────────────────────────────────────────────────────
# MANAGER — review your direct reports
# ────────────────────────────────────────────────────────────────────────────
@login_required
def team_reviews(request):
    """Manager lands here: shows each direct report × each open cycle."""
    tenant = request.tenant
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        messages.error(request, "Manager profile not found.")
        return redirect("tenants:dashboard")

    direct_reports = Employee.objects.filter(
        tenant=tenant, reporting_manager=employee, employment_status="active"
    ).order_by("first_name", "last_name")

    cycles = ReviewCycle.objects.filter(tenant=tenant, status__in=["active", "review"]).order_by("-review_period_end")

    rows = []
    for report in direct_reports:
        for cycle in cycles:
            review = PerformanceReview.objects.filter(cycle=cycle, employee=report).first()
            rows.append({"employee": report, "cycle": cycle, "review": review})

    past_reviews = PerformanceReview.objects.filter(
        tenant=tenant, reviewer=employee
    ).select_related("employee", "cycle").order_by("-updated_at")[:20]

    return render(request, "performance/team_reviews.html", {
        "rows": rows, "cycles": cycles, "direct_reports": direct_reports,
        "past_reviews": past_reviews,
    })


@login_required
def review_create_or_edit(request, employee_pk, cycle_pk):
    tenant = request.tenant
    reviewer = getattr(request.user, "employee_profile", None)
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=tenant)
    cycle = get_object_or_404(ReviewCycle, pk=cycle_pk, tenant=tenant)

    is_hr_admin = request.user.is_hr_admin
    if not is_hr_admin and (not reviewer or employee.reporting_manager != reviewer):
        messages.error(request, "You can only review your direct reports.")
        return redirect("performance:team_reviews")

    if cycle.status not in ("active", "review"):
        messages.error(request, "This cycle is not accepting reviews.")
        return redirect("performance:team_reviews")

    review, _ = PerformanceReview.objects.get_or_create(
        tenant=tenant, cycle=cycle, employee=employee,
        defaults={"reviewer": reviewer},
    )
    if review.reviewer is None:
        review.reviewer = reviewer
        review.save(update_fields=["reviewer"])

    if review.status == "acknowledged":
        messages.warning(request, "This review has been acknowledged and is locked.")
        return redirect("performance:review_detail", pk=review.pk)

    if request.method == "POST":
        form = PerformanceReviewForm(request.POST, instance=review)
        if form.is_valid():
            review = form.save(commit=False)
            action = request.POST.get("action", "save_draft")
            if action == "submit":
                review.status = "submitted"
                review.submitted_at = timezone.now()
                messages.success(request, f"Review submitted to {employee.full_name}.")
                # Notify the employee
                try:
                    from apps.hr_ops.services import notify, audit_log
                    if employee.user:
                        notify(
                            employee.user, "review_submitted",
                            f"Your {cycle.name} review is ready",
                            message=f"{reviewer.full_name if reviewer else 'Your manager'} has submitted your performance review. Please review and acknowledge.",
                            action_url=f"/performance/{review.pk}/",
                        )
                    audit_log(
                        tenant, request.user, "submit", "PerformanceReview", review,
                        f"Submitted review for {employee.full_name} · {cycle.name} · {review.overall_rating or '-'}/5",
                        details={"cycle": cycle.name, "rating": review.overall_rating},
                    )
                except Exception:
                    pass
            else:
                messages.success(request, "Draft saved.")
            review.save()
            return redirect("performance:team_reviews")
    else:
        form = PerformanceReviewForm(instance=review)

    return render(request, "performance/review_form.html", {
        "form": form, "review": review, "employee": employee, "cycle": cycle,
    })


# ────────────────────────────────────────────────────────────────────────────
# EMPLOYEE — view your own reviews, acknowledge
# ────────────────────────────────────────────────────────────────────────────
@login_required
def my_reviews(request):
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        return redirect("tenants:dashboard")
    reviews = PerformanceReview.objects.filter(
        employee=employee
    ).exclude(status="draft").select_related("cycle", "reviewer").order_by("-created_at")
    return render(request, "performance/my_reviews.html", {"reviews": reviews})


@login_required
def review_detail(request, pk):
    tenant = request.tenant
    review = get_object_or_404(PerformanceReview, pk=pk, tenant=tenant)
    user = request.user
    emp = getattr(user, "employee_profile", None)
    can_view = (
        user.is_hr_admin
        or (emp and review.employee_id == emp.id)
        or (emp and review.reviewer_id == emp.id)
    )
    if not can_view:
        messages.error(request, "You don't have permission to view this review.")
        return redirect("tenants:dashboard")
    ack_form = None
    if emp and review.employee_id == emp.id and review.status == "submitted":
        ack_form = EmployeeAcknowledgementForm(instance=review)
    return render(request, "performance/review_detail.html", {
        "review": review, "ack_form": ack_form,
        "is_employee": emp and review.employee_id == emp.id,
    })


@login_required
@require_POST
def acknowledge_review(request, pk):
    tenant = request.tenant
    review = get_object_or_404(PerformanceReview, pk=pk, tenant=tenant)
    emp = getattr(request.user, "employee_profile", None)
    if not emp or review.employee_id != emp.id:
        messages.error(request, "Only the reviewed employee can acknowledge.")
        return redirect("tenants:dashboard")
    if review.status != "submitted":
        messages.error(request, "This review is not awaiting acknowledgement.")
        return redirect("performance:review_detail", pk=pk)
    form = EmployeeAcknowledgementForm(request.POST, instance=review)
    if form.is_valid():
        rev = form.save(commit=False)
        rev.status = "acknowledged"
        rev.acknowledged_at = timezone.now()
        rev.save()
        messages.success(request, "Review acknowledged.")
    return redirect("performance:review_detail", pk=pk)


# ────────────────────────────────────────────────────────────────────────────
# HR ADMIN — manage review cycles
# ────────────────────────────────────────────────────────────────────────────
@hr_admin_required
def cycle_list(request):
    tenant = request.tenant
    cycles = ReviewCycle.objects.filter(tenant=tenant).order_by("-review_period_end")
    return render(request, "performance/cycles.html", {"cycles": cycles})


@hr_admin_required
def cycle_detail(request, pk):
    tenant = request.tenant
    cycle = get_object_or_404(ReviewCycle, pk=pk, tenant=tenant)
    reviews = PerformanceReview.objects.filter(
        cycle=cycle
    ).select_related("employee", "reviewer", "employee__department").order_by("employee__first_name")
    stats = {
        "total": reviews.count(),
        "draft": reviews.filter(status="draft").count(),
        "submitted": reviews.filter(status="submitted").count(),
        "acknowledged": reviews.filter(status="acknowledged").count(),
    }
    return render(request, "performance/cycle_detail.html", {
        "cycle": cycle, "reviews": reviews, "stats": stats,
    })


# ── Cycle form ──
INPUT = "input input-bordered w-full"
SELECT = "select select-bordered w-full"


class ReviewCycleForm(djforms.ModelForm):
    class Meta:
        model = ReviewCycle
        fields = ["name", "cycle_type", "review_period_start", "review_period_end",
                  "opens_at", "closes_at", "status"]
        widgets = {
            "name": djforms.TextInput(attrs={"class": INPUT, "placeholder": "Annual 2025 / H1 2025"}),
            "cycle_type": djforms.Select(attrs={"class": SELECT}),
            "review_period_start": djforms.DateInput(attrs={"class": INPUT, "type": "date"}),
            "review_period_end": djforms.DateInput(attrs={"class": INPUT, "type": "date"}),
            "opens_at": djforms.DateInput(attrs={"class": INPUT, "type": "date"}),
            "closes_at": djforms.DateInput(attrs={"class": INPUT, "type": "date"}),
            "status": djforms.Select(attrs={"class": SELECT}),
        }


@hr_admin_required
def cycle_create_or_edit(request, pk=None):
    tenant = request.tenant
    cycle = get_object_or_404(ReviewCycle, pk=pk, tenant=tenant) if pk else None
    if request.method == "POST":
        form = ReviewCycleForm(request.POST, instance=cycle)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            obj.save()
            messages.success(request, f'Cycle "{obj.name}" saved.')
            return redirect("performance:cycles")
    else:
        form = ReviewCycleForm(instance=cycle)
    return render(request, "performance/cycle_form.html", {"form": form, "cycle": cycle})


# ─────────────────────────────────────────────────────────────────────────
# AI Draft Assistant (feature #1) — Claude-powered review drafting
# ─────────────────────────────────────────────────────────────────────────
@login_required
@require_POST
def ai_draft_review(request, employee_pk, cycle_pk):
    """Take manager bullet notes -> structured review draft JSON. JSON endpoint."""
    tenant = request.tenant
    employee = get_object_or_404(Employee, pk=employee_pk, tenant=tenant)
    cycle = get_object_or_404(ReviewCycle, pk=cycle_pk, tenant=tenant)

    # Permission: HR admin OR the actual reporting manager
    reviewer = getattr(request.user, "employee_profile", None)
    if not (request.user.is_hr_admin or (reviewer and employee.reporting_manager == reviewer)):
        return JsonResponse({"error": "You can only draft reviews for your direct reports."}, status=403)

    notes = (request.POST.get("notes") or "").strip()
    if len(notes) < 20:
        return JsonResponse({
            "error": "Write at least a couple of sentences of notes for the assistant.",
        }, status=400)

    prior = (
        PerformanceReview.objects.filter(employee=employee)
        .exclude(cycle=cycle).exclude(overall_rating__isnull=True)
        .order_by("-cycle__review_period_end").first()
    )

    try:
        from .ai import draft_review
        draft = draft_review(
            employee=employee, cycle=cycle,
            manager_notes=notes, prior_review=prior,
        )
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({"error": f"AI service error: {exc}"}, status=500)

    # Audit log so HR knows which reviews used AI assistance
    try:
        from apps.hr_ops.services import audit_log
        audit_log(
            tenant, request.user, "create", "PerformanceReview", employee,
            f"Used AI draft assistant for {employee.full_name} / {cycle.name}",
            details={"notes_chars": len(notes), "suggested_rating": draft.get("suggested_overall")},
        )
    except Exception:
        pass

    return JsonResponse({"draft": draft})
