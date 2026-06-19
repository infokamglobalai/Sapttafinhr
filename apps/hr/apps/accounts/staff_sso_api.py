"""Internal API — verify HR staff credentials and mint an SSO handoff token.

Called by the Finance platform when platform login fails, so employees and
managers can use the same login page as company owners (localhost:8080/login).
"""
from __future__ import annotations

import hmac
import json

from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .sso import mint_hr_sso_token, build_sso_redirect_url

User = get_user_model()


def _authorized(request) -> bool:
    from django.conf import settings

    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        return False
    header = request.headers.get("Authorization", "")
    presented = header[7:] if header.startswith("Bearer ") else ""
    return bool(presented) and hmac.compare_digest(presented, secret)


def _resolve_user(email: str, workspace: str | None):
    email = email.strip().lower()
    if workspace:
        return User.objects.filter(
            email__iexact=email,
            tenant__subdomain=workspace.strip().lower(),
        ).select_related("tenant").first()

    matches = list(
        User.objects.filter(email__iexact=email, tenant__isnull=False, is_active=True)
        .select_related("tenant")[:2]
    )
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        return "ambiguous"
    return None


@csrf_exempt
@require_http_methods(["POST"])
def staff_login_api(request):
    """POST /internal/staff-login/  (Bearer SSO_SHARED_SECRET)

    Body: { email, password, workspace?, platform_url?, next? }
    """
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    try:
        data = json.loads(request.body.decode() or "{}")
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    workspace = (data.get("workspace") or "").strip().lower() or None
    platform_url = (data.get("platform_url") or "").strip()
    next_path = (data.get("next") or "/").strip() or "/"

    if not email or not password:
        return JsonResponse({"detail": "email and password are required."}, status=400)

    resolved = _resolve_user(email, workspace)
    if resolved == "ambiguous":
        return JsonResponse(
            {"detail": "Multiple workspaces match this email. Specify workspace."},
            status=400,
        )
    user = resolved
    if user is None:
        return JsonResponse({"detail": "Invalid credentials."}, status=401)

    if not user.is_active:
        return JsonResponse({"detail": "Account is disabled."}, status=403)

    if not user.has_usable_password():
        return JsonResponse(
            {
                "detail": (
                    "Password not set yet. Open your invite link first, "
                    "or ask HR to resend it."
                ),
            },
            status=403,
        )

    if not user.check_password(password):
        return JsonResponse({"detail": "Invalid credentials."}, status=401)

    from apps.employees.profile_link import ensure_user_employee_profile

    ensure_user_employee_profile(user, tenant=user.tenant)

    subdomain = user.tenant.subdomain
    token = mint_hr_sso_token(user.email, subdomain)
    redirect_url = build_sso_redirect_url(token, next_path=next_path, platform_url=platform_url)

    return JsonResponse(
        {
            "token": token,
            "workspace": subdomain,
            "email": user.email,
            "redirect_url": redirect_url,
            "auth_type": "hr_staff",
        }
    )
