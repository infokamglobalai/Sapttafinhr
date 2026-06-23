"""Employee self-service views — assets, onboarding."""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from .models import AssetAssignment, EmployeeOnboarding, OnboardingItem


def _employee_required(request):
    return getattr(request.user, "employee_profile", None)


@login_required
def my_assets(request):
    employee = _employee_required(request)
    if not employee:
        return redirect("tenants:dashboard")

    assignments = (
        AssetAssignment.objects.filter(
            employee=employee,
            returned_at__isnull=True,
            asset__tenant=request.tenant,
        )
        .select_related("asset", "assigned_by")
        .order_by("-assigned_at")
    )
    past = (
        AssetAssignment.objects.filter(
            employee=employee,
            returned_at__isnull=False,
            asset__tenant=request.tenant,
        )
        .select_related("asset")
        .order_by("-returned_at")[:10]
    )
    return render(request, "hr_ops/my_assets.html", {
        "assignments": assignments,
        "past_assignments": past,
    })


@login_required
def my_onboarding(request):
    employee = _employee_required(request)
    if not employee:
        return redirect("tenants:dashboard")

    onboarding = (
        EmployeeOnboarding.objects.filter(employee=employee, tenant=request.tenant)
        .select_related("template")
        .order_by("-started_at")
        .first()
    )
    items = []
    if onboarding:
        items = onboarding.items.select_related("task", "completed_by").order_by("task__sequence_order")
    return render(request, "hr_ops/my_onboarding.html", {
        "onboarding": onboarding,
        "items": items,
    })


@login_required
@require_POST
def my_onboarding_item_complete(request, item_pk):
    employee = _employee_required(request)
    if not employee:
        return redirect("tenants:dashboard")

    item = get_object_or_404(
        OnboardingItem,
        pk=item_pk,
        onboarding__employee=employee,
        onboarding__tenant=request.tenant,
    )
    if item.task.responsible_party not in ("employee",):
        messages.error(request, "This task must be completed by HR or your manager.")
        return redirect("hr_ops:my_onboarding")

    item.status = "completed"
    item.completed_at = timezone.now()
    item.completed_by = request.user
    item.notes = request.POST.get("notes", "")
    item.save()
    messages.success(request, "Task marked complete.")
    return redirect("hr_ops:my_onboarding")
