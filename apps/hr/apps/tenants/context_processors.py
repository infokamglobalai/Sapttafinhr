SETTINGS_URL_NAMES = frozenset({
    "departments", "department_create", "designations", "designation_create",
    "locations", "location_create",
    "leave_types", "leave_type_create", "leave_type_edit", "holidays", "holiday_create", "balances",
    "shifts", "shift_create", "shift_edit",
    "structures", "structure_create", "structure_edit",
    "statutory", "statutory_create", "statutory_edit",
    "policy_list", "policy_create", "policy_edit",
    "announcements", "announcement_create", "announcement_edit",
    "onboarding_templates", "onboarding_template_create", "onboarding_template_edit",
})


def tenant_context(request):
    """Injects current tenant + notification unread count into every template."""
    url_name = getattr(getattr(request, "resolver_match", None), "url_name", "") or ""
    ctx = {
        "tenant": getattr(request, "tenant", None),
        "unread_notif_count": 0,
        "nav_is_settings": url_name in SETTINGS_URL_NAMES,
    }
    user = getattr(request, "user", None)
    if user and user.is_authenticated and getattr(user, "tenant_id", None):
        try:
            from apps.hr_ops.models import Notification
            ctx["unread_notif_count"] = Notification.objects.filter(
                recipient=user, is_read=False
            ).count()
        except Exception:
            pass
    return ctx
