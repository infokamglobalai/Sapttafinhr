"""Seed holiday calendars and leave policies per payroll jurisdiction (P0)."""
from __future__ import annotations

import datetime

from django.utils import timezone

from .jurisdiction import GCC_JURISDICTIONS, INDIA, normalise_jurisdiction

# Fixed public holidays (month, day) — Islamic holidays are added as optional placeholders.
GCC_FIXED_HOLIDAYS: dict[str, list[tuple[str, int, int]]] = {
    "KW": [
        ("New Year's Day", 1, 1),
        ("National Day", 2, 25),
        ("Liberation Day", 2, 26),
    ],
    "AE": [
        ("New Year's Day", 1, 1),
        ("UAE National Day", 12, 2),
        ("UAE National Day (Holiday)", 12, 3),
    ],
    "SA": [
        ("Saudi Founding Day", 2, 22),
        ("National Day", 9, 23),
    ],
    "BH": [
        ("New Year's Day", 1, 1),
        ("National Day", 12, 16),
        ("National Day (Holiday)", 12, 17),
    ],
    "OM": [
        ("National Day", 11, 18),
        ("National Day (Holiday)", 11, 19),
    ],
    "QA": [
        ("National Sport Day", 2, 11),
        ("National Day", 12, 18),
    ],
}

# Optional note row — HR updates dates each year via Leave > Holidays.
GCC_ISLAMIC_HOLIDAY_NOTE = (
    "Islamic holidays (Eid Al-Fitr, Eid Al-Adha, etc.) vary by moon sighting — "
    "add or adjust dates in your holiday calendar each year."
)


def _leave_pack(jurisdiction: str) -> list[dict]:
    """Return LeaveType seed dicts for a jurisdiction."""
    if jurisdiction == "KW":
        return [
            {
                "name": "Annual Leave",
                "code": "AL",
                "accrual_type": "upfront",
                "accrual_value": 30,
                "max_annual_balance": 30,
                "applicable_after_months": 12,
                "allow_half_day": True,
            },
            {
                "name": "Sick Leave",
                "code": "SL",
                "accrual_type": "manual",
                "accrual_value": 0,
                "requires_document_after": 3,
            },
            {
                "name": "Maternity Leave",
                "code": "ML",
                "accrual_type": "upfront",
                "accrual_value": 70,
                "max_annual_balance": 70,
                "applicable_gender": "female",
            },
            {
                "name": "Hajj Leave",
                "code": "HAJ",
                "accrual_type": "manual",
                "accrual_value": 0,
                "applicable_after_months": 24,
                "max_consecutive_days": 21,
            },
            {
                "name": "Unpaid Leave",
                "code": "UL",
                "is_paid": False,
                "accrual_type": "manual",
                "accrual_value": 0,
            },
        ]
    if jurisdiction in GCC_JURISDICTIONS:
        return [
            {
                "name": "Annual Leave",
                "code": "AL",
                "accrual_type": "upfront",
                "accrual_value": 30,
                "max_annual_balance": 30,
                "applicable_after_months": 12,
            },
            {
                "name": "Sick Leave",
                "code": "SL",
                "accrual_type": "manual",
                "accrual_value": 0,
            },
            {
                "name": "Unpaid Leave",
                "code": "UL",
                "is_paid": False,
                "accrual_type": "manual",
                "accrual_value": 0,
            },
        ]
    return []


def seed_holiday_calendar(tenant, *, year: int | None = None) -> bool:
    """Create default holiday calendar for GCC tenants. Returns True if created."""
    from apps.leaves.models import Holiday, HolidayCalendar

    jurisdiction = normalise_jurisdiction(tenant.payroll_jurisdiction)
    if jurisdiction == INDIA or jurisdiction not in GCC_FIXED_HOLIDAYS:
        return False

    year = year or timezone.localdate().year
    cal, created = HolidayCalendar.objects.get_or_create(
        tenant=tenant,
        year=year,
        name=f"{jurisdiction} Public Holidays",
        defaults={"is_default": True},
    )
    if not cal.is_default:
        HolidayCalendar.objects.filter(tenant=tenant, year=year, is_default=True).exclude(pk=cal.pk).update(
            is_default=False
        )
        cal.is_default = True
        cal.save(update_fields=["is_default"])

    existing_dates = set(
        Holiday.objects.filter(tenant=tenant, calendar=cal).values_list("holiday_date", flat=True)
    )
    for name, month, day in GCC_FIXED_HOLIDAYS[jurisdiction]:
        try:
            hdate = datetime.date(year, month, day)
        except ValueError:
            continue
        if hdate in existing_dates:
            continue
        Holiday.objects.create(
            tenant=tenant,
            calendar=cal,
            name=name,
            holiday_date=hdate,
            holiday_type="national",
        )

    note_name = GCC_ISLAMIC_HOLIDAY_NOTE[:255]
    if not Holiday.objects.filter(tenant=tenant, calendar=cal, name=note_name).exists():
        Holiday.objects.create(
            tenant=tenant,
            calendar=cal,
            name=note_name,
            holiday_date=datetime.date(year, 12, 31),
            holiday_type="optional",
            is_active=False,
        )
    return created


def seed_leave_types(tenant) -> int:
    """Seed jurisdiction leave types. Returns count created."""
    from apps.leaves.models import LeaveType

    jurisdiction = normalise_jurisdiction(tenant.payroll_jurisdiction)
    pack = _leave_pack(jurisdiction)
    if not pack:
        return 0

    created = 0
    for spec in pack:
        _, was_created = LeaveType.objects.get_or_create(
            tenant=tenant,
            code=spec["code"],
            defaults={
                "name": spec["name"],
                "is_paid": spec.get("is_paid", True),
                "accrual_type": spec.get("accrual_type", "upfront"),
                "accrual_value": spec.get("accrual_value", 0),
                "max_annual_balance": spec.get("max_annual_balance"),
                "applicable_gender": spec.get("applicable_gender", "all"),
                "applicable_after_months": spec.get("applicable_after_months", 0),
                "max_consecutive_days": spec.get("max_consecutive_days"),
                "requires_document_after": spec.get("requires_document_after"),
                "allow_half_day": spec.get("allow_half_day", True),
                "is_active": True,
            },
        )
        if was_created:
            created += 1
    return created


def seed_kuwait_payroll_defaults(tenant) -> None:
    """Default PIFSS statutory rates for Kuwait (P1). Idempotent."""
    if normalise_jurisdiction(tenant.payroll_jurisdiction) != "KW":
        return

    from apps.payroll.models import StatutorySetting

    today = timezone.localdate()
    if StatutorySetting.objects.filter(tenant=tenant, statutory_type="pifss").exists():
        return
    StatutorySetting.objects.create(
        tenant=tenant,
        statutory_type="pifss",
        effective_date=today,
        employee_rate=0.055,
        employer_rate=0.115,
        is_active=True,
    )


def seed_ksa_payroll_defaults(tenant) -> None:
    """Default GOSI statutory rates for Saudi Arabia (Phase 2). Idempotent."""
    if normalise_jurisdiction(tenant.payroll_jurisdiction) != "SA":
        return

    from apps.payroll.models import StatutorySetting

    today = timezone.localdate()
    if StatutorySetting.objects.filter(tenant=tenant, statutory_type="gosi").exists():
        return
    StatutorySetting.objects.create(
        tenant=tenant,
        statutory_type="gosi",
        effective_date=today,
        employee_rate=0.0975,
        employer_rate=0.1175,
        is_active=True,
    )


def seed_regional_defaults(tenant, *, year: int | None = None) -> dict:
    """Apply all regional packs for a tenant after provisioning."""
    jurisdiction = normalise_jurisdiction(tenant.payroll_jurisdiction)
    result = {"jurisdiction": jurisdiction, "holidays": False, "leave_types": 0, "payroll_defaults": False}
    if jurisdiction in GCC_JURISDICTIONS:
        result["holidays"] = seed_holiday_calendar(tenant, year=year)
        result["leave_types"] = seed_leave_types(tenant)
        seed_kuwait_payroll_defaults(tenant)
        seed_ksa_payroll_defaults(tenant)
        result["payroll_defaults"] = jurisdiction in ("KW", "SA")
    return result
