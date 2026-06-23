"""GCC manpower / establishment reports — nationality and Kuwaiti vs expat mix."""
from __future__ import annotations

from collections import Counter

from django.db.models import Count

from apps.employees.models import Employee
from apps.tenants.jurisdiction import normalise_jurisdiction


NATIONALITY_LABELS = {
    "KW": "Kuwaiti",
    "IN": "Indian",
    "AE": "Emirati",
    "SA": "Saudi",
    "BH": "Bahraini",
    "OM": "Omani",
    "QA": "Qatari",
    "EG": "Egyptian",
    "PK": "Pakistani",
    "PH": "Filipino",
    "BD": "Bangladeshi",
    "NP": "Nepalese",
    "LK": "Sri Lankan",
}


def _nationality_label(code: str) -> str:
    code = (code or "").strip().upper()
    if not code:
        return "Not set"
    return NATIONALITY_LABELS.get(code, code)


def _is_kuwaiti(emp: Employee) -> bool:
    if getattr(emp, "is_kuwaiti_national", False):
        return True
    return (emp.nationality or "").strip().upper() == "KW"


def build_manpower_summary(tenant) -> dict:
    """Headcount breakdown for establishment / manpower reporting."""
    jurisdiction = normalise_jurisdiction(getattr(tenant, "payroll_jurisdiction", "IN"))
    active = Employee.objects.filter(
        tenant=tenant, is_active=True, employment_status="active"
    )

    total = active.count()
    kuwaiti_count = sum(1 for e in active if _is_kuwaiti(e))
    expat_count = total - kuwaiti_count

    by_nationality = []
    nat_counter: Counter[str] = Counter()
    for emp in active.iterator():
        if _is_kuwaiti(emp):
            nat_counter["KW"] += 1
        else:
            nat_counter[(emp.nationality or "").strip().upper() or "—"] += 1

    for code, count in nat_counter.most_common():
        by_nationality.append({
            "code": code,
            "label": _nationality_label(code if code != "—" else ""),
            "count": count,
            "pct": round(100 * count / total, 1) if total else 0,
        })

    by_department = list(
        active.values("department__name")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    for row in by_department:
        row["department"] = row.pop("department__name") or "Unassigned"

    by_gender = list(
        active.exclude(gender="")
        .values("gender")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    return {
        "jurisdiction": jurisdiction,
        "total": total,
        "kuwaiti_count": kuwaiti_count,
        "expat_count": expat_count,
        "kuwaiti_pct": round(100 * kuwaiti_count / total, 1) if total else 0,
        "expat_pct": round(100 * expat_count / total, 1) if total else 0,
        "by_nationality": by_nationality,
        "by_department": by_department,
        "by_gender": by_gender,
        "is_kuwait": jurisdiction == "KW",
    }


def manpower_export_rows(tenant) -> list[list]:
    """Excel rows for manpower establishment report."""
    summary = build_manpower_summary(tenant)
    rows = [
        ["Manpower / Establishment Report"],
        ["Workspace", tenant.name],
        ["Jurisdiction", summary["jurisdiction"]],
        ["Report date", ""],
        [],
        ["Summary", "Count", "% of total"],
        ["Total active employees", summary["total"], "100%"],
        ["Kuwaiti nationals", summary["kuwaiti_count"], f"{summary['kuwaiti_pct']}%"],
        ["Expatriates", summary["expat_count"], f"{summary['expat_pct']}%"],
        [],
        ["By nationality", "Count", "%"],
    ]
    for row in summary["by_nationality"]:
        rows.append([row["label"], row["count"], f"{row['pct']}%"])
    rows.extend([[], ["By department", "Count"]])
    for row in summary["by_department"]:
        rows.append([row["department"], row["count"]])
    rows.extend([[], ["Employee detail", "Code", "Name", "Nationality", "Kuwaiti?", "Department", "Designation", "DOJ"]])

    active = Employee.objects.filter(
        tenant=tenant, is_active=True, employment_status="active"
    ).select_related("department", "designation").order_by("employee_code")

    for emp in active:
        rows.append([
            "",
            emp.employee_code,
            emp.full_name,
            _nationality_label(emp.nationality),
            "Yes" if _is_kuwaiti(emp) else "No",
            emp.department.name if emp.department else "",
            emp.designation.name if emp.designation else "",
            emp.date_of_joining.isoformat() if emp.date_of_joining else "",
        ])
    return rows
