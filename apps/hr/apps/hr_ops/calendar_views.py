"""Dashboard company calendar — create/delete events."""
import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST

from utils.access import hr_admin_required


@login_required
@hr_admin_required
@require_POST
def calendar_event_create(request):
    from .models import CompanyCalendarEvent

    tenant = request.user.tenant
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    title = (payload.get("title") or "").strip()
    event_date = payload.get("event_date")
    description = (payload.get("description") or "").strip()
    event_type = payload.get("event_type") or "reminder"
    notify_on_day = payload.get("notify_on_day", True)

    if not title or not event_date:
        return JsonResponse({"ok": False, "error": "Title and date are required"}, status=400)

    if event_type not in dict(CompanyCalendarEvent.EVENT_TYPE_CHOICES):
        event_type = "reminder"

    event = CompanyCalendarEvent.objects.create(
        tenant=tenant,
        title=title,
        event_date=event_date,
        description=description,
        event_type=event_type,
        notify_on_day=bool(notify_on_day),
        created_by=request.user,
    )

    return JsonResponse(
        {
            "ok": True,
            "event": {
                "id": event.pk,
                "title": event.title,
                "event_date": event.event_date.isoformat(),
                "description": event.description,
                "event_type": event.event_type,
            },
        }
    )


@login_required
@hr_admin_required
@require_POST
def calendar_event_delete(request, pk):
    from .models import CompanyCalendarEvent

    event = get_object_or_404(CompanyCalendarEvent, pk=pk, tenant=request.user.tenant)
    event.delete()
    return JsonResponse({"ok": True})
