import datetime
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator

from .models import LeaveRequest, LeaveType, LeaveBalance, HolidayCalendar, Holiday
from .services import apply_leave, approve_leave, reject_leave, cancel_leave
from apps.employees.models import Employee


# ---------------------------------------------------------------------------
# ESS: apply leave
# ---------------------------------------------------------------------------
@login_required
def apply_leave_view(request):
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        return redirect("tenants:dashboard")

    tenant = request.tenant
    leave_types = LeaveType.objects.filter(tenant=tenant, is_active=True)

    if request.method == "POST":
        leave_type_id = request.POST.get("leave_type")
        from_date_str = request.POST.get("from_date")
        to_date_str = request.POST.get("to_date")
        half_day_type = request.POST.get("half_day_type", "")
        reason = request.POST.get("reason", "")
        document = request.FILES.get("document")

        try:
            from_date = datetime.date.fromisoformat(from_date_str)
            to_date = datetime.date.fromisoformat(to_date_str)
            leave_req = apply_leave(
                tenant, employee, int(leave_type_id),
                from_date, to_date, half_day_type, reason, document
            )
            messages.success(request, f"Leave request submitted for {leave_req.total_days} day(s).")
            if request.htmx:
                return HttpResponse(headers={"HX-Redirect": "/leaves/my/"})
            return redirect("leaves:my_leaves")
        except (ValueError, Exception) as exc:
            messages.error(request, str(exc))

    # Leave balance for current year
    year = timezone.localdate().year
    balances = {
        b.leave_type_id: b
        for b in LeaveBalance.objects.filter(employee=employee, year=year)
    }

    return render(request, "leaves/apply.html", {
        "leave_types": leave_types,
        "balances": balances,
        "today": timezone.localdate(),
    })


@login_required
def my_leaves(request):
    employee = getattr(request.user, "employee_profile", None)
    if not employee:
        return redirect("tenants:dashboard")

    year = int(request.GET.get("year", timezone.localdate().year))
    requests = LeaveRequest.objects.filter(
        employee=employee
    ).order_by("-applied_at").select_related("leave_type")

    balances = LeaveBalance.objects.filter(
        tenant=request.tenant, employee=employee, year=year
    ).select_related("leave_type")

    return render(request, "leaves/my_leaves.html", {
        "leave_requests": requests,
        "balances": balances,
        "year": year,
    })


@login_required
@require_POST
def cancel_leave_view(request, pk):
    employee = getattr(request.user, "employee_profile", None)
    leave_req = get_object_or_404(LeaveRequest, pk=pk, tenant=request.tenant, employee=employee)
    try:
        cancel_leave(leave_req)
        messages.success(request, "Leave cancelled.")
    except ValueError as exc:
        messages.error(request, str(exc))
    return redirect("leaves:my_leaves")


# ---------------------------------------------------------------------------
# Manager / HR: approve / reject
# ---------------------------------------------------------------------------
@login_required
def pending_leaves(request):
    """Manager/HR view of pending leave requests."""
    tenant = request.tenant
    user = request.user

    # If HR admin: see all pending
    # If manager: see only direct reports
    employee = getattr(user, "employee_profile", None)
    if user.has_perm_code("leaves.approve_all"):
        qs = LeaveRequest.objects.filter(tenant=tenant, status="pending")
    elif employee:
        qs = LeaveRequest.objects.filter(
            tenant=tenant,
            status="pending",
            employee__reporting_manager=employee,
        )
    else:
        qs = LeaveRequest.objects.none()

    qs = qs.select_related("employee", "leave_type", "employee__department").order_by("-applied_at")
    paginator = Paginator(qs, 20)
    page_obj = paginator.get_page(request.GET.get("page"))

    return render(request, "leaves/pending.html", {"page_obj": page_obj})


@login_required
@require_POST
def leave_action(request, pk):
    tenant = request.tenant
    leave_req = get_object_or_404(LeaveRequest, pk=pk, tenant=tenant)
    action = request.POST.get("action")
    remarks = request.POST.get("remarks", "")

    try:
        if action == "approve":
            approve_leave(leave_req, actioned_by=request.user, remarks=remarks)
            messages.success(request, f"Leave approved for {leave_req.employee.full_name}.")
        elif action == "reject":
            reject_leave(leave_req, actioned_by=request.user, remarks=remarks)
            messages.warning(request, f"Leave rejected for {leave_req.employee.full_name}.")
    except ValueError as exc:
        messages.error(request, str(exc))

    if request.htmx:
        qs = LeaveRequest.objects.filter(tenant=tenant, status="pending").select_related("employee", "leave_type")
        return render(request, "leaves/partials/pending_list.html", {"leave_requests": qs})
    return redirect("leaves:pending")


# ---------------------------------------------------------------------------
# Leave type configuration (HR admin)
# ---------------------------------------------------------------------------
@login_required
def leave_type_list(request):
    tenant = request.tenant
    leave_types = LeaveType.objects.filter(tenant=tenant).order_by("name")
    return render(request, "leaves/leave_types.html", {"leave_types": leave_types})


@login_required
def leave_type_create_or_edit(request, pk=None):
    from .forms import LeaveTypeForm
    tenant = request.tenant
    lt = get_object_or_404(LeaveType, pk=pk, tenant=tenant) if pk else None
    if request.method == "POST":
        form = LeaveTypeForm(request.POST, instance=lt)
        if form.is_valid():
            obj = form.save(commit=False)
            obj.tenant = tenant
            obj.save()
            messages.success(request, f'Leave type "{obj.name}" saved.')
            return redirect("leaves:leave_types")
    else:
        form = LeaveTypeForm(instance=lt)
    return render(request, "leaves/leave_type_form.html", {"form": form, "leave_type": lt})


# ---------------------------------------------------------------------------
# Holiday calendar management
# ---------------------------------------------------------------------------
@login_required
def holiday_calendar(request):
    tenant = request.tenant
    year = int(request.GET.get("year", timezone.localdate().year))
    calendar = HolidayCalendar.objects.filter(tenant=tenant, year=year, is_default=True).first()
    holidays = calendar.holidays.filter(is_active=True).order_by("holiday_date") if calendar else []

    return render(request, "leaves/holidays.html", {
        "calendar": calendar,
        "holidays": holidays,
        "year": year,
    })


@login_required
@require_POST
def holiday_create(request):
    tenant = request.tenant
    year = int(request.POST.get("year", timezone.localdate().year))
    calendar, _ = HolidayCalendar.objects.get_or_create(
        tenant=tenant, year=year, is_default=True,
        defaults={"name": f"{tenant.name} Holidays {year}"}
    )
    Holiday.objects.create(
        tenant=tenant,
        calendar=calendar,
        name=request.POST.get("name", ""),
        holiday_date=request.POST.get("holiday_date"),
        holiday_type=request.POST.get("holiday_type", "national"),
    )
    messages.success(request, "Holiday added.")
    return redirect("leaves:holidays")


# ---------------------------------------------------------------------------
# Leave balance (HR admin view)
# ---------------------------------------------------------------------------
@login_required
def leave_balance_admin(request):
    tenant = request.tenant
    year = int(request.GET.get("year", timezone.localdate().year))
    balances = LeaveBalance.objects.filter(
        tenant=tenant, year=year
    ).select_related("employee", "leave_type").order_by("employee__first_name", "leave_type__code")

    return render(request, "leaves/balances.html", {"balances": balances, "year": year})
