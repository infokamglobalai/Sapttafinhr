from django.conf import settings

from django.urls import reverse

from apps.accounts.platform import platform_base_for_request
from utils.money import CURRENCY_SYMBOLS, currency_decimal_places
from .jurisdiction import is_gcc_payroll, is_india_payroll, jurisdiction_label
from .limits import DEFAULT_INCLUDED_EMPLOYEES, employee_limit, seats_remaining

SETTINGS_URL_NAMES = frozenset({
    "departments", "department_create", "designations", "designation_create",
    "locations", "location_create",
    "leave_types", "leave_type_create", "leave_type_edit", "holidays", "holiday_create",
    "shifts", "shift_create", "shift_edit",
    "structures", "structure_create", "structure_edit",
    "statutory", "statutory_create", "statutory_edit",
    "policy_list", "policy_create", "policy_edit",
    "announcements", "announcement_create", "announcement_edit",
    "onboarding_templates", "onboarding_template_create", "onboarding_template_edit",
    "team_access", "team_access_update",
    "letter_templates", "letter_template_create", "letter_template_edit",
    "letter_company_settings",
})


NAV_CATEGORY_LABELS = {
    "mySpace": "My Space",
    "team": "My Team",
    "people": "People",
    "timeLeave": "Time & Leave",
    "reports": "Reports",
    "payroll": "Payroll",
    "performance": "Performance",
    "hrOps": "HR operations",
    "settings": "Setup & Config",
    "dashboard": "",
}


def _nav_active_category(request) -> str:
    """Desktop nav category — mirrors activeCategory in base.html."""
    match = getattr(request, "resolver_match", None)
    if match is None:
        return "dashboard"
    app_name = match.app_name or ""
    url_name = match.url_name or ""
    user = getattr(request, "user", None)
    is_auth = bool(user and user.is_authenticated)
    is_hr = is_auth and user.is_hr_admin
    is_mgr = is_auth and user.is_manager and not user.is_hr_admin

    if app_name == "tenants":
        return "dashboard"
    if url_name in SETTINGS_URL_NAMES:
        return "settings"
    if url_name in {
        "my_work", "my_attendance", "regularization", "apply", "comp_off", "my_leaves",
        "my_payslips", "my_expenses", "expense_submit", "expense_edit",
        "my_loans", "my_reviews", "my_tax_declaration", "my_form16s",
        "employee_policies", "employee_policy_view",
        "my_assets", "my_onboarding", "my_onboarding_item_complete",
        "my_service_requests", "my_service_request_detail", "request_create",
        "my_projects", "my_timesheet",
    } or (app_name == "projects" and url_name in ("detail", "upload_document", "add_update")):
        return "mySpace"
    if app_name == "hr_ops" and url_name == "announcements" and not is_hr:
        return "mySpace"
    if (
        (url_name == "pending" and not is_hr)
        or url_name in ("team_attendance", "team_expenses", "team_service_requests")
        or (url_name == "team_reviews" and is_mgr)
        or (url_name == "regularizations" and is_mgr)
        or (url_name == "comp_off_pending" and is_mgr)
    ):
        return "team"
    if app_name == "employees":
        return "people"
    if app_name == "recruitment":
        return "hrOps"
    if app_name == "reports":
        return "reports"
    if (
        url_name == "register"
        or (url_name == "pending" and is_hr)
        or url_name in ("balances", "anomaly", "anomaly_scan")
        or (url_name == "regularizations" and is_hr)
        or (url_name == "comp_off_pending" and is_hr)
        or ("shift" in url_name and app_name == "attendance")
    ):
        return "timeLeave"
    if (
        url_name in ("run_list", "run_detail", "run_create", "tax_declarations_admin", "form16_admin", "monthly_review")
        or "loan" in url_name
        or ("expense" in url_name and is_hr and app_name == "payroll")
        or ("structure" in url_name and app_name == "payroll")
        or ("statutory" in url_name and app_name == "payroll")
    ):
        return "payroll"
    if app_name == "performance":
        if is_hr and url_name in ("cycles", "cycle_create", "cycle_edit", "cycle_detail", "cycle_launch", "team_reviews"):
            return "performance"
        if url_name in ("my_reviews", "review_write", "review_detail"):
            return "mySpace"
        if url_name == "team_reviews" and is_mgr:
            return "team"
    if app_name == "projects" and is_hr:
        return "hrOps"
    if (
        url_name in (
            "onboarding", "people_pulse", "document_expiry", "audit_log",
            "letter_templates", "assets", "exit_list", "letter_company_settings",
            "policy_list", "announcements", "company_overview",
        )
        or app_name == "recruitment"
        or ("service_request" in url_name and app_name == "hr_ops" and is_hr)
        or "letter_template" in url_name
        or (url_name and "letter" in url_name and app_name == "hr_ops")
        or ("policy" in url_name and app_name == "hr_ops")
        or ("announcement" in url_name and app_name == "hr_ops")
        or ("exit" in url_name and app_name == "hr_ops")
        or ("onboarding" in url_name and app_name == "hr_ops")
    ):
        return "hrOps"
    return "dashboard"


def _nav_secondary_open(request) -> bool:
    """True when the desktop secondary sidebar should be visible on first paint."""
    if not getattr(getattr(request, "user", None), "is_authenticated", False):
        return False
    return _nav_active_category(request) != "dashboard"


def _command_palette_links(user):
    """Quick navigation entries for the ⌘K command palette."""
    if not user or not getattr(user, "is_authenticated", False):
        return []

    def item(label, url_name, *, group="Navigate", keys=""):
        try:
            return {"label": label, "url": reverse(url_name), "group": group, "keys": keys.lower()}
        except Exception:
            return None

    links = [
        item("Dashboard", "tenants:dashboard", group="Go", keys="dashboard home"),
    ]

    if user.is_hr_admin:
        links.extend([
            item("Employee directory", "employees:list", keys="employees people team directory"),
            item("Add employee", "employees:create", keys="hire new employee add"),
            item("Attendance register", "attendance:register", keys="attendance present absent"),
            item("Leave approvals", "leaves:pending", keys="leave approve pending"),
            item("Payroll runs", "payroll:run_list", keys="payroll salary payslip run"),
            item("Reports", "reports:index", keys="reports export mis"),
            item("Team access", "employees:team_access", keys="roles permissions access"),
            item("Company settings", "accounts:settings", keys="settings company profile"),
        ])
    elif user.is_manager and not user.is_hr_admin:
        links.extend([
            item("Approve leave", "leaves:pending", keys="leave approve team pending"),
            item("Team attendance", "attendance:team_attendance", keys="team attendance present"),
            item("Team reviews", "performance:team_reviews", keys="performance review team"),
            item("My attendance", "attendance:my_attendance", keys="attendance punch my"),
            item("Apply leave", "leaves:apply", keys="leave apply time off"),
        ])
    else:
        links.extend([
            item("My attendance", "attendance:my_attendance", keys="attendance punch clock in"),
            item("Apply leave", "leaves:apply", keys="leave apply time off"),
            item("My leaves", "leaves:my_leaves", keys="leave balance history"),
            item("My payslips", "payroll:my_payslips", keys="payslip salary pay"),
            item("Account settings", "accounts:settings", keys="settings profile password"),
        ])

    return [x for x in links if x]


def _workspace_search(user):
    """Role-aware search target + placeholder for the topbar."""
    if not user or not getattr(user, "is_authenticated", False):
        return "", "Search…"
    if user.is_hr_admin:
        return reverse("employees:list"), "Search employees…"
    return reverse("employees:directory"), "Find colleague — name, email, dept…"


def _nav_role_hint(user) -> str:
    if not user or not user.is_authenticated:
        return ""
    if user.is_hr_admin:
        return "Company administration"
    if user.is_manager:
        return "Your team & your own records"
    return "Your personal HR self-service"


def _nav_role_badge_class(user) -> str:
    if not user or not user.is_authenticated:
        return "employee"
    if user.is_hr_admin:
        return "admin"
    if user.is_manager:
        return "manager"
    return "employee"


def tenant_context(request):
    """Injects current tenant + notification unread count into every template."""
    url_name = getattr(getattr(request, "resolver_match", None), "url_name", "") or ""
    ctx = {
        "tenant": getattr(request, "tenant", None),
        "unread_notif_count": 0,
        "nav_is_settings": url_name in SETTINGS_URL_NAMES,
        "nav_active_category": _nav_active_category(request),
        "nav_category_label": NAV_CATEGORY_LABELS.get(_nav_active_category(request), ""),
        "nav_secondary_open": _nav_secondary_open(request),
        "nav_role_hint": "",
        "nav_role_badge_class": "employee",
        "PLATFORM_BASE_URL": platform_base_for_request(request),
    }
    tenant = ctx["tenant"]
    if tenant:
        try:
            ctx["tenant_logo_url"] = tenant.company_logo.url if tenant.company_logo else ""
        except (ValueError, AttributeError):
            ctx["tenant_logo_url"] = ""
        ctx["tenant_is_india_payroll"] = is_india_payroll(tenant.payroll_jurisdiction)
        ctx["tenant_is_gcc_payroll"] = is_gcc_payroll(tenant.payroll_jurisdiction)
        ctx["tenant_jurisdiction_label"] = jurisdiction_label(tenant.payroll_jurisdiction)
        ctx["tenant_currency_decimals"] = currency_decimal_places(tenant.currency)
        ctx["tenant_currency_symbol"] = CURRENCY_SYMBOLS.get(tenant.currency, f"{tenant.currency} ")
        ctx["tenant_ui_language"] = getattr(tenant, "ui_language", "en") or "en"
        ctx["tenant_ui_direction"] = "rtl" if ctx["tenant_ui_language"] == "ar" else "ltr"
        ctx["seats_remaining"] = seats_remaining(tenant)
        ctx["employee_limit"] = employee_limit(tenant)
        ctx["at_employee_cap"] = ctx["seats_remaining"] == 0
        ctx["billing_settings_url"] = "/auth/settings/?tab=billing"
    else:
        ctx["tenant_logo_url"] = ""
        ctx["tenant_is_india_payroll"] = True
        ctx["tenant_is_gcc_payroll"] = False
        ctx["tenant_jurisdiction_label"] = "India"
        ctx["tenant_currency_decimals"] = 2
        ctx["tenant_currency_symbol"] = "₹"
        ctx["tenant_ui_language"] = "en"
        ctx["tenant_ui_direction"] = "ltr"
        ctx["seats_remaining"] = 0
        ctx["employee_limit"] = DEFAULT_INCLUDED_EMPLOYEES
        ctx["at_employee_cap"] = False
        ctx["billing_settings_url"] = ""
    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        search_url, search_placeholder = _workspace_search(user)
        ctx["workspace_search_url"] = search_url
        ctx["workspace_search_placeholder"] = search_placeholder
        ctx["command_palette_links"] = _command_palette_links(user)
        ctx["nav_role_hint"] = _nav_role_hint(user)
        ctx["nav_role_badge_class"] = _nav_role_badge_class(user)
        emp = getattr(user, "employee_profile", None)
        if emp:
            try:
                from apps.hr_ops.models import EmployeeOnboarding
                ctx["employee_has_onboarding"] = EmployeeOnboarding.objects.filter(
                    employee=emp, tenant_id=user.tenant_id, completed_at__isnull=True,
                ).exists()
            except Exception:
                ctx["employee_has_onboarding"] = False
        else:
            ctx["employee_has_onboarding"] = False
    else:
        ctx["workspace_search_url"] = ""
        ctx["workspace_search_placeholder"] = "Search…"
        ctx["command_palette_links"] = []
        ctx["employee_has_onboarding"] = False
    if user and user.is_authenticated and getattr(user, "tenant_id", None):
        try:
            from apps.hr_ops.models import Notification
            ctx["unread_notif_count"] = Notification.objects.filter(
                recipient=user, is_read=False
            ).count()
        except Exception:
            pass
    return ctx
