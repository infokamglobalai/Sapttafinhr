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

from utils import mfa as mfa_service

from .sso import build_sso_redirect_url, mint_hr_sso_token

User = get_user_model()


def _authorized(request) -> bool:
    from django.conf import settings

    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        return False
    header = request.headers.get("Authorization", "")
    presented = header[7:] if header.startswith("Bearer ") else ""
    return bool(presented) and hmac.compare_digest(presented, secret)


def _parse_json(request):
    try:
        return json.loads(request.body.decode() or "{}")
    except (ValueError, UnicodeDecodeError):
        return None


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


def _authenticate_staff(data):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    workspace = (data.get("workspace") or "").strip().lower() or None

    if not email or not password:
        return None, JsonResponse({"detail": "email and password are required."}, status=400)

    resolved = _resolve_user(email, workspace)
    if resolved == "ambiguous":
        return None, JsonResponse(
            {"detail": "Multiple workspaces match this email. Specify workspace."},
            status=400,
        )
    user = resolved
    if user is None:
        return None, JsonResponse({"detail": "Invalid credentials."}, status=401)

    if not user.is_active:
        return None, JsonResponse({"detail": "Account is disabled."}, status=403)

    if not user.has_usable_password():
        return None, JsonResponse(
            {
                "detail": (
                    "Password not set yet. Open your invite link first, "
                    "or ask HR to resend it."
                ),
            },
            status=403,
        )

    if not user.check_password(password):
        return None, JsonResponse({"detail": "Invalid credentials."}, status=401)

    from apps.employees.profile_link import ensure_user_employee_profile

    ensure_user_employee_profile(user, tenant=user.tenant)
    return user, None


def _staff_mobile_payload(user) -> dict:
    from apps.mobile_api.tokens import mint_mobile_token

    return {
        "api_token": mint_mobile_token(user),
        "workspace": user.tenant.subdomain,
        "email": user.email,
        "auth_type": "hr_staff",
        "client": "mobile",
    }


def _staff_redirect_payload(user, *, platform_url: str, next_path: str) -> dict:
    subdomain = user.tenant.subdomain
    token = mint_hr_sso_token(user.email, subdomain)
    redirect_url = build_sso_redirect_url(token, next_path=next_path, platform_url=platform_url)
    return {
        "token": token,
        "workspace": subdomain,
        "email": user.email,
        "redirect_url": redirect_url,
        "auth_type": "hr_staff",
    }


def _staff_success_payload(user, *, platform_url: str, next_path: str, client: str) -> dict:
    if client == "mobile":
        return _staff_mobile_payload(user)
    return _staff_redirect_payload(user, platform_url=platform_url, next_path=next_path)


def _user_from_challenge(token: str, allowed_purposes: set[str]):
    parsed = mfa_service.unsign_login_challenge(token)
    if not parsed:
        return None, JsonResponse({"detail": "Challenge expired or invalid."}, status=400)
    user_id, purpose = parsed
    if purpose not in allowed_purposes:
        return None, JsonResponse({"detail": "Invalid challenge."}, status=400)
    user = User.objects.filter(pk=user_id, is_active=True).select_related("tenant").first()
    if user is None:
        return None, JsonResponse({"detail": "User not found."}, status=404)
    return user, None


@csrf_exempt
@require_http_methods(["POST"])
def staff_login_api(request):
    """POST /internal/staff-login/  (Bearer SSO_SHARED_SECRET)

    Body: { email, password, workspace?, platform_url?, next? }
    """
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    data = _parse_json(request)
    if data is None:
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    platform_url = (data.get("platform_url") or "").strip()
    next_path = (data.get("next") or "/").strip() or "/"
    client = (data.get("client") or "").strip().lower()

    user, err = _authenticate_staff(data)
    if err:
        return err

    if mfa_service.mfa_required_for_user(user):
        from utils.login_otp import issue_and_send_login_otp

        try:
            issue_and_send_login_otp(user)
        except Exception:
            return JsonResponse(
                {"detail": "Could not send verification email. Check SMTP settings."},
                status=503,
            )
        return JsonResponse(
            {
                "mfa_required": True,
                "mfa_setup_required": False,
                "mfa_method": "email_otp",
                "challenge_token": mfa_service.mint_login_challenge(user.pk, "verify"),
                "email": user.email,
                "auth_type": "hr_staff",
            }
        )

    return JsonResponse(_staff_success_payload(user, platform_url=platform_url, next_path=next_path, client=client))


@csrf_exempt
@require_http_methods(["POST"])
def staff_login_mfa_api(request):
    """POST /internal/staff-login/mfa/  verify email OTP and return SSO redirect."""
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    data = _parse_json(request)
    if data is None:
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    token = (data.get("challenge_token") or "").strip()
    code = (data.get("code") or "").strip()
    platform_url = (data.get("platform_url") or "").strip()
    next_path = (data.get("next") or "/").strip() or "/"
    client = (data.get("client") or "").strip().lower()

    if not token or not code:
        return JsonResponse({"detail": "challenge_token and code are required."}, status=400)

    user, err = _user_from_challenge(token, {"verify"})
    if err:
        return err
    if not mfa_service.verify_totp(user, code):
        return JsonResponse({"detail": "Invalid verification code."}, status=401)

    return JsonResponse(_staff_success_payload(user, platform_url=platform_url, next_path=next_path, client=client))


@csrf_exempt
@require_http_methods(["POST"])
def staff_mfa_resend_api(request):
    """POST /internal/staff-login/mfa/resend/  resend email OTP for pending login."""
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    data = _parse_json(request)
    if data is None:
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    token = (data.get("challenge_token") or "").strip()
    if not token:
        return JsonResponse({"detail": "challenge_token is required."}, status=400)

    user, err = _user_from_challenge(token, {"verify"})
    if err:
        return err
    if not mfa_service.mfa_required_for_user(user):
        return JsonResponse({"detail": "Two-factor sign-in is not enabled for this workspace."}, status=400)

    from utils.login_otp import issue_and_send_login_otp

    try:
        issue_and_send_login_otp(user)
    except Exception:
        return JsonResponse(
            {"detail": "Could not send verification email. Check SMTP settings."},
            status=503,
        )
    return JsonResponse({"detail": "A new verification code was sent to your email."})


@csrf_exempt
@require_http_methods(["POST"])
def staff_mfa_setup_start_api(request):
    return JsonResponse(
        {"detail": "Authenticator setup is not required. Check your email for the sign-in code."},
        status=400,
    )


@csrf_exempt
@require_http_methods(["POST"])
def staff_mfa_setup_confirm_api(request):
    return JsonResponse(
        {"detail": "Authenticator setup is not required. Check your email for the sign-in code."},
        status=400,
    )
