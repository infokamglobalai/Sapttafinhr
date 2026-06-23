import datetime

from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator

from utils.access import (
    hr_admin_required,
    manager_or_hr_required,
    employee_profile_required,
    can_manage_employee,
)

from .models import LeaveRequest, LeaveType, LeaveBalance, HolidayCalendar, Holiday, CompOffCredit
from .services import apply_leave, approve_leave, reject_leave, cancel_leave
from .comp_off_services import (
    request_comp_off,
    approve_comp_off,
    reject_comp_off,
    available_comp_off_days,
    available_comp_off_total,
)

# ---------------------------------------------------------------------------
# ESS: apply leave
# ---------------------------------------------------------------------------
@login_required
@employee_profile_required
def apply_leave_view(request):
    employee = request.user.employee_profile
    tenant = request.tenant
    leave_types = LeaveType.objects.filter(tenant=tenant, is_active=True)

    if request.method == "POST":
        leave_type_id = request.POST.get("leave_type")
        from_date_str = request.POST.get("from_date")
        to_date_str = request.POST.get("to_date")
        half_day_type = request.POST.get("half_day_type", "")
        reason = request.POST.get("reason", "")
        document = request.FILES.get("document")

        file_error = None
        if document:
            from django.core.exceptions import ValidationError as _VErr
            from utils.uploads import DOCUMENT_EXTS, validate_upload
            try:
                validate_upload(document, allowed_exts=DOCUMENT_EXTS, max_mb=10)
            except _VErr as exc:
                file_error = exc.messages[0] if exc.messages else "Invalid file."

        if file_error:
            messages.error(request, file_error)
        else:
            try:
                from_date = datetime.date.fromisoformat(from_date_str)
                to_date = datetime.date.fromisoformat(to_date_str)
                leave_req = apply_leave(
                    tenant, employee, int(leave_type_id),
                    from_date, to_date, half_day_type, reason, document
                )
                messages.success(request, f"Leave request submitted for {leave_req.total_days} day(s).")
                if request.htmx:
                    return HttpResponse(headers={"HX-Redirect": "/leaves/apply/"})
                return redirect("leaves:apply")
            except (ValueError, Exception) as exc:
                messages.error(request, str(exc))

    # Leave balance for current year
    year = timezone.localdate().year
    today = timezone.localdate()
    balances = {
        b.leave_type_id: b
        for b in LeaveBalance.objects.filter(employee=employee, year=year)
    }

    active_statuses = ["pending", "approved"]
    leave_qs = (
        LeaveRequest.objects.filter(employee=employee)
        .exclude(status__in=["cancelled", "withdrawn"])
        .select_related("leave_type")
    )
    all_leaves = (
        LeaveRequest.objects.filter(employee=employee)
        .order_by("-applied_at")
        .select_related("leave_type")
    )
    upcoming_leaves = leave_qs.filter(
        to_date__gte=today,
        status__in=active_statuses,
    ).order_by("from_date")
    past_leaves = leave_qs.filter(
        to_date__lt=today,
    ).order_by("-from_date")[:12]
    pending_count = leave_qs.filter(status="pending").count()
    leave_type_balances = [
        {"leave_type": lt, "balance": balances.get(lt.id)}
        for lt in leave_types
    ]
    initial_view = request.GET.get("view", "apply")
    if initial_view not in ("apply", "history"):
        initial_view = "apply"

    comp_off_available = available_comp_off_total(tenant, employee)

    return render(request, "leaves/apply.html", {
        "leave_types": leave_types,
        "leave_type_balances": leave_type_balances,
        "balances": balances,
        "today": today,
        "upcoming_leaves": upcoming_leaves,
        "past_leaves": past_leaves,
        "all_leaves": all_leaves,
        "pending_count": pending_count,
        "initial_view": initial_view,
        "comp_off_available": comp_off_available,
    })


@login_required
def my_leaves(request):
    """Legacy URL — leave history lives on the Apply Leave page."""
    return redirect(f"{reverse('leaves:apply')}?view=history")


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
    return redirect(f"{reverse('leaves:apply')}?view=history")


# ---------------------------------------------------------------------------
# Manager / HR: approve / reject
# ---------------------------------------------------------------------------
@manager_or_hr_required
def pending_leaves(request):
    """Manager/HR view of pending leave requests."""
    tenant = request.tenant
    user = request.user

    # If HR admin: see all pending
    # If manager: see only direct reports
    employee = getattr(user, "employee_profile", None)
    if user.is_hr_admin:
        qs = LeaveRequest.objects.filter(tenant=tenant, status="pending")
    elif employee:
        qs = LeaveRequest.objects.filter(
            tenant=tenant,
            status="pending",
            employee__reporting_manager=employee,
        )
    else:
        messages.warning(
            request,
            "Your manager login is not linked to an employee record. Ask HR to link your profile.",
        )
        qs = LeaveRequest.objects.none()

    qs = qs.select_related("employee", "leave_type", "employee__department").order_by("-applied_at")
    paginator = Paginator(qs, 20)
    page_obj = paginator.get_page(request.GET.get("page"))

    return render(request, "leaves/pending.html", {"page_obj": page_obj})


@manager_or_hr_required
@require_POST
def leave_action(request, pk):
    tenant = request.tenant
    leave_req = get_object_or_404(LeaveRequest, pk=pk, tenant=tenant)
    if not can_manage_employee(request.user, leave_req.employee):
        messages.error(request, "You cannot action leave for this employee.")
        return redirect("leaves:pending")
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
@hr_admin_required
def leave_type_list(request):
    tenant = request.tenant
    leave_types = LeaveType.objects.filter(tenant=tenant).order_by("name")
    return render(request, "leaves/leave_types.html", {"leave_types": leave_types})


@hr_admin_required
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
@hr_admin_required
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


@hr_admin_required
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
@hr_admin_required
def leave_balance_admin(request):
    tenant = request.tenant
    year = int(request.GET.get("year", timezone.localdate().year))
    balances = LeaveBalance.objects.filter(
        tenant=tenant, year=year
    ).select_related("employee", "leave_type").order_by("employee__first_name", "leave_type__code")

    return render(request, "leaves/balances.html", {"balances": balances, "year": year})


# ---------------------------------------------------------------------------
# Comp-off
# ---------------------------------------------------------------------------
@login_required
@employee_profile_required
def comp_off_list(request):
    employee = request.user.employee_profile
    tenant = request.tenant
    credits = CompOffCredit.objects.filter(tenant=tenant, employee=employee).order_by("-worked_date")
    available = available_comp_off_days(tenant, employee)
    today = timezone.localdate()

    if request.method == "POST":
        date_str = request.POST.get("worked_date")
        reason = request.POST.get("reason", "")
        try:
            worked_date = datetime.date.fromisoformat(date_str)
            request_comp_off(tenant, employee, worked_date, reason)
            messages.success(request, "Comp-off request submitted for manager approval.")
            return redirect("leaves:comp_off")
        except (ValueError, TypeError) as exc:
            messages.error(request, str(exc))

    available_total = available_comp_off_total(tenant, employee)
    stats = {
        "available": available_total,
        "pending": credits.filter(status="pending").count(),
        "used": credits.filter(status="used").count(),
        "expiring_soon": credits.filter(
            status="available",
            valid_until__gte=today,
            valid_until__lte=today + datetime.timedelta(days=14),
        ).count(),
    }

    return render(request, "leaves/comp_off.html", {
        "credits": credits,
        "available_count": len(available),
        "stats": stats,
        "today": today,
    })


@manager_or_hr_required
def comp_off_pending(request):
    tenant = request.tenant
    user = request.user
    qs = CompOffCredit.objects.filter(tenant=tenant, status="pending").select_related("employee")

    if not user.is_hr_admin:
        manager = getattr(user, "employee_profile", None)
        if manager:
            qs = qs.filter(employee__reporting_manager=manager)
        else:
            messages.warning(
                request,
                "Your manager login is not linked to an employee record. Ask HR to link your profile.",
            )
            qs = qs.none()

    return render(request, "leaves/comp_off_pending.html", {"credits": qs.order_by("-created_at")})


@manager_or_hr_required
@require_POST
def comp_off_action(request, pk):
    tenant = request.tenant
    credit = get_object_or_404(CompOffCredit, pk=pk, tenant=tenant, status="pending")
    if not can_manage_employee(request.user, credit.employee):
        messages.error(request, "You cannot action this comp-off request.")
        return redirect("leaves:comp_off_pending")

    action = request.POST.get("action")
    try:
        if action == "approve":
            approve_comp_off(credit, request.user)
            messages.success(request, f"Comp-off approved for {credit.employee.full_name}.")
        elif action == "reject":
            reject_comp_off(credit, request.user)
            messages.warning(request, f"Comp-off rejected for {credit.employee.full_name}.")
    except ValueError as exc:
        messages.error(request, str(exc))
    return redirect("leaves:comp_off_pending")
