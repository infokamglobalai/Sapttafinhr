"""
Attrition / flight-risk scoring.

Pure-Python heuristic over data already in the DB. No ML training, no API.

Scoring model (each factor returns points 0-N; summed and capped at 100):
  * Tenure bracket           - 0-15  (new hires + 7yr+ are highest risk)
  * Leave usage spike        - 0-20  (z-score vs team in last 60 days)
  * Attendance trend         - 0-15  (absent/regularization frequency uptick)
  * Performance rating drop  - 0-25  (latest cycle vs previous)
  * Time-since-promotion     - 0-15  (proxy: time since salary change)
  * Notice-period flag       - 0-30  (employment_status == 'notice_period')
  * Manager churn            - 0-10  (manager recently exited)

Bands:  0-29 = low, 30-59 = medium, 60-100 = high.

Output reasoning is human-readable so HR can act on the score, not just react to it.
"""
import datetime
import statistics
from decimal import Decimal
from django.utils import timezone
from django.db import transaction


# ──────────────────────────────────────────────────────────────────────────
# Factor functions: each returns (points, label, evidence_dict)
# ──────────────────────────────────────────────────────────────────────────
def _factor_tenure(emp, today):
    if not emp.date_of_joining:
        return 0, "Unknown tenure", {}
    years = (today - emp.date_of_joining).days / 365.25
    if years < 0.5:
        return 12, f"New hire ({years:.1f}y) - early-stage churn risk", {"years": round(years, 2)}
    if years < 1.5:
        return 8, f"In first 18 months ({years:.1f}y)", {"years": round(years, 2)}
    if years > 7:
        return 10, f"Long tenure ({years:.1f}y) - growth-fatigue risk", {"years": round(years, 2)}
    return 0, f"Healthy tenure ({years:.1f}y)", {"years": round(years, 2)}


def _factor_leave_spike(emp, today):
    """Spike in leave usage vs employee's own rolling average."""
    from apps.leaves.models import LeaveRequest
    sixty_ago = today - datetime.timedelta(days=60)
    one_eighty_ago = today - datetime.timedelta(days=180)

    recent = LeaveRequest.objects.filter(
        employee=emp, status="approved",
        from_date__gte=sixty_ago, from_date__lte=today,
    ).count()
    baseline = LeaveRequest.objects.filter(
        employee=emp, status="approved",
        from_date__gte=one_eighty_ago, from_date__lt=sixty_ago,
    ).count()
    # Normalize baseline to a 60-day window (it covers 120 days)
    baseline_60 = baseline / 2

    if recent >= 4 and recent >= baseline_60 * 2:
        return 18, f"Leave usage spiked: {recent} in last 60d vs ~{baseline_60:.0f} prior", {
            "recent_60d": recent, "baseline_60d": round(baseline_60, 1),
        }
    if recent >= 3 and recent > baseline_60 + 1:
        return 10, f"Leave usage rising: {recent} in last 60d", {"recent_60d": recent}
    return 0, "Leave usage stable", {"recent_60d": recent}


def _factor_attendance(emp, today):
    """Frequency of regularization requests + late punches."""
    from apps.attendance.models import AttendanceRegularization
    sixty_ago = today - datetime.timedelta(days=60)

    regs = AttendanceRegularization.objects.filter(
        employee=emp, attendance_date__gte=sixty_ago,
    ).count()
    if regs >= 6:
        return 15, f"{regs} regularization requests in 60d - attendance friction", {"regs_60d": regs}
    if regs >= 3:
        return 8, f"{regs} regularization requests in 60d", {"regs_60d": regs}
    return 0, "Clean attendance pattern", {"regs_60d": regs}


def _factor_review(emp):
    """Compare last two performance reviews."""
    from apps.performance.models import PerformanceReview
    reviews = list(
        PerformanceReview.objects.filter(employee=emp).exclude(overall_rating__isnull=True)
        .order_by("-cycle__review_period_end")[:2]
    )
    if len(reviews) < 2:
        if reviews and reviews[0].overall_rating and reviews[0].overall_rating <= 2:
            return 18, f"Low recent rating ({reviews[0].overall_rating}/5)", {"latest": reviews[0].overall_rating}
        return 0, "Insufficient review history", {}
    latest, prev = reviews[0].overall_rating, reviews[1].overall_rating
    if latest is None or prev is None:
        return 0, "Reviews missing ratings", {}
    drop = prev - latest
    if drop >= 2:
        return 25, f"Rating dropped sharply: {prev} -> {latest}", {"prev": prev, "latest": latest}
    if drop >= 1:
        return 15, f"Rating dropped: {prev} -> {latest}", {"prev": prev, "latest": latest}
    if latest <= 2:
        return 15, f"Sustained low rating ({latest}/5)", {"latest": latest}
    return 0, f"Rating stable ({latest}/5)", {"latest": latest}


def _factor_promotion_lag(emp, today):
    """Time since last salary record (proxy for last comp adjustment)."""
    from apps.payroll.models import EmployeeSalary
    last_change = (
        EmployeeSalary.objects.filter(employee=emp)
        .order_by("-effective_date").values_list("effective_date", flat=True).first()
    )
    if not last_change:
        return 0, "No salary history", {}
    months_since = (today - last_change).days / 30
    if months_since >= 30:
        return 15, f"No salary change in {months_since:.0f} months", {"months": int(months_since)}
    if months_since >= 18:
        return 8, f"No salary change in {months_since:.0f} months", {"months": int(months_since)}
    return 0, f"Comp adjusted {months_since:.0f}mo ago", {"months": int(months_since)}


def _factor_notice_period(emp):
    if emp.employment_status == "notice_period":
        return 30, "Currently serving notice period", {}
    return 0, "Active employment", {}


def _factor_manager_churn(emp, today):
    """If their manager exited in the last 90 days, risk goes up."""
    if not emp.reporting_manager:
        return 0, "No reporting manager assigned", {}
    mgr = emp.reporting_manager
    ninety_ago = today - datetime.timedelta(days=90)
    if mgr.date_of_exit and ninety_ago <= mgr.date_of_exit <= today:
        return 10, f"Manager {mgr.full_name} exited recently", {
            "manager_exit": mgr.date_of_exit.isoformat(),
        }
    if mgr.employment_status == "notice_period":
        return 8, f"Manager {mgr.full_name} is on notice", {}
    return 0, "Manager stable", {}


FACTORS = [
    ("Tenure",          _factor_tenure,         True),   # passes today
    ("Leave spike",     _factor_leave_spike,    True),
    ("Attendance",      _factor_attendance,     True),
    ("Performance",     _factor_review,         False),  # no date arg
    ("Promotion lag",   _factor_promotion_lag,  True),
    ("Notice period",   _factor_notice_period,  False),
    ("Manager churn",   _factor_manager_churn,  True),
]


def score_employee(emp, today=None):
    """Compute one employee's attrition score + reasoning."""
    today = today or timezone.localdate()
    factors = []
    total = 0
    for label, fn, needs_today in FACTORS:
        try:
            if needs_today:
                points, reason, evidence = fn(emp, today)
            else:
                points, reason, evidence = fn(emp)
        except Exception as exc:
            points, reason, evidence = 0, f"({label} signal unavailable)", {"error": str(exc)}
        if points > 0:
            factors.append({
                "label": label,
                "points": points,
                "reason": reason,
                "evidence": evidence,
            })
        total += points

    score = min(100, total)
    if score >= 60:
        band = "high"
    elif score >= 30:
        band = "medium"
    else:
        band = "low"
    return score, band, factors


# ──────────────────────────────────────────────────────────────────────────
# Batch entry point
# ──────────────────────────────────────────────────────────────────────────
@transaction.atomic
def recompute_all(tenant, today=None):
    """Score every active employee in the tenant; upsert AttritionScore rows."""
    from .models import Employee, AttritionScore

    today = today or timezone.localdate()
    active = Employee.objects.filter(tenant=tenant, is_active=True).exclude(
        employment_status="exited"
    )

    counts = {"low": 0, "medium": 0, "high": 0}
    for emp in active:
        score, band, factors = score_employee(emp, today)
        AttritionScore.objects.update_or_create(
            tenant=tenant, employee=emp,
            defaults={"score": score, "risk_band": band, "factors": factors},
        )
        counts[band] += 1

    return counts
