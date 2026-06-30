"""My Team navigation — grouped links for manager overview and command palette."""
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


def my_team_nav_groups() -> list[dict]:
    """Grouped manager actions — direct-report scope only."""
    items = [
        _item("Leave approvals", "leaves:pending", keys="leave approve pending team"),
        _item("Comp-off approvals", "leaves:comp_off_pending", keys="comp off compensatory approve"),
        _item("Expense approvals", "payroll:team_expenses", keys="expense reimbursement claim approve"),
        _item("Request approvals", "hr_ops:team_service_requests", keys="help support ticket approve", url_names_active=("team_service_requests", "team_service_request_detail")),
        _item("Attendance corrections", "attendance:regularizations", keys="attendance regularization correction approve"),
        _item("Team attendance", "attendance:team_attendance", keys="team attendance present absent"),
        _item("Team reviews", "performance:team_reviews", keys="performance review appraisal team"),
    ]
    items = [i for i in items if i.get("url")]
    if not items:
        return []
    return [{
        "id": "team",
        "label": "My Team",
        "icon": "team",
        "summary": "Direct reports — approvals and team tools",
        "items": items,
    }]


def _item_matches_request(item: dict, app_name: str, url_name: str) -> bool:
    item_app, _, item_name = item["url_name"].partition(":")
    active = set(item.get("url_names_active") or ())

    if item["url_name"] == "hr_ops:team_service_requests":
        return url_name in active or url_name == "team_service_request_detail"

    if url_name in active:
        return not item_app or app_name == item_app

    return app_name == item_app and url_name == item_name


def annotate_my_team_nav(groups: list[dict], request) -> list[dict]:
    """Mark active group/item for the current request."""
    match = getattr(request, "resolver_match", None)
    app_name = (match.app_name if match else "") or ""
    url_name = (match.url_name if match else "") or ""

    if url_name == "my_team":
        out = []
        for group in groups:
            g = dict(group)
            g["items"] = [dict(i, is_active=False) for i in group["items"]]
            g["is_active"] = False
            out.append(g)
        return out

    out = []
    for group in groups:
        g = dict(group)
        g_items = []
        group_active = False
        for item in group["items"]:
            it = dict(item)
            it["is_active"] = _item_matches_request(it, app_name, url_name)
            if it["is_active"]:
                group_active = True
            g_items.append(it)
        g["items"] = g_items
        g["is_active"] = group_active
        out.append(g)
    return out


def my_team_palette_links(groups: list[dict]) -> list[dict]:
    links = [
        {
            "label": "My Team overview",
            "url": _url("employees:my_team"),
            "group": "My Team",
            "keys": "my team manager overview direct reports",
        },
    ]
    for group in groups:
        for item in group["items"]:
            if not item.get("url"):
                continue
            links.append({
                "label": item["label"],
                "url": item["url"],
                "group": f"My Team · {group['label']}",
                "keys": f"{item.get('keys', '')} {group['label']}".strip().lower(),
            })
    return links
