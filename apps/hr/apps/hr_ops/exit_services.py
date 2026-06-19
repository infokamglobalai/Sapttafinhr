"""Exit workflow: finalize, auto-disable on last working day."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee
from apps.hr_ops.models import ExitRequest


@transaction.atomic
def finalize_exit(exit_request: ExitRequest, actor=None, *, disable_login: bool = True) -> dict:
    """
    Complete an exit: mark employee exited, deactivate profile, optionally block login.
    Safe to call when already finalized (no-op for employee fields).
    """
    employee = exit_request.employee
    tenant = exit_request.tenant
    today = timezone.localdate()
    exit_date = exit_request.last_working_date or today

    changed = False
    if employee.employment_status != "exited":
        employee.employment_status = "exited"
        changed = True
    if employee.date_of_exit != exit_date:
        employee.date_of_exit = exit_date
        changed = True
    if employee.is_active:
        employee.is_active = False
        changed = True
    if changed:
        employee.save(update_fields=["employment_status", "date_of_exit", "is_active"])
        tenant.employee_count = Employee.objects.filter(tenant=tenant, is_active=True).count()
        tenant.save(update_fields=["employee_count"])

    if exit_request.status in ("pending", "accepted"):
        if exit_request.status != "accepted":
            exit_request.status = "accepted"
            exit_request.save(update_fields=["status"])

    from apps.payroll.settlement import settlement_estimate
    from decimal import Decimal

    est = settlement_estimate(employee, exit_date, tenant=tenant)
    exit_request.settlement_amount = Decimal(str(est.get("amount") or 0))
    exit_request.settlement_label = est.get("label") or "Settlement"
    exit_request.settlement_note = est.get("note") or ""
    exit_request.settlement_computed_at = timezone.now()
    exit_request.save(update_fields=[
        "settlement_amount", "settlement_label", "settlement_note", "settlement_computed_at",
    ])

    login_disabled = False
    if disable_login:
        from apps.employees.access_services import revoke_employee_access
        login_disabled = revoke_employee_access(employee)

    try:
        from apps.hr_ops.services import audit_log
        audit_log(
            tenant,
            actor,
            "update",
            "ExitRequest",
            employee,
            f"Exit finalized for {employee.full_name} (last working day {exit_date})",
            details={
                "exit_request_id": exit_request.pk,
                "date_of_exit": exit_date.isoformat(),
                "login_disabled": login_disabled,
            },
        )
    except Exception:
        pass

    return {
        "employee": employee,
        "exit_date": exit_date,
        "login_disabled": login_disabled,
    }


def process_due_exits(tenant, today=None) -> list[dict]:
    """
    Auto-finalize exits whose last working day has passed.
    Runs daily via management command / Celery.
    """
    today = today or timezone.localdate()
    due = (
        ExitRequest.objects.filter(
            tenant=tenant,
            last_working_date__isnull=False,
            last_working_date__lte=today,
            employee__employment_status="notice_period",
        )
        .exclude(status__in=["rejected", "withdrawn"])
        .select_related("employee", "employee__user")
    )

    results = []
    for exit_req in due:
        result = finalize_exit(exit_req, actor=None, disable_login=True)
        results.append({"exit_id": exit_req.pk, "employee": exit_req.employee.full_name, **result})
    return results
