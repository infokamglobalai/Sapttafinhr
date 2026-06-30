"""Employee headcount limits — aligned with SaaS pricing (30 included + paid extras)."""
from __future__ import annotations

DEFAULT_INCLUDED_EMPLOYEES = 30


class EmployeeLimitExceeded(Exception):
    """Raised when adding employees would exceed the tenant's paid headcount cap."""

    def __init__(self, tenant, current: int, limit: int, requested: int = 1):
        self.tenant = tenant
        self.current = current
        self.limit = limit
        self.requested = requested
        remaining = max(0, limit - current)
        super().__init__(
            f"Employee limit reached ({current}/{limit} active). "
            f"You tried to add {requested}; only {remaining} seat(s) remain. "
            f"Upgrade your plan or add employee seats in Billing."
        )


def active_employee_count(tenant) -> int:
    from apps.employees.models import Employee

    return Employee.objects.filter(
        tenant=tenant,
        is_active=True,
        employment_status__in=["active", "notice_period"],
    ).count()


def employee_limit(tenant) -> int:
    return int(tenant.max_employees or DEFAULT_INCLUDED_EMPLOYEES)


def seats_remaining(tenant) -> int:
    return max(0, employee_limit(tenant) - active_employee_count(tenant))


def check_employee_capacity(tenant, additional: int = 1) -> None:
    """Raise EmployeeLimitExceeded if `additional` new active employees cannot be added."""
    if additional < 1:
        return
    current = active_employee_count(tenant)
    limit = employee_limit(tenant)
    if current + additional > limit:
        raise EmployeeLimitExceeded(tenant, current, limit, additional)


def sync_employee_count(tenant) -> int:
    """Refresh denormalized employee_count on tenant; return active count."""
    count = active_employee_count(tenant)
    if tenant.employee_count != count:
        tenant.employee_count = count
        tenant.save(update_fields=["employee_count", "updated_at"])
    return count


def sync_employee_count_and_alerts(tenant, *, was_at_cap: bool | None = None) -> int:
    """Sync headcount and notify workspace owners when seat thresholds change."""
    count = sync_employee_count(tenant)
    try:
        from apps.tenants.seat_alerts import sync_seat_limit_alerts

        sync_seat_limit_alerts(tenant, was_at_cap=was_at_cap)
    except Exception:
        pass
    return count


def ensure_seat_cap_covers_active(tenant, *, headroom: int = 0) -> int:
    """Raise max_employees when active headcount exceeds the paid cap.

    Used after demo seeding so seeded workspaces can still add employees.
    Production upgrades should go through billing (sync_subscription).
    """
    active = sync_employee_count(tenant)
    needed = max(active + max(0, headroom), employee_limit(tenant))
    if tenant.max_employees < needed:
        tenant.max_employees = needed
        tenant.save(update_fields=["max_employees", "updated_at"])
    return tenant.max_employees
