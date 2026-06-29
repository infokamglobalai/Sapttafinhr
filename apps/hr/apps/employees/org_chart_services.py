"""Org chart helpers — validation and reporting-manager updates."""
from __future__ import annotations

from collections import defaultdict

from django.db import transaction

from .models import Employee


class OrgChartError(Exception):
    pass


def get_descendant_ids(employee_id: int, tenant_id: int) -> set[int]:
    """All active direct/indirect reports (cannot be chosen as manager)."""
    children_map: dict[int, list[int]] = defaultdict(list)
    for eid, mgr_id in Employee.objects.filter(
        tenant_id=tenant_id, is_active=True, employment_status="active"
    ).values_list("id", "reporting_manager_id"):
        if mgr_id:
            children_map[mgr_id].append(eid)

    seen: set[int] = set()
    stack = list(children_map.get(employee_id, []))
    while stack:
        cid = stack.pop()
        if cid in seen:
            continue
        seen.add(cid)
        stack.extend(children_map.get(cid, []))
    return seen


def manager_choices(tenant, employee: Employee):
    """Valid reporting-manager options for an employee."""
    blocked = get_descendant_ids(employee.pk, tenant.pk) | {employee.pk}
    return (
        Employee.objects.filter(
            tenant=tenant, is_active=True, employment_status="active"
        )
        .exclude(pk__in=blocked)
        .select_related("designation", "department")
        .order_by("first_name", "last_name")
    )


def validate_manager_change(employee: Employee, new_manager: Employee | None) -> None:
    if new_manager is None:
        return
    if new_manager.pk == employee.pk:
        raise OrgChartError("An employee cannot be their own manager.")
    if new_manager.tenant_id != employee.tenant_id:
        raise OrgChartError("Manager must belong to the same organisation.")
    descendants = get_descendant_ids(employee.pk, employee.tenant_id)
    if new_manager.pk in descendants:
        raise OrgChartError(
            f"{new_manager.full_name} reports to {employee.full_name} (directly or indirectly). "
            "Choose a manager outside their team."
        )
    # Walk up from new manager — would we create a cycle?
    seen: set[int] = set()
    current_id: int | None = new_manager.pk
    while current_id:
        if current_id == employee.pk:
            raise OrgChartError("This change would create a circular reporting line.")
        if current_id in seen:
            break
        seen.add(current_id)
        current_id = (
            Employee.objects.filter(pk=current_id)
            .values_list("reporting_manager_id", flat=True)
            .first()
        )


@transaction.atomic
def reassign_reporting_manager(
    employee: Employee,
    new_manager: Employee | None,
    *,
    updated_by=None,
) -> Employee:
    validate_manager_change(employee, new_manager)
    employee.reporting_manager = new_manager
    employee.save(update_fields=["reporting_manager"])
    return employee
