def tenant_context(request):
    """Injects current tenant + notification unread count into every template."""
    ctx = {"tenant": getattr(request, "tenant", None), "unread_notif_count": 0}
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
