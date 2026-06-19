"""Company setup checklist for HR admin dashboard."""
from __future__ import annotations

from django.urls import reverse
from django.utils import timezone


def get_setup_checklist(tenant) -> dict:
    from apps.employees.models import Department, Designation, Employee
    from apps.leaves.models import LeaveType, HolidayCalendar
    from apps.attendance.models import Shift
    from apps.payroll.models import SalaryStructure, StatutorySetting, EmployeeSalary
    from apps.employees.models import OfficeLocation
    from apps.hr_ops.models import OnboardingTemplate
    from .jurisdiction import is_india_payroll

    india_payroll = is_india_payroll(tenant.payroll_jurisdiction)
    year = timezone.localdate().year
    items = [
        {
            "key": "departments",
            "label": "Departments",
            "done": Department.objects.filter(tenant=tenant, is_active=True).exists(),
            "url": reverse("employees:departments"),
        },
        {
            "key": "designations",
            "label": "Designations",
            "done": Designation.objects.filter(tenant=tenant).exists(),
            "url": reverse("employees:designations"),
        },
        {
            "key": "leave_types",
            "label": "Leave types",
            "done": LeaveType.objects.filter(tenant=tenant, is_active=True).exists(),
            "url": reverse("leaves:leave_types"),
        },
        {
            "key": "holidays",
            "label": f"Holiday calendar ({year})",
            "done": HolidayCalendar.objects.filter(tenant=tenant, year=year).exists(),
            "url": reverse("leaves:holidays"),
        },
        {
            "key": "shifts",
            "label": "Work shifts",
            "done": Shift.objects.filter(tenant=tenant).exists(),
            "url": reverse("attendance:shifts"),
        },
        {
            "key": "salary_structures",
            "label": "Salary structures",
            "done": SalaryStructure.objects.filter(tenant=tenant).exists(),
            "url": reverse("payroll:structures"),
        },
        {
            "key": "statutory",
            "label": "Statutory settings (PF/ESI/PT)" if india_payroll else "Statutory settings",
            "done": (
                StatutorySetting.objects.filter(tenant=tenant, is_active=True).exists()
                if india_payroll
                else True
            ),
            "url": reverse("payroll:statutory"),
            "india_only": True,
        },
        {
            "key": "employee_salaries",
            "label": "Employee salaries assigned",
            "done": EmployeeSalary.objects.filter(tenant=tenant, is_active=True).exists(),
            "url": reverse("payroll:structures"),
        },
        {
            "key": "locations",
            "label": "Office locations",
            "done": OfficeLocation.objects.filter(tenant=tenant, is_active=True).exists(),
            "url": reverse("employees:locations"),
        },
        {
            "key": "employees",
            "label": "First employee added",
            "done": Employee.objects.filter(tenant=tenant, is_active=True).exists(),
            "url": reverse("employees:create"),
        },
        {
            "key": "onboarding",
            "label": "Onboarding template",
            "done": OnboardingTemplate.objects.filter(tenant=tenant).exists(),
            "url": reverse("hr_ops:onboarding_templates"),
        },
    ]
    if not india_payroll:
        items = [i for i in items if not i.get("india_only")]
    done_count = sum(1 for i in items if i["done"])
    by_key = {i["key"]: i for i in items}

    def group_done(keys: list[str]) -> bool:
        return all(by_key[k]["done"] for k in keys)

    display_groups = [
        ("Company details", ["departments", "designations", "locations"], reverse("employees:departments")),
        ("Time & attendance", ["shifts", "holidays"], reverse("attendance:shifts")),
        ("Leave policies", ["leave_types"], reverse("leaves:leave_types")),
        ("Payroll setup", ["salary_structures"] + (["statutory"] if india_payroll else []) + ["employee_salaries"], reverse("payroll:structures")),
        ("People", ["employees", "onboarding"], reverse("employees:create")),
    ]
    display_steps = []
    current_marked = False
    for label, keys, url in display_groups:
        if group_done(keys):
            status = "done"
        elif not current_marked:
            status = "progress"
            current_marked = True
        else:
            status = "pending"
        display_steps.append({"label": label, "status": status, "url": url})

    next_item = next((i for i in items if not i["done"]), None)
    next_key = next_item["key"] if next_item else None
    for i in items:
        if i["done"]:
            i["dot_status"] = "done"
        elif i["key"] == next_key:
            i["dot_status"] = "current"
        else:
            i["dot_status"] = "pending"

    return {
        "items": items,
        "display_steps": display_steps,
        "done_count": done_count,
        "total": len(items),
        "percent": int(done_count / len(items) * 100) if items else 100,
        "complete": done_count == len(items),
        "next_label": next_item["label"] if next_item else "",
        "next_url": next_item["url"] if next_item else reverse("tenants:setup"),
        "remaining": len(items) - done_count,
    }
