"""Authentication helpers for mobile JSON endpoints."""
from __future__ import annotations

import functools
import json

from django.http import JsonResponse

from .tokens import parse_mobile_token


def _parse_json(request):
    try:
        return json.loads(request.body.decode() or "{}")
    except (ValueError, UnicodeDecodeError):
        return None


def mobile_api_login_required(view_func):
    """Require Authorization: Bearer <mobile_token> and attach user + tenant."""

    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return JsonResponse({"detail": "Authentication required."}, status=401)
        token = header[7:].strip()
        parsed = parse_mobile_token(token)
        if parsed is None:
            return JsonResponse({"detail": "Invalid or expired token."}, status=401)
        user, tenant = parsed
        request.user = user
        request.tenant = tenant
        return view_func(request, *args, **kwargs)

    return wrapper


def json_body_required(view_func):
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        data = _parse_json(request)
        if data is None:
            return JsonResponse({"detail": "Invalid JSON."}, status=400)
        request.json_data = data
        return view_func(request, *args, **kwargs)

    return wrapper
