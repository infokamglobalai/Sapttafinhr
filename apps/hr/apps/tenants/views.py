import datetime
import json
from decimal import Decimal

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from django.contrib import messages
from django.db.models import Count, Sum, Q
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from .services import provision_tenant, validate_subdomain


def _sparkline_paths(values, stroke: str, fill: str, spark_id: str = "kpi") -> dict:
    """SVG line + area paths for KPI sparklines (viewBox 0 0 120 40)."""
    import math

    series = [float(v) for v in (values or [0])][-8:]
    if len(series) < 2:
        series = [series[0] if series else 0.0, series[0] if series else 0.0]

    if max(series) == min(series):
        base = max(series[0], 1.0)
        series = [base * (0.45 + 0.35 * math.sin(i * 0.9 + 0.4)) for i in range(len(series))]

    width, height, pad = 120.0, 40.0, 4.0
    lo, hi = min(series), max(series)
    if lo == hi:
        lo = max(0.0, lo - 1.0)
        hi = hi + 1.0

    points = []
    span = len(series) - 1
    for i, value in enumerate(series):
        x = pad + (width - 2 * pad) * i / span
        y = height - pad - (height - 2 * pad) * (value - lo) / (hi - lo)
        points.append((round(x, 1), round(y, 1)))

    line = "M " + " L ".join(f"{x},{y}" for x, y in points)
    area = f"{line} L {points[-1][0]},{height - 2} L {points[0][0]},{height - 2} Z"
    return {"line": line, "area": area, "stroke": stroke, "fill": fill, "id": spark_id}


def _ramp_series(current: int, length: int = 8) -> list[int]:
    """Build a simple rising series ending at *current* for sparklines without history."""
    current = max(0, int(current))
    if current == 0:
        return [0] * length
    return [max(0, round(current * i / (length - 1))) for i in range(length)]


# ────────────────────────────────────────────────────────────────────────────
# PUBLIC — legal pages (no auth required)
# ────────────────────────────────────────────────────────────────────────────
def legal_privacy(request):
    return render(request, "legal/privacy.html")


def legal_terms(request):
    return render(request, "legal/terms.html")


def legal_dpa(request):
    return render(request, "legal/dpa.html")


# ────────────────────────────────────────────────────────────────────────────
# PUBLIC — self-service signup (creates Tenant + admin User)
# ────────────────────────────────────────────────────────────────────────────
@require_http_methods(["GET", "POST"])
def signup(request):
    """Self-service workspace signup. Creates Tenant + HR admin user and logs them in."""
    if request.user.is_authenticated:
        return redirect("tenants:dashboard")

    initial = {"company_name": "", "subdomain": "", "admin_email": ""}
    error = None

    if request.method == "POST":
        company_name = (request.POST.get("company_name") or "").strip()
        subdomain = (request.POST.get("subdomain") or "").strip().lower()
        admin_email = (request.POST.get("admin_email") or "").strip().lower()
        admin_password = request.POST.get("admin_password") or ""
        admin_password2 = request.POST.get("admin_password2") or ""
        accept_terms = request.POST.get("accept_terms")

        initial = {"company_name": company_name, "subdomain": subdomain, "admin_email": admin_email}

        if not accept_terms:
            error = "Please accept the terms to continue."
        elif admin_password != admin_password2:
            error = "Passwords don't match."
        else:
            try:
                tenant, user = provision_tenant(
                    company_name=company_name,
                    subdomain=subdomain,
                    admin_email=admin_email,
                    admin_password=admin_password,
                )
                login(request, user, backend="apps.accounts.backends.TenantAuthBackend")
                messages.success(
                    request,
                    f"Welcome to {tenant.name}! Your workspace is ready. "
                    f"Start by adding your first employee or importing a roster.",
                )
                return redirect("tenants:dashboard")
            except ValueError as exc:
                error = str(exc)
            except Exception as exc:
                error = f"Something went wrong: {exc}. Please try again or contact support."

    return render(request, "auth/signup.html", {"initial": initial, "error": error})


@login_required
def dashboard(request):
    """
    Role-aware dashboard:
      - HR admin → org-wide analytics
      - Manager  → team-focused analytics
      - Employee → personal analytics + punch card
    """
    user = request.user
    tenant = request.tenant
    if not tenant:
        return render(request, "dashboard/index.html", {})

    today = timezone.localdate()
    month_start = today.replace(day=1)

    ctx = {
        "today": today,
        "is_hr_admin": user.is_hr_admin,
        "is_manager": user.is_manager and not user.is_hr_admin,
        "is_employee_only": not user.is_hr_admin and not user.is_manager,
        "has_employee_profile": bool(getattr(user, "employee_profile", None)),
        "needs_employee_profile": (
            not user.is_hr_admin
            and not getattr(user, "employee_profile", None)
        ),
        "needs_manager_profile": (
            user.is_manager
            and not user.is_hr_admin
            and not getattr(user, "employee_profile", None)
        ),
    }

    if user.is_hr_admin:
        ctx.update(_hr_admin_analytics(tenant, today, month_start))
    elif user.is_manager:
        ctx.update(_manager_analytics(tenant, user, today, month_start))
    else:
        ctx.update(_employee_analytics(tenant, user, today, month_start))

    return render(request, "dashboard/index.html", ctx)


# ────────────────────────────────────────────────────────────────────────────
# HR ADMIN — org-wide analytics
# ────────────────────────────────────────────────────────────────────────────
def _hr_admin_analytics(tenant, today, month_start):
    from apps.employees.models import Employee
    from apps.attendance.models import AttendanceRecord, AttendanceRegularization
    from apps.leaves.models import LeaveRequest
    from apps.payroll.models import PayrollRun
    from apps.performance.models import PerformanceReview, ReviewCycle

    active_emps = Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")

    total_employees = active_emps.count()
    present_today = AttendanceRecord.objects.filter(
        tenant=tenant, attendance_date=today, status="present"
    ).count()
    on_leave_today = LeaveRequest.objects.filter(
        tenant=tenant, status="approved", from_date__lte=today, to_date__gte=today
    ).count()
    pending_leave_approvals = LeaveRequest.objects.filter(tenant=tenant, status="pending").count()
    pending_regularizations = AttendanceRegularization.objects.filter(
        tenant=tenant, status="pending"
    ).count()

    kpis = {
        "total_employees": total_employees,
        "present_today": present_today,
        "on_leave_today": on_leave_today,
        "absent_today": max(0, total_employees - present_today - on_leave_today),
        "attendance_rate_pct": (
            int(round(present_today / total_employees * 100)) if total_employees else 0
        ),
        "pending_leave_approvals": pending_leave_approvals,
        "pending_regularizations": pending_regularizations,
        "new_joiners_this_month": active_emps.filter(date_of_joining__gte=month_start).count(),
        "exits_this_month": Employee.objects.filter(
            tenant=tenant, date_of_exit__gte=month_start, date_of_exit__lte=today
        ).count(),
    }

    # Department-wise headcount
    dept_data = list(
        active_emps.values("department__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:8]
    )
    dept_chart = {
        "labels": [d["department__name"] or "Unassigned" for d in dept_data],
        "data": [d["count"] for d in dept_data],
    }

    # Gender ratio
    gender_data = list(active_emps.values("gender").annotate(count=Count("id")))
    gender_chart = {
        "labels": [(d["gender"] or "Not Specified").title() for d in gender_data],
        "data": [d["count"] for d in gender_data],
    }

    # Attendance trend — last 14 days
    last_14 = [today - datetime.timedelta(days=i) for i in range(13, -1, -1)]
    daily_counts = (
        AttendanceRecord.objects.filter(
            tenant=tenant, attendance_date__in=last_14, status="present"
        )
        .values("attendance_date").annotate(c=Count("id"))
    )
    counts_by_date = {d["attendance_date"]: d["c"] for d in daily_counts}
    attendance_trend = {
        "labels": [d.strftime("%d %b") for d in last_14],
        "data": [counts_by_date.get(d, 0) for d in last_14],
    }

    # Recent payroll runs
    recent_runs = PayrollRun.objects.filter(tenant=tenant).order_by("-year", "-month")[:3]

    # Active review cycle progress
    active_cycle = ReviewCycle.objects.filter(tenant=tenant, status="active").first()
    cycle_progress = None
    if active_cycle:
        total_reviews = PerformanceReview.objects.filter(cycle=active_cycle).count()
        acknowledged = PerformanceReview.objects.filter(cycle=active_cycle, status="acknowledged").count()
        submitted = PerformanceReview.objects.filter(cycle=active_cycle, status="submitted").count()
        cycle_progress = {
            "cycle": active_cycle,
            "total": total_reviews,
            "acknowledged": acknowledged,
            "submitted": submitted,
            "draft": max(0, total_reviews - acknowledged - submitted),
            "completion_pct": int(acknowledged / total_reviews * 100) if total_reviews else 0,
        }

    # Recent joiners
    recent_joiners = active_emps.filter(
        date_of_joining__gte=today - datetime.timedelta(days=30)
    ).order_by("-date_of_joining")[:5]

    from apps.hr_ops.models import ServiceRequest
    from apps.payroll.models import ExpenseClaim
    from apps.recruitment.models import JobOpening, JobApplication
    from .setup_checklist import get_setup_checklist

    pending_service_requests = ServiceRequest.objects.filter(
        tenant=tenant, status__in=("pending_it", "in_progress", "pending_manager")
    ).count()
    pending_expenses = ExpenseClaim.objects.filter(tenant=tenant, status="pending").count()

    pending_work = {
        "leaves": kpis["pending_leave_approvals"],
        "regularizations": kpis["pending_regularizations"],
        "service_requests": pending_service_requests,
        "expenses": pending_expenses,
    }
    pending_total = sum(pending_work.values())

    week_end = today + datetime.timedelta(days=7)
    upcoming_leaves = list(
        LeaveRequest.objects.filter(
            tenant=tenant,
            status="approved",
            from_date__gte=today,
            from_date__lte=week_end,
        )
        .select_related("employee", "leave_type")
        .order_by("from_date")[:6]
    )

    birthdays_soon = []
    for emp in active_emps.filter(date_of_birth__isnull=False).only(
        "id", "first_name", "last_name", "date_of_birth"
    ):
        dob = emp.date_of_birth
        for offset in range(8):
            check = today + datetime.timedelta(days=offset)
            if dob.month == check.month and dob.day == check.day:
                birthdays_soon.append(emp)
                break
        if len(birthdays_soon) >= 5:
            break

    open_jobs = JobOpening.objects.filter(tenant=tenant, status="published").count()
    pending_applications = JobApplication.objects.filter(
        tenant=tenant, status__in=("applied", "screening", "interview")
    ).count()

    setup_checklist = get_setup_checklist(tenant)
    latest_run = recent_runs[0] if recent_runs else None
    setup_pct = setup_checklist["percent"]
    if total_employees == 0:
        health_score = setup_pct
    else:
        health_score = min(
            100,
            max(
                0,
                int(kpis["attendance_rate_pct"] * 0.5)
                + int(max(0, 25 - pending_total * 5))
                + int(setup_pct * 0.25),
            ),
        )

    sparklines = {
        "attendance": _sparkline_paths(
            attendance_trend["data"],
            "#10B981",
            "rgba(16, 185, 129, 0.18)",
            "attendance",
        ),
        "open_roles": _sparkline_paths(
            _ramp_series(open_jobs),
            "#3B82F6",
            "rgba(59, 130, 246, 0.18)",
            "roles",
        ),
        "pending": _sparkline_paths(
            _ramp_series(pending_total),
            "#F97316",
            "rgba(249, 115, 22, 0.18)",
            "pending",
        ),
        "growth": _sparkline_paths(
            _ramp_series(kpis["new_joiners_this_month"]),
            "#8B5CF6",
            "rgba(139, 92, 246, 0.18)",
            "growth",
        ),
    }

    insights = {
        "health_score": health_score,
        "pending_total": pending_total,
        "open_jobs": open_jobs,
        "pending_applications": pending_applications,
        "sparklines": sparklines,
        "latest_payroll_net": latest_run.total_net if latest_run else None,
        "latest_payroll_period": (
            f"{latest_run.year}-{latest_run.month:02d}" if latest_run else None
        ),
        "avg_daily_present": (
            int(round(sum(attendance_trend["data"]) / len(attendance_trend["data"])))
            if attendance_trend["data"]
            else 0
        ),
    }

    return {
        "kpis": kpis,
        "insights": insights,
        # Raw dicts for templates that render via {% ... json_script %} (XSS-safe).
        "dept_chart": dept_chart,
        "gender_chart": gender_chart,
        "attendance_trend": attendance_trend,
        # Pre-serialized JSON for the redesigned dashboard.
        "dept_chart_json": json.dumps(dept_chart),
        "gender_chart_json": json.dumps(gender_chart),
        "attendance_trend_json": json.dumps(attendance_trend),
        "recent_runs": recent_runs,
        "cycle_progress": cycle_progress,
        "recent_joiners": recent_joiners,
        "upcoming_leaves": upcoming_leaves,
        "birthdays_soon": birthdays_soon,
        "setup_checklist": setup_checklist,
        "pending_work": pending_work,
    }


# ────────────────────────────────────────────────────────────────────────────
# MANAGER — team-focused analytics
# ────────────────────────────────────────────────────────────────────────────
def _manager_analytics(tenant, user, today, month_start):
    from apps.employees.models import Employee
    from apps.attendance.models import AttendanceRecord
    from apps.leaves.models import LeaveRequest
    from apps.performance.models import PerformanceReview, ReviewCycle

    manager_emp = getattr(user, "employee_profile", None)
    if not manager_emp:
        return {"kpis": {}, "team": []}

    team = Employee.objects.filter(
        tenant=tenant, reporting_manager=manager_emp, employment_status="active"
    )
    team_ids = list(team.values_list("id", flat=True))

    kpis = {
        "team_size": team.count(),
        "team_present_today": AttendanceRecord.objects.filter(
            tenant=tenant, employee_id__in=team_ids, attendance_date=today, status="present"
        ).count(),
        "team_on_leave_today": LeaveRequest.objects.filter(
            tenant=tenant, employee_id__in=team_ids, status="approved",
            from_date__lte=today, to_date__gte=today
        ).count(),
        "pending_leave_approvals": LeaveRequest.objects.filter(
            tenant=tenant, employee_id__in=team_ids, status="pending"
        ).count(),
    }

    # Active review cycle: count pending vs done reviews
    active_cycle = ReviewCycle.objects.filter(tenant=tenant, status="active").first()
    reviews_pending = 0
    reviews_completed = 0
    if active_cycle:
        for emp in team:
            review = PerformanceReview.objects.filter(cycle=active_cycle, employee=emp).first()
            if not review or review.status == "draft":
                reviews_pending += 1
            elif review.status == "acknowledged":
                reviews_completed += 1
    kpis["reviews_pending"] = reviews_pending
    kpis["reviews_completed"] = reviews_completed

    # Team attendance breakdown this month
    month_recs = AttendanceRecord.objects.filter(
        tenant=tenant, employee_id__in=team_ids, attendance_date__gte=month_start
    )
    status_counts = list(month_recs.values("status").annotate(c=Count("id")))
    team_attendance_chart = {
        "labels": [s["status"].replace("_", " ").title() for s in status_counts],
        "data": [s["c"] for s in status_counts],
    }

    # Per-team-member present days this month
    member_present = list(
        month_recs.filter(status="present")
        .values("employee__first_name", "employee__last_name")
        .annotate(c=Count("id")).order_by("-c")
    )
    team_present_chart = {
        "labels": [f"{m['employee__first_name']} {m['employee__last_name']}" for m in member_present],
        "data": [m["c"] for m in member_present],
    }

    # Pending leave requests from team
    pending_leaves = LeaveRequest.objects.filter(
        tenant=tenant, employee_id__in=team_ids, status="pending"
    ).select_related("employee", "leave_type").order_by("-applied_at")[:5]

    return {
        "kpis": kpis,
        "team": team,
        "active_cycle": active_cycle,
        "team_attendance_chart": team_attendance_chart,
        "team_present_chart": team_present_chart,
        "pending_leaves": pending_leaves,
    }


# ────────────────────────────────────────────────────────────────────────────
# EMPLOYEE — personal analytics
# ────────────────────────────────────────────────────────────────────────────
def _employee_analytics(tenant, user, today, month_start):
    from apps.attendance.models import AttendanceRecord
    from apps.leaves.models import LeaveRequest, LeaveBalance, HolidayCalendar
    from apps.payroll.models import Payslip
    from apps.performance.models import PerformanceReview

    emp = getattr(user, "employee_profile", None)
    if not emp:
        return {"kpis": {}}

    month_recs = AttendanceRecord.objects.filter(
        tenant=tenant, employee=emp, attendance_date__gte=month_start, attendance_date__lte=today
    )
    present = month_recs.filter(status="present").count()
    absent = month_recs.filter(status="absent").count()
    half_day = month_recs.filter(status="half_day").count()
    on_leave = month_recs.filter(status="on_leave").count()

    balances = list(LeaveBalance.objects.filter(tenant=tenant, employee=emp, year=today.year).select_related("leave_type"))
    total_available = sum(b.available for b in balances)

    latest_payslip = Payslip.objects.filter(
        tenant=tenant, employee=emp, is_published=True
    ).select_related("payroll_record").order_by("-year", "-month").first()

    kpis = {
        "present_this_month": present,
        "absent_this_month": absent,
        "half_days": half_day,
        "on_leave_days": on_leave,
        "total_leave_balance": total_available,
        "latest_net_pay": latest_payslip.payroll_record.net_payable if latest_payslip else Decimal("0"),
        "pending_leave_requests": LeaveRequest.objects.filter(
            tenant=tenant, employee=emp, status="pending"
        ).count(),
    }

    balance_chart = {
        "labels": [f"{b.leave_type.code}" for b in balances],
        "data": [float(b.available) for b in balances],
    }

    att_chart = {
        "labels": ["Present", "Half Day", "On Leave", "Absent"],
        "data": [present, half_day, on_leave, absent],
    }

    last_payslips = Payslip.objects.filter(
        tenant=tenant, employee=emp, is_published=True
    ).select_related("payroll_record").order_by("-year", "-month")[:3]

    recent_reviews = PerformanceReview.objects.filter(
        employee=emp
    ).exclude(status="draft").select_related("cycle").order_by("-created_at")[:3]

    cal = HolidayCalendar.objects.filter(tenant=tenant, year=today.year, is_default=True).first()
    upcoming_holidays = []
    if cal:
        upcoming_holidays = list(
            cal.holidays.filter(
                holiday_date__gte=today,
                holiday_date__lte=today + datetime.timedelta(days=60),
                is_active=True,
            ).order_by("holiday_date")[:5]
        )

    recent_leaves = LeaveRequest.objects.filter(
        tenant=tenant, employee=emp
    ).select_related("leave_type").order_by("-applied_at")[:5]

    return {
        "kpis": kpis,
        "balance_chart": balance_chart,
        "att_chart": att_chart,
        "balances": balances,
        "last_payslips": last_payslips,
        "recent_reviews": recent_reviews,
        "upcoming_holidays": upcoming_holidays,
        "recent_leaves": recent_leaves,
    }
