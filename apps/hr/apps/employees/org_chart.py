"""Build org-chart tree from reporting_manager relationships."""
from __future__ import annotations

from collections import defaultdict

from .models import Employee


def build_org_chart(tenant) -> dict:
    """
    Return roots and nested nodes for the active employee org chart.

    Each node: {employee, children: [...]}
  Employees without a manager in the active set become roots.
    """
    qs = (
        Employee.objects.filter(tenant=tenant, is_active=True, employment_status="active")
        .select_related("department", "designation", "reporting_manager")
        .order_by("first_name", "last_name")
    )
    employees = list(qs)
    by_id = {e.pk: e for e in employees}
    children_map: dict[int, list[Employee]] = defaultdict(list)
    roots: list[Employee] = []

    for emp in employees:
        mgr_id = emp.reporting_manager_id
        if mgr_id and mgr_id in by_id:
            children_map[mgr_id].append(emp)
        else:
            roots.append(emp)

    def _node(emp: Employee) -> dict:
        kids = children_map.get(emp.pk, [])
        kids.sort(key=lambda e: (e.first_name.lower(), e.last_name.lower()))
        return {
            "employee": emp,
            "children": [_node(c) for c in kids],
        }

    roots.sort(key=lambda e: (e.first_name.lower(), e.last_name.lower()))
    tree = [_node(r) for r in roots]
    unassigned = [
        e for e in employees
        if e.reporting_manager_id and e.reporting_manager_id not in by_id
    ]

    return {
        "tree": tree,
        "total": len(employees),
        "roots_count": len(roots),
        "unassigned_count": len(unassigned),
        "unassigned": unassigned[:20],
    }
