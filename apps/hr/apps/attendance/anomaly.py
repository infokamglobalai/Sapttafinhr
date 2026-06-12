"""Standalone attendance anomaly detection — HR alert system.

Scans recent attendance records and flags:
  1. Unexcused absences (absent without approved leave)
  2. Consecutive absence streak (≥ 3 working days)
  3. Late arrival trend (≥ 3 days late in a 7-day window)
  4. Overtime abuse (excessive overtime ≥ 5 days in last 30 days)

Generates Notification records for HR managers.
"""
from __future__ import annotations

import datetime
import logging

from django.utils import timezone

logger = logging.getLogger(__name__)

# Thresholds
CONSECUTIVE_ABSENT_THRESHOLD = 3      # days
LATE_ARRIVALS_IN_WEEK_THRESHOLD = 3   # out of 7 days
OVERTIME_ABUSE_DAYS = 5               # days in 30-day window
OVERTIME_ABUSE_MINUTES = 120          # minutes/day to count as "excessive"
SCAN_WINDOW_DAYS = 7                  # default lookback for anomaly scan


def detect_anomalies(tenant, since_days: int = SCAN_WINDOW_DAYS) -> list[dict]:
    """Scan attendance records and return a list of anomaly dicts.

    Each dict: {type, employee_id, employee_name, reason, severity, evidence}
    """
    from apps.attendance.models import AttendanceRecord
    from apps.leaves.models import LeaveRequest

    today = timezone.localdate()
    window_start = today - datetime.timedelta(days=since_days)
    thirty_ago = today - datetime.timedelta(days=30)

    records = (
        AttendanceRecord.objects
        .filter(tenant=tenant, attendance_date__gte=window_start, attendance_date__lte=today)
        .select_related("employee", "shift")
        .order_by("employee_id", "attendance_date")
    )

    # Approved leave dates per employee for cross-referencing
    approved_leaves: dict[int, set] = {}
    for lr in LeaveRequest.objects.filter(
        employee__tenant=tenant,
        status="approved",
        from_date__lte=today,
        to_date__gte=window_start,
    ).select_related("employee"):
        emp_id = lr.employee_id
        d = lr.from_date
        while d <= lr.to_date:
            approved_leaves.setdefault(emp_id, set()).add(d)
            d += datetime.timedelta(days=1)

    anomalies: list[dict] = []

    # Group records by employee
    by_employee: dict = {}
    for rec in records:
        by_employee.setdefault(rec.employee_id, []).append(rec)

    for emp_id, emp_records in by_employee.items():
        emp = emp_records[0].employee
        emp_name = getattr(emp, "full_name", str(emp))

        emp_leaves = approved_leaves.get(emp_id, set())

        # ── 1. Unexcused absences ─────────────────────────────────────────
        unexcused = [
            r for r in emp_records
            if r.status == "absent"
            and r.attendance_date not in emp_leaves
            and not r.is_regularized
        ]
        if unexcused:
            dates = ", ".join(str(r.attendance_date) for r in unexcused)
            anomalies.append({
                "type": "unexcused_absence",
                "employee_id": emp_id,
                "employee_name": emp_name,
                "reason": f"{len(unexcused)} unexcused absence(s): {dates}",
                "severity": "high" if len(unexcused) >= 2 else "medium",
                "evidence": {"dates": [str(r.attendance_date) for r in unexcused]},
            })

        # ── 2. Consecutive absence streak ─────────────────────────────────
        streak = _longest_consecutive_absent(emp_records, emp_leaves)
        if streak >= CONSECUTIVE_ABSENT_THRESHOLD:
            anomalies.append({
                "type": "consecutive_absences",
                "employee_id": emp_id,
                "employee_name": emp_name,
                "reason": f"{streak} consecutive absent days",
                "severity": "high",
                "evidence": {"streak_days": streak},
            })

        # ── 3. Late arrival trend ─────────────────────────────────────────
        late_days = [r for r in emp_records if r.late_by_minutes > 0]
        if len(late_days) >= LATE_ARRIVALS_IN_WEEK_THRESHOLD:
            avg_late = sum(r.late_by_minutes for r in late_days) // len(late_days)
            anomalies.append({
                "type": "late_arrival_trend",
                "employee_id": emp_id,
                "employee_name": emp_name,
                "reason": f"Late {len(late_days)} times in last {since_days} days (avg {avg_late} min late)",
                "severity": "medium",
                "evidence": {"late_days": len(late_days), "avg_late_minutes": avg_late},
            })

    # ── 4. Overtime abuse (30-day window, separate query) ─────────────────
    ot_records = (
        AttendanceRecord.objects
        .filter(
            tenant=tenant,
            attendance_date__gte=thirty_ago,
            overtime_minutes__gte=OVERTIME_ABUSE_MINUTES,
        )
        .select_related("employee")
    )
    ot_by_emp: dict = {}
    for r in ot_records:
        ot_by_emp.setdefault(r.employee_id, {"emp": r.employee, "days": 0, "total_ot": 0})
        ot_by_emp[r.employee_id]["days"] += 1
        ot_by_emp[r.employee_id]["total_ot"] += r.overtime_minutes

    for emp_id, data in ot_by_emp.items():
        if data["days"] >= OVERTIME_ABUSE_DAYS:
            emp_name = getattr(data["emp"], "full_name", str(data["emp"]))
            avg_ot = data["total_ot"] // data["days"]
            anomalies.append({
                "type": "overtime_abuse",
                "employee_id": emp_id,
                "employee_name": emp_name,
                "reason": (
                    f"Excessive overtime: {data['days']} days in last 30 days "
                    f"(avg {avg_ot} min/day)"
                ),
                "severity": "medium",
                "evidence": {"ot_days": data["days"], "avg_ot_minutes": avg_ot},
            })

    return anomalies


def notify_anomalies(tenant, anomalies: list[dict]) -> int:
    """Create Notification records for HR managers in the tenant."""
    if not anomalies:
        return 0

    from apps.hr_ops.models import Notification
    from apps.accounts.models import User

    # HR managers: users with is_staff or is_hr_admin flag, or fallback to superusers
    try:
        hr_users = list(
            User.objects.filter(tenant=tenant, is_active=True)
            .filter(groups__name__icontains="HR")
        )
        if not hr_users:
            hr_users = list(User.objects.filter(tenant=tenant, is_staff=True, is_active=True))
        if not hr_users:
            hr_users = list(User.objects.filter(tenant=tenant, is_superuser=True, is_active=True))
    except Exception:
        logger.exception("Could not find HR users for anomaly notifications")
        return 0

    SEVERITY_EMOJI = {"high": "🔴", "medium": "🟡", "low": "🟢"}
    TYPE_LABELS = {
        "unexcused_absence": "Unexcused Absence",
        "consecutive_absences": "Consecutive Absences",
        "late_arrival_trend": "Late Arrival Trend",
        "overtime_abuse": "Overtime Abuse",
    }

    count = 0
    for anomaly in anomalies:
        emoji = SEVERITY_EMOJI.get(anomaly.get("severity", "low"), "🟡")
        label = TYPE_LABELS.get(anomaly["type"], anomaly["type"].replace("_", " ").title())
        title = f"{emoji} Attendance Alert: {label} — {anomaly['employee_name']}"
        message = anomaly["reason"]

        for user in hr_users:
            try:
                Notification.objects.create(
                    tenant=tenant,
                    recipient=user,
                    notification_type="general",
                    title=title,
                    message=message,
                    action_url=f"/attendance/?employee={anomaly['employee_id']}",
                )
                count += 1
            except Exception:
                logger.exception("Failed to create attendance anomaly notification")

    return count


def run_scan(tenant, since_days: int = SCAN_WINDOW_DAYS) -> dict:
    """Convenience entry point: detect + notify. Returns summary."""
    anomalies = detect_anomalies(tenant, since_days=since_days)
    notified = notify_anomalies(tenant, anomalies)
    by_type: dict[str, int] = {}
    for a in anomalies:
        by_type[a["type"]] = by_type.get(a["type"], 0) + 1
    return {
        "total": len(anomalies),
        "notified": notified,
        "by_type": by_type,
        "anomalies": anomalies,
    }


def _longest_consecutive_absent(records: list, approved_leave_dates: set) -> int:
    """Return the longest streak of absent (non-leave) days in record list."""
    streak = best = 0
    for r in sorted(records, key=lambda x: x.attendance_date):
        if r.status == "absent" and r.attendance_date not in approved_leave_dates:
            streak += 1
            best = max(best, streak)
        else:
            streak = 0
    return best
