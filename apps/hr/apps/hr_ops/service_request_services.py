"""Service request routing, notifications, and workflow."""
from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

MANAGER_CATEGORIES = {"hardware", "software"}
IT_QUEUE_STATUSES = ("pending_it", "in_progress")


def generate_request_no(tenant) -> str:
    from .models import ServiceRequest

    year = timezone.localdate().year
    prefix = f"SR-{year}-"
    last = (
        ServiceRequest.objects.filter(tenant=tenant, request_no__startswith=prefix)
        .order_by("-request_no")
        .values_list("request_no", flat=True)
        .first()
    )
    if last:
        try:
            num = int(last.split("-")[-1]) + 1
        except ValueError:
            num = 1
    else:
        num = 1
    return f"{prefix}{num:04d}"


def _notify(user, title, message, action_url):
    if not user:
        return
    try:
        from .services import notify
        notify(user, "general", title, message=message, action_url=action_url)
    except Exception:
        logger.exception("Service request notification failed")


def _notify_department_managers(tenant, employee, req, title, message):
    """Notify managers in the same department (dept heads / team leads)."""
    if not employee.department_id:
        return
    from apps.accounts.models import User

    mgr_users = User.objects.filter(
        tenant=tenant,
        is_active=True,
        employee_profile__department_id=employee.department_id,
        user_roles__role__name__in=("manager", "hr_admin", "super_admin"),
    ).distinct()
    for user in mgr_users:
        if employee.user_id and user.pk == employee.user_id:
            continue
        action_url = (
            f"/hr/requests/queue/{req.pk}/"
            if user.is_hr_admin
            else "/hr/requests/team/"
        )
        _notify(user, title, message, action_url)


def _notify_hr_admins(tenant, title, message, action_url):
    from apps.accounts.models import User

    for user in User.objects.filter(
        tenant=tenant, is_active=True, user_roles__role__name__in=("super_admin", "hr_admin")
    ).distinct():
        _notify(user, title, message, action_url)


@transaction.atomic
def submit_service_request(tenant, employee, *, category, subject, description, priority="normal", asset=None, attachment=None):
    from .models import ServiceRequest

    manager = employee.reporting_manager
    if category in MANAGER_CATEGORIES and manager:
        status = "pending_manager"
    else:
        status = "pending_it"

    req = ServiceRequest.objects.create(
        tenant=tenant,
        request_no=generate_request_no(tenant),
        employee=employee,
        category=category,
        subject=subject,
        description=description,
        priority=priority,
        status=status,
        asset=asset,
        attachment=attachment,
        manager=manager if category in MANAGER_CATEGORIES else None,
    )

    if asset and category == "it_issue":
        asset.status = "maintenance"
        asset.save(update_fields=["status"])

    label = req.get_category_display()
    if status == "pending_manager" and manager and manager.user:
        _notify(
            manager.user,
            f"Approval needed: {req.request_no}",
            f"{employee.full_name} requested {label}: {subject}",
            f"/hr/requests/team/{req.pk}/",
        )
    else:
        _notify_hr_admins(
            tenant,
            f"New request: {req.request_no}",
            f"{employee.full_name} — {label}: {subject}",
            f"/hr/requests/queue/{req.pk}/",
        )

    _notify_department_managers(
        tenant,
        employee,
        req,
        f"New team request: {req.request_no}",
        f"{employee.full_name} ({employee.department.name if employee.department else '—'}): {subject}",
    )

    _notify(
        employee.user,
        f"Request submitted: {req.request_no}",
        f"Your {label} request is logged. We'll update you when there's progress.",
        f"/hr/requests/my/{req.pk}/",
    )
    return req


@transaction.atomic
def manager_approve_request(req, user, remarks: str = ""):
    if req.status != "pending_manager":
        raise ValueError("This request is not awaiting manager approval.")

    req.status = "pending_it"
    req.manager_actioned_by = user
    req.manager_actioned_at = timezone.now()
    req.save(update_fields=["status", "manager_actioned_by", "manager_actioned_at", "updated_at"])

    if remarks:
        from .models import ServiceRequestComment
        ServiceRequestComment.objects.create(request=req, author=user, body=remarks, is_internal=False)

    _notify_hr_admins(
        req.tenant,
        f"Approved — {req.request_no}",
        f"{req.employee.full_name}: {req.subject}",
        f"/hr/requests/queue/{req.pk}/",
    )
    _notify(
        req.employee.user,
        f"Manager approved {req.request_no}",
        f"Your request was approved and sent to IT/Procurement.",
        f"/hr/requests/my/{req.pk}/",
    )
    return req


@transaction.atomic
def manager_reject_request(req, user, reason: str):
    if req.status != "pending_manager":
        raise ValueError("This request is not awaiting manager approval.")

    req.status = "rejected"
    req.rejection_reason = reason
    req.manager_actioned_by = user
    req.manager_actioned_at = timezone.now()
    req.save(update_fields=["status", "rejection_reason", "manager_actioned_by", "manager_actioned_at", "updated_at"])

    _notify(
        req.employee.user,
        f"Request declined: {req.request_no}",
        reason or "Your manager declined this request.",
        f"/hr/requests/my/{req.pk}/",
    )
    return req


@transaction.atomic
def assign_request(req, user):
    req.status = "in_progress"
    req.assigned_to = user
    req.save(update_fields=["status", "assigned_to", "updated_at"])

    _notify(
        req.employee.user,
        f"Request in progress: {req.request_no}",
        f"{user.full_name or user.email} is working on your request.",
        f"/hr/requests/my/{req.pk}/",
    )
    return req


@transaction.atomic
def add_comment(req, user, body: str, *, is_internal: bool = False):
    from .models import ServiceRequestComment

    comment = ServiceRequestComment.objects.create(
        request=req, author=user, body=body, is_internal=is_internal
    )

    if not is_internal and req.employee.user and req.employee.user_id != user.id:
        _notify(
            req.employee.user,
            f"Update on {req.request_no}",
            body[:500],
            f"/hr/requests/my/{req.pk}/",
        )
    return comment


@transaction.atomic
def resolve_request(req, user, resolution_note: str = ""):
    req.status = "resolved"
    req.resolved_at = timezone.now()
    req.save(update_fields=["status", "resolved_at", "updated_at"])

    if resolution_note:
        add_comment(req, user, resolution_note, is_internal=False)

    if req.asset and req.category == "it_issue":
        req.asset.status = "assigned"
        req.asset.save(update_fields=["status"])

    _notify(
        req.employee.user,
        f"Resolved: {req.request_no}",
        resolution_note or "Your request has been marked resolved.",
        f"/hr/requests/my/{req.pk}/",
    )
    return req


@transaction.atomic
def close_request(req, user):
    req.status = "closed"
    req.save(update_fields=["status", "updated_at"])
    return req


def build_request_timeline(req) -> list[dict]:
    """Visual workflow steps for request detail page."""
    needs_manager = req.category in ("hardware", "software")
    status = req.status

    def _state(done_statuses, current_statuses, *, skipped=False):
        if skipped:
            return "skipped"
        if status in current_statuses:
            return "current"
        if status in done_statuses:
            return "done"
        return "pending"

    steps = [
        {"key": "submitted", "label": "Submitted", "state": "done"},
    ]

    if needs_manager:
        steps.append({
            "key": "manager",
            "label": "Manager approval",
            "state": "rejected" if status == "rejected" else _state(
                ("pending_it", "in_progress", "resolved", "closed"),
                ("pending_manager",),
            ),
        })

    steps.append({
        "key": "it",
        "label": "IT / Procurement",
        "state": _state(
            ("resolved", "closed"),
            ("pending_it", "in_progress"),
            skipped=status == "rejected",
        ),
    })
    steps.append({
        "key": "resolved",
        "label": "Resolved",
        "state": _state(("closed",), ("resolved",), skipped=status == "rejected"),
    })
    steps.append({
        "key": "closed",
        "label": "Closed",
        "state": "done" if status == "closed" else (
            "current" if status == "resolved" else _state((), (), skipped=status == "rejected")
        ),
    })
    return steps
