"""My Space navigation — grouped links for sidebar, hub, and command palette."""
from __future__ import annotations

from django.urls import reverse


def _url(url_name: str, *, query: str = "") -> str:
    try:
        base = reverse(url_name)
    except Exception:
        return ""
    return f"{base}?{query}" if query else base


def _item(label: str, url_name: str, *, keys: str = "", query: str = "", url_names_active: tuple[str, ...] = ()):
    return {
        "label": label,
        "url_name": url_name,
        "url": _url(url_name, query=query),
        "keys": keys,
        "url_names_active": url_names_active or (url_name.split(":")[-1],),
    }


def my_space_nav_groups(
    *,
    tenant_is_india_payroll: bool = True,
    employee_has_onboarding: bool = False,
) -> list[dict]:
    """Grouped self-service links — sidebar shows groups; hub shows all items."""
    groups = [
        {
            "id": "time",
            "label": "Time & attendance",
            "icon": "time",
            "summary": "Punch, corrections, timesheets",
            "items": [
                _item("My Attendance", "attendance:my_attendance", keys="attendance punch clock in out"),
                _item("Request Correction", "attendance:regularization", keys="attendance regularization correction"),
                _item("My Timesheet", "projects:my_timesheet", keys="timesheet hours log time"),
            ],
        },
        {
            "id": "leave",
            "label": "Leave",
            "icon": "leave",
            "summary": "Apply leave and comp-off",
            "items": [
                _item(
                    "Apply Leave", "leaves:apply",
                    keys="leave apply time off vacation",
                    url_names_active=("apply", "my_leaves"),
                ),
                _item("Comp-off", "leaves:comp_off", keys="comp off compensatory"),
            ],
        },
        {
            "id": "pay",
            "label": "Pay & benefits",
            "icon": "payroll",
            "summary": "Payslips, claims, loans",
            "items": [
                _item("My Payslips", "payroll:my_payslips", keys="payslip salary pay slip"),
                _item(
                    "Reimbursements", "payroll:my_expenses",
                    keys="expense reimbursement claim",
                    url_names_active=("my_expenses", "expense_submit", "expense_edit"),
                ),
                _item("My Loans", "payroll:my_loans", keys="loan advance"),
            ],
        },
        {
            "id": "company",
            "label": "Company",
            "icon": "people",
            "summary": "Directory, policies, news",
            "items": [
                _item(
                    "Company Directory", "employees:directory",
                    keys="directory colleague find people",
                    url_names_active=("directory", "colleague"),
                ),
                _item("Org chart", "employees:org_chart", keys="org chart hierarchy"),
                _item(
                    "Announcements", "hr_ops:announcements",
                    keys="announcement news notice",
                    url_names_active=("announcements",),
                ),
                _item(
                    "Celebrations", "hr_ops:celebrations",
                    keys="birthday anniversary celebration",
                    url_names_active=("celebrations",),
                ),
                _item(
                    "Company Policies", "hr_ops:employee_policies",
                    keys="policy handbook rules",
                    url_names_active=("employee_policies", "employee_policy_view"),
                ),
                _item(
                    "Company Documents", "hr_ops:my_company_doc_requests",
                    keys="document letter certificate",
                    url_names_active=("my_company_doc_requests", "my_company_doc_request_detail", "company_doc_request_create"),
                ),
            ],
        },
        {
            "id": "work",
            "label": "Work & growth",
            "icon": "projects",
            "summary": "Projects, reviews, onboarding",
            "items": [
                _item(
                    "My Projects", "projects:my_projects",
                    keys="project assignment",
                    url_names_active=("my_projects", "detail"),
                ),
                _item("My Reviews", "performance:my_reviews", keys="performance review appraisal"),
            ],
        },
        {
            "id": "support",
            "label": "Help & assets",
            "icon": "support",
            "summary": "Tickets and assigned equipment",
            "items": [
                _item(
                    "Help & Requests", "hr_ops:my_service_requests",
                    keys="help support ticket request",
                    url_names_active=("my_service_requests", "my_service_request_detail", "request_create"),
                ),
                _item("My Assets", "hr_ops:my_assets", keys="laptop asset equipment"),
            ],
        },
        {
            "id": "account",
            "label": "Account",
            "icon": "settings",
            "summary": "Profile and preferences",
            "items": [
                _item(
                    "Account settings", "accounts:settings",
                    keys="settings profile password security",
                    query="tab=profile",
                    url_names_active=("settings",),
                ),
                _item("My Profile", "employees:my_work", keys="profile my work dashboard", url_names_active=("my_work",)),
            ],
        },
    ]

    if tenant_is_india_payroll:
        pay_group = next(g for g in groups if g["id"] == "pay")
        pay_group["items"].extend([
            _item("Tax Declaration", "payroll:my_tax_declaration", keys="tax declaration 80c"),
            _item("My Form 16", "payroll:my_form16s", keys="form 16 tax certificate"),
        ])

    if employee_has_onboarding:
        work_group = next(g for g in groups if g["id"] == "work")
        work_group["items"].append(
            _item("Onboarding", "hr_ops:my_onboarding", keys="onboarding checklist join"),
        )

    # Drop items with missing URLs (bad deploy / feature flag).
    for group in groups:
        group["items"] = [i for i in group["items"] if i.get("url")]

    return [g for g in groups if g["items"]]


def _item_matches_request(item: dict, app_name: str, url_name: str, settings_tab: str) -> bool:
    item_app, _, item_name = item["url_name"].partition(":")
    active = set(item.get("url_names_active") or ())

    if item["url_name"] == "accounts:settings":
        return app_name == "accounts" and url_name == "settings" and settings_tab in ("", "profile")

    if item["url_name"] == "projects:my_projects":
        return app_name == "projects" and url_name in ("my_projects", "detail")

    if item["url_name"] == "hr_ops:celebrations":
        return "celebration" in url_name

    if item["url_name"] == "hr_ops:announcements":
        return url_name == "announcements" or "announcement" in url_name

    if item["url_name"] == "hr_ops:my_service_requests":
        return url_name in active or "service_request" in url_name

    if item["url_name"] == "hr_ops:my_company_doc_requests":
        return url_name in active or "company_doc" in url_name

    if url_name in active:
        return not item_app or app_name == item_app

    return app_name == item_app and url_name == item_name


def annotate_my_space_nav(groups: list[dict], request) -> list[dict]:
    """Mark active group/item for the current request."""
    match = getattr(request, "resolver_match", None)
    app_name = (match.app_name if match else "") or ""
    url_name = (match.url_name if match else "") or ""
    settings_tab = ""
    if app_name == "accounts" and url_name == "settings":
        settings_tab = (request.GET.get("tab") or "profile").strip().lower()

    out = []
    for group in groups:
        g = dict(group)
        g_items = []
        group_active = False
        for item in group["items"]:
            it = dict(item)
            it["is_active"] = _item_matches_request(it, app_name, url_name, settings_tab)
            if it["is_active"]:
                group_active = True
            g_items.append(it)
        g["items"] = g_items
        g["is_active"] = group_active
        out.append(g)
    return out


def my_space_palette_links(groups: list[dict]) -> list[dict]:
    """Flat command-palette entries from grouped nav."""
    links = [
        {
            "label": "My Space overview",
            "url": _url("employees:my_work"),
            "group": "My Space",
            "keys": "my space home profile overview",
        },
    ]
    for group in groups:
        for item in group["items"]:
            if not item.get("url"):
                continue
            links.append({
                "label": item["label"],
                "url": item["url"],
                "group": f"My Space · {group['label']}",
                "keys": f"{item.get('keys', '')} {group['label']}".strip().lower(),
            })
    return links
