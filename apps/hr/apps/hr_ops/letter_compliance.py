"""New-joiner compliance — offer letter & documentation tracking for admin dashboard."""
from __future__ import annotations

import datetime

from django.db.models import Exists, OuterRef, Q

from .models import EmployeeOnboarding, HRLetter


def _issued_offer_exists():
    return HRLetter.objects.filter(
        tenant=OuterRef("tenant_id"),
        employee_id=OuterRef("pk"),
        letter_type="offer",
        status="issued",
        is_deleted=False,
    )


def employees_pending_offer_letter(tenant, *, today=None, lookback_days: int = 90):
    """
    Active employees who have joined (or are joining soon) but do not yet have
    an issued offer letter. Disappears automatically once offer is issued.
    """
    from apps.employees.models import Employee

    today = today or datetime.date.today()
    cutoff = today - datetime.timedelta(days=lookback_days)

    qs = (
        Employee.objects.filter(
            tenant=tenant,
            is_active=True,
            employment_status__in=("active", "probation"),
        )
        .annotate(has_offer=Exists(_issued_offer_exists()))
        .filter(has_offer=False)
        .filter(
            Q(date_of_joining__lte=today)
            | Q(date_of_joining__isnull=True)
            | Q(date_of_joining__gte=cutoff)
        )
        .select_related("tenant", "department", "designation", "reporting_manager")
        .order_by("-date_of_joining", "first_name")
    )
    return [_enrich_joiner_row(emp, today) for emp in qs[:20]]


def _enrich_joiner_row(employee, today):
    tenant = getattr(employee, "tenant", None)
    onboarding = None
    if tenant:
        onboarding = (
            EmployeeOnboarding.objects.filter(tenant=tenant, employee=employee)
            .prefetch_related("items")
            .first()
        )
    doc_status = "pending"
    doc_pct = 0
    if onboarding:
        items = list(onboarding.items.all())
        total = len(items)
        done = sum(1 for i in items if i.status == "completed")
        doc_pct = int(done / total * 100) if total else 0
        doc_status = "complete" if doc_pct >= 100 else ("in_progress" if done else "pending")

    doj = employee.date_of_joining
    if doj and doj > today:
        join_status = "joining_soon"
    elif doj and doj <= today:
        join_status = "joined"
    else:
        join_status = "joined"

    return {
        "employee": employee,
        "join_status": join_status,
        "join_status_label": {
            "joined": "Joined",
            "joining_soon": "Joining soon",
        }.get(join_status, "Joined"),
        "documentation_status": doc_status,
        "documentation_label": {
            "complete": "Documentation complete",
            "in_progress": "Documentation in progress",
            "pending": "Documentation pending",
        }.get(doc_status, "Documentation pending"),
        "documentation_pct": doc_pct,
        "needs_offer_letter": True,
    }


def pending_offer_letter_count(tenant, *, today=None) -> int:
    from apps.employees.models import Employee

    today = today or datetime.date.today()
    cutoff = today - datetime.timedelta(days=90)
    return (
        Employee.objects.filter(
            tenant=tenant,
            is_active=True,
            employment_status__in=("active", "probation"),
        )
        .annotate(has_offer=Exists(_issued_offer_exists()))
        .filter(has_offer=False)
        .filter(
            Q(date_of_joining__lte=today)
            | Q(date_of_joining__isnull=True)
            | Q(date_of_joining__gte=cutoff)
        )
        .count()
    )
