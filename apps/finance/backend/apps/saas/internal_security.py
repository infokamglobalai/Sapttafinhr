"""Internal tenant security sync from HR — server-to-server only."""
from __future__ import annotations

import hmac
import json

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


def _authorized(request) -> bool:
    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        return False
    header = request.headers.get("Authorization", "")
    presented = header[7:] if header.startswith("Bearer ") else ""
    return bool(presented) and hmac.compare_digest(presented, secret)


@csrf_exempt
@require_http_methods(["POST"])
def tenant_security(request):
    """POST /api/v1/saas/internal/tenant-security/  { workspace, login_email_otp_enabled }"""
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    try:
        data = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    workspace = (data.get("workspace") or "").strip().lower()
    if not workspace:
        return JsonResponse({"detail": "workspace is required."}, status=400)

    from apps.core.models import Tenant

    tenant = Tenant.objects.filter(schema_name=workspace).first()
    if not tenant:
        return JsonResponse({"detail": "Unknown workspace."}, status=404)

    enabled = bool(data.get("login_email_otp_enabled"))
    tenant.login_email_otp_enabled = enabled
    tenant.save(update_fields=["login_email_otp_enabled"])
    return JsonResponse({"ok": True, "workspace": workspace, "login_email_otp_enabled": enabled})
