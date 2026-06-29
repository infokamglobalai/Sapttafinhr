"""Org structure deactivate / restore helpers."""
from __future__ import annotations

from django.db.models import Count, Q

from .models import Department, Designation, OfficeLocation


def departments_queryset(tenant):
    return (
        Department.objects.filter(tenant=tenant)
        .select_related("parent")
        .annotate(
            employee_count=Count(
                "employee_set",
                filter=Q(employee_set__is_active=True, employee_set__employment_status="active"),
            )
        )
        .order_by("name")
    )


def designations_queryset(tenant):
    return (
        Designation.objects.filter(tenant=tenant)
        .annotate(
            employee_count=Count(
                "employee_set",
                filter=Q(employee_set__is_active=True, employee_set__employment_status="active"),
            )
        )
        .order_by("level", "name")
    )


def locations_queryset(tenant):
    return (
        OfficeLocation.objects.filter(tenant=tenant)
        .annotate(
            employee_count=Count(
                "employee_set",
                filter=Q(employee_set__is_active=True, employee_set__employment_status="active"),
            )
        )
        .order_by("name")
    )


def deactivate_department(dept: Department) -> str | None:
    if not dept.is_active:
        return "This department is already inactive."
    if dept.children.filter(is_active=True).exists():
        return (
            f"«{dept.name}» has active sub-departments. "
            "Deactivate those first or move them to another parent."
        )
    dept.is_active = False
    dept.save(update_fields=["is_active"])
    return None


def restore_department(dept: Department) -> str | None:
    if dept.is_active:
        return "This department is already active."
    if dept.parent_id and not Department.objects.filter(pk=dept.parent_id, is_active=True).exists():
        return "Reactivate the parent department first, or clear the parent on edit."
    dept.is_active = True
    dept.save(update_fields=["is_active"])
    return None


def deactivate_designation(desig: Designation) -> str | None:
    if not desig.is_active:
        return "This designation is already inactive."
    desig.is_active = False
    desig.save(update_fields=["is_active"])
    return None


def restore_designation(desig: Designation) -> str | None:
    if desig.is_active:
        return "This designation is already active."
    desig.is_active = True
    desig.save(update_fields=["is_active"])
    return None


def deactivate_location(loc: OfficeLocation) -> str | None:
    if not loc.is_active:
        return "This location is already inactive."
    loc.is_active = False
    loc.save(update_fields=["is_active"])
    return None


def restore_location(loc: OfficeLocation) -> str | None:
    if loc.is_active:
        return "This location is already active."
    loc.is_active = True
    loc.save(update_fields=["is_active"])
    return None
