"""
Attendance service layer.
- GPS geo-fence validation
- Daily attendance processing (called by Celery task)
- Monthly summary computation
"""
import math
import datetime
from django.utils import timezone

from .models import AttendanceLog, AttendanceRecord, Shift, EmployeeShiftAssignment, MonthlyAttendanceSummary


# ---------------------------------------------------------------------------
# Geo-fence
# ---------------------------------------------------------------------------
def haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """Return distance in metres between two GPS coordinates."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlambda = math.radians(float(lon2) - float(lon1))
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def validate_geo_fence(employee, latitude, longitude) -> tuple[bool, object | None]:
    """
    Check if punch location is within any active office location's geo-fence.
    Returns (is_valid, matched_location_or_None).
    """
    from apps.employees.models import OfficeLocation

    locations = OfficeLocation.objects.filter(
        tenant=employee.tenant,
        is_active=True,
        latitude__isnull=False,
        longitude__isnull=False,
    )
    for loc in locations:
        dist = haversine_distance(latitude, longitude, loc.latitude, loc.longitude)
        if dist <= loc.geo_fence_radius_m:
            return True, loc
    return False, None


# ---------------------------------------------------------------------------
# Employee shift lookup
# ---------------------------------------------------------------------------
def get_employee_shift(employee, date: datetime.date) -> Shift | None:
    """Return the active shift for an employee on a given date."""
    assignment = (
        EmployeeShiftAssignment.objects.filter(
            employee=employee, effective_date__lte=date
        )
        .select_related("shift")
        .order_by("-effective_date")
        .first()
    )
    return assignment.shift if assignment else None


# ---------------------------------------------------------------------------
# Daily attendance processing
# ---------------------------------------------------------------------------
def process_daily_attendance(employee, date: datetime.date) -> AttendanceRecord:
    """
    Compute a single day's AttendanceRecord from raw logs.
    Idempotent — safe to run multiple times for the same employee+date.
    """
    from apps.leaves.models import LeaveRequest
    from apps.leaves.services import get_holiday

    tenant = employee.tenant
    shift = get_employee_shift(employee, date)

    # Fetch all logs for this employee on this day, ordered by time
    logs = list(
        AttendanceLog.objects.filter(
            employee=employee,
            log_time__date=date,
        ).order_by("log_time")
    )

    # Check public holiday
    holiday = get_holiday(tenant, date)
    if holiday:
        record, _ = AttendanceRecord.objects.update_or_create(
            tenant=tenant, employee=employee, attendance_date=date,
            defaults={"status": "holiday", "shift": shift, "processed_at": timezone.now()},
        )
        return record

    # Check week off
    if shift and shift.is_week_off(date):
        record, _ = AttendanceRecord.objects.update_or_create(
            tenant=tenant, employee=employee, attendance_date=date,
            defaults={"status": "week_off", "shift": shift, "processed_at": timezone.now()},
        )
        return record

    # Check approved leave
    approved_leave = LeaveRequest.objects.filter(
        employee=employee,
        status="approved",
        from_date__lte=date,
        to_date__gte=date,
    ).first()
    if approved_leave:
        record, _ = AttendanceRecord.objects.update_or_create(
            tenant=tenant, employee=employee, attendance_date=date,
            defaults={"status": "on_leave", "shift": shift, "processed_at": timezone.now()},
        )
        return record

    # No logs → absent
    if not logs:
        record, _ = AttendanceRecord.objects.update_or_create(
            tenant=tenant, employee=employee, attendance_date=date,
            defaults={"status": "absent", "shift": shift, "processed_at": timezone.now()},
        )
        return record

    # Compute working time from first_in / last_out
    check_ins = [l for l in logs if l.log_type == "check_in"]
    check_outs = [l for l in logs if l.log_type == "check_out"]

    first_in = check_ins[0].log_time if check_ins else None
    last_out = check_outs[-1].log_time if check_outs else None

    if not first_in:
        # Only check-outs recorded — treat as absent
        record, _ = AttendanceRecord.objects.update_or_create(
            tenant=tenant, employee=employee, attendance_date=date,
            defaults={"status": "absent", "shift": shift, "processed_at": timezone.now()},
        )
        return record

    working_minutes = 0
    late_by = 0
    overtime_minutes = 0

    if last_out and last_out > first_in:
        working_minutes = int((last_out - first_in).total_seconds() / 60)
        break_mins = shift.break_duration_minutes if shift else 0
        net_minutes = max(0, working_minutes - break_mins)
    else:
        net_minutes = 0

    # Late arrival
    if shift:
        shift_start_today = datetime.datetime.combine(date, shift.start_time)
        shift_start_today = timezone.make_aware(shift_start_today)
        grace_cutoff = shift_start_today + datetime.timedelta(minutes=shift.grace_in_minutes)
        if first_in > grace_cutoff:
            late_by = int((first_in - grace_cutoff).total_seconds() / 60)

    # Determine status
    if shift:
        half_threshold = shift.half_day_threshold_minutes
        full_threshold = shift.full_day_threshold_minutes
        ot_threshold = shift.overtime_after_minutes
    else:
        half_threshold, full_threshold, ot_threshold = 240, 360, 480

    if net_minutes == 0:
        status = "absent"
    elif net_minutes < half_threshold:
        status = "half_day"
    else:
        status = "present"

    if net_minutes > ot_threshold:
        overtime_minutes = net_minutes - ot_threshold

    record, _ = AttendanceRecord.objects.update_or_create(
        tenant=tenant, employee=employee, attendance_date=date,
        defaults={
            "shift": shift,
            "first_in_time": first_in,
            "last_out_time": last_out,
            "total_working_minutes": working_minutes,
            "break_minutes": shift.break_duration_minutes if shift else 0,
            "net_working_minutes": net_minutes,
            "status": status,
            "overtime_minutes": overtime_minutes,
            "late_by_minutes": late_by,
            "processed_at": timezone.now(),
        },
    )
    return record


def compute_monthly_summary(tenant, employee, year: int, month: int) -> MonthlyAttendanceSummary:
    """Compute and persist MonthlyAttendanceSummary for one employee."""
    from django.db.models import Sum, Count

    records = AttendanceRecord.objects.filter(
        tenant=tenant, employee=employee, attendance_date__year=year, attendance_date__month=month
    )

    present = records.filter(status="present").count()
    half = records.filter(status="half_day").count()
    absent = records.filter(status="absent").count()
    on_leave = records.filter(status="on_leave").count()
    holiday = records.filter(status="holiday").count()
    week_off = records.filter(status="week_off").count()
    lop = records.filter(status="lop").count()
    total_ot_mins = records.aggregate(s=Sum("overtime_minutes"))["s"] or 0
    late_count = records.filter(late_by_minutes__gt=0).count()

    summary, _ = MonthlyAttendanceSummary.objects.update_or_create(
        tenant=tenant, employee=employee, year=year, month=month,
        defaults={
            "total_working_days": records.exclude(status__in=["holiday", "week_off"]).count(),
            "present_days": present + half * 0.5,
            "absent_days": absent,
            "half_days": half,
            "on_leave_days": on_leave,
            "holiday_days": holiday,
            "week_off_days": week_off,
            "lop_days": lop,
            "overtime_hours": round(total_ot_mins / 60, 2),
            "late_arrivals": late_count,
            "computed_at": timezone.now(),
        },
    )
    return summary
