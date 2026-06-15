"""Employee service requests — submit, approve, IT queue."""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ServiceRequestForm
from .models import Asset, ServiceRequest
from . import service_request_services as srs


def _employee_required(request):
    return getattr(request.user, "employee_profile", None)


@login_required
def my_requests(request):
    employee = _employee_required(request)
    if not employee:
        return redirect("tenants:dashboard")
    qs = ServiceRequest.objects.filter(tenant=request.tenant, employee=employee).order_by("-created_at")
    return render(request, "hr_ops/request_my_list.html", {"requests": qs})


@login_required
def request_create(request):
    employee = _employee_required(request)
    if not employee:
        messages.error(request, "Employee profile required to raise requests.")
        return redirect("tenants:dashboard")

    assigned_assets = Asset.objects.filter(
        tenant=request.tenant,
        assignments__employee=employee,
        assignments__returned_at__isnull=True,
    ).distinct()

    if request.method == "POST":
        form = ServiceRequestForm(request.POST, request.FILES, assigned_assets=assigned_assets)
        if form.is_valid():
            asset = form.cleaned_data.get("asset")
            srs.submit_service_request(
                request.tenant,
                employee,
                category=form.cleaned_data["category"],
                subject=form.cleaned_data["subject"],
                description=form.cleaned_data["description"],
                priority=form.cleaned_data["priority"],
                asset=asset,
                attachment=form.cleaned_data.get("attachment"),
            )
            messages.success(request, "Your request has been submitted.")
            return redirect("hr_ops:my_service_requests")
    else:
        form = ServiceRequestForm(assigned_assets=assigned_assets)

    return render(request, "hr_ops/request_form.html", {"form": form, "assigned_assets": assigned_assets})


@login_required
def my_request_detail(request, pk):
    employee = _employee_required(request)
    if not employee:
        return redirect("tenants:dashboard")
    req = get_object_or_404(
        ServiceRequest.objects.select_related("asset", "assigned_to"),
        pk=pk, tenant=request.tenant, employee=employee,
    )
    comments = req.comments.filter(is_internal=False)
    return render(request, "hr_ops/request_detail.html", {
        "req": req, "comments": comments, "view_mode": "employee",
        "timeline": srs.build_request_timeline(req),
    })


@login_required
def team_requests(request):
    """Manager: pending approvals for direct reports."""
    if not (request.user.is_manager or request.user.is_hr_admin):
        messages.error(request, "Manager or HR admin access required.")
        return redirect("tenants:dashboard")

    if request.user.is_hr_admin:
        qs = ServiceRequest.objects.filter(
            tenant=request.tenant,
            status="pending_manager",
        ).select_related("employee").order_by("-created_at")
    else:
        manager_emp = getattr(request.user, "employee_profile", None)
        if not manager_emp:
            messages.warning(
                request,
                "Your manager login is not linked to an employee record. Ask HR to link your profile.",
            )
            return redirect("tenants:dashboard")
        qs = ServiceRequest.objects.filter(
            tenant=request.tenant,
            status="pending_manager",
            employee__reporting_manager=manager_emp,
        ).select_related("employee").order_by("-created_at")

    return render(request, "hr_ops/request_team_list.html", {"requests": qs})


@login_required
def team_request_detail(request, pk):
    manager_emp = _employee_required(request)
    if not manager_emp:
        return redirect("tenants:dashboard")

    req = get_object_or_404(
        ServiceRequest.objects.select_related("employee", "asset"),
        pk=pk, tenant=request.tenant, status="pending_manager",
        employee__reporting_manager=manager_emp,
    )

    if request.method == "POST":
        action = request.POST.get("action")
        remarks = request.POST.get("remarks", "").strip()
        try:
            if action == "approve":
                srs.manager_approve_request(req, request.user, remarks)
                messages.success(request, f"Approved {req.request_no}.")
            elif action == "reject":
                reason = request.POST.get("reason", "").strip() or "Declined by manager."
                srs.manager_reject_request(req, request.user, reason)
                messages.success(request, f"Declined {req.request_no}.")
            return redirect("hr_ops:team_service_requests")
        except ValueError as e:
            messages.error(request, str(e))

    return render(request, "hr_ops/request_detail.html", {
        "req": req, "comments": req.comments.filter(is_internal=False), "view_mode": "manager",
        "timeline": srs.build_request_timeline(req),
    })


@login_required
def admin_queue(request):
    if not request.user.is_hr_admin:
        return redirect("tenants:dashboard")

    status = request.GET.get("status", "open")
    qs = ServiceRequest.objects.filter(tenant=request.tenant).select_related("employee", "assigned_to")

    if status == "open":
        qs = qs.filter(status__in=("pending_it", "in_progress"))
    elif status != "all":
        qs = qs.filter(status=status)

    counts = {
        "open": ServiceRequest.objects.filter(tenant=request.tenant, status__in=("pending_it", "in_progress")).count(),
        "resolved": ServiceRequest.objects.filter(tenant=request.tenant, status="resolved").count(),
    }
    return render(request, "hr_ops/request_admin_queue.html", {
        "requests": qs.order_by("-created_at")[:100],
        "status": status,
        "counts": counts,
    })


@login_required
def admin_request_detail(request, pk):
    if not request.user.is_hr_admin:
        return redirect("tenants:dashboard")

    req = get_object_or_404(
        ServiceRequest.objects.select_related("employee", "asset", "assigned_to"),
        pk=pk, tenant=request.tenant,
    )

    if request.method == "POST":
        action = request.POST.get("action")
        note = request.POST.get("note", "").strip()
        try:
            if action == "assign":
                srs.assign_request(req, request.user)
                messages.success(request, "Assigned to you.")
            elif action == "comment":
                is_internal = request.POST.get("is_internal") == "on"
                srs.add_comment(req, request.user, note, is_internal=is_internal)
                messages.success(request, "Reply posted.")
            elif action == "resolve":
                srs.resolve_request(req, request.user, note)
                messages.success(request, f"{req.request_no} marked resolved.")
            elif action == "close":
                srs.close_request(req, request.user)
                messages.success(request, f"{req.request_no} closed.")
            return redirect("hr_ops:service_request_admin_detail", pk=pk)
        except ValueError as e:
            messages.error(request, str(e))

    return render(request, "hr_ops/request_detail.html", {
        "req": req,
        "comments": req.comments.select_related("author"),
        "view_mode": "admin",
        "timeline": srs.build_request_timeline(req),
    })
