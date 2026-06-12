def tenant_context(request):
    """
    Injects current tenant, notification count, sidebar active category,
    and pending badge counts into every template.
    """
    ctx = {
        "tenant": getattr(request, "tenant", None),
        "unread_notif_count": 0,
        "sidebar_active_category": _get_active_category(request),
        "sidebar_pending": {},
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
        # Pending badge counts for nav items
        try:
            ctx["sidebar_pending"] = _get_pending_counts(request, user)
        except Exception:
            pass
    return ctx


def _get_active_category(request):
    """Determine sidebar active category from the current URL name / app_name."""
    match = getattr(request, "resolver_match", None)
    if not match:
        return "dashboard"

    app_name = getattr(match, "app_name", "") or ""
    url_name = getattr(match, "url_name", "") or ""

    # Dashboard
    if app_name == "tenants":
        return "dashboard"

    # My Space (any employee self-service view)
    MY_SPACE_URLS = {
        "my_attendance", "regularization", "apply", "my_leaves",
        "my_payslips", "my_expenses", "expense_submit", "expense_edit",
        "my_loans", "my_reviews", "my_tax_declaration", "my_form16s",
    }
    if url_name in MY_SPACE_URLS:
        return "mySpace"

    # People (HR admin employee management)
    if app_name == "employees":
        return "people"

    # Time & Leave (admin)
    if url_name in ("register",):
        return "timeLeave"
    if url_name == "pending" and app_name == "leaves":
        user = getattr(request, "user", None)
        is_hr_admin = getattr(user, "is_hr_admin", False)
        if is_hr_admin:
            return "timeLeave"
        return "team"

    # Payroll
    PAYROLL_URLS = {
        "run_list", "run_detail", "run_create",
        "tax_declarations_admin", "form16_admin",
    }
    if (url_name in PAYROLL_URLS
            or "loan" in url_name
            or ("expense" in url_name and getattr(getattr(request, "user", None), "is_hr_admin", False))):
        return "payroll"

    # Performance / Recruitment
    if app_name == "performance":
        return "performance"
    if app_name == "recruitment":
        return "performance"

    # HR Ops
    HR_OPS_URLS = {
        "onboarding", "people_pulse", "document_expiry",
        "audit_log", "letter_templates", "assets", "exit_list",
    }
    if url_name in HR_OPS_URLS:
        return "hrOps"

    # Team (manager views)
    if url_name == "team_reviews":
        return "team"

    return "dashboard"


def _get_pending_counts(request, user):
    """Compute pending action counts for sidebar badges (safe — never raises to caller)."""
    pending = {}
    tenant = getattr(request, "tenant", None)
    if not tenant:
        return pending

    try:
        from apps.leaves.models import LeaveRequest
        employee = getattr(user, "employee_profile", None)
        if user.is_hr_admin:
            pending["leave_approvals"] = LeaveRequest.objects.filter(
                tenant=tenant, status="pending"
            ).count()
        elif user.is_manager and employee:
            pending["leave_approvals"] = LeaveRequest.objects.filter(
                tenant=tenant, status="pending",
                employee__reporting_manager=employee,
            ).count()
    except Exception:
        pass

    try:
        from apps.payroll.models import PayrollRun
        if user.is_hr_admin:
            pending["draft_payroll"] = PayrollRun.objects.filter(
                tenant=tenant, status="draft"
            ).count()
    except Exception:
        pass

    return pending
