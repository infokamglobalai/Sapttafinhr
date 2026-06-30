"""Cross-product launch from HR (Finance handoff via FIN internal API)."""
from __future__ import annotations

import logging

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.views.decorators.http import require_http_methods

from .billing_services import _finance_base, _finance_headers
from .platform import platform_base_for_request
from .product_access import tenant_has_finance

logger = logging.getLogger(__name__)


@login_required
@require_http_methods(["GET"])
def launch_finance(request):
    """Open fin-saptta with a JWT handoff — only if FIN is on the subscription."""
    tenant = getattr(request, "tenant", None)
    user = request.user
    platform_url = platform_base_for_request(request)
    billing_url = f"{platform_url}/app/billing"

    if not tenant_has_finance(tenant):
        messages.warning(
            request,
            "Finance is not on your plan. Upgrade to access fin-saptta.",
        )
        return redirect(billing_url)

    base = _finance_base()
    secret_headers = _finance_headers()
    if not base or not secret_headers.get("Authorization", "").replace("Bearer ", ""):
        messages.error(request, "Finance handoff is not configured on this server.")
        return redirect(billing_url)

    try:
        import requests

        resp = requests.get(
            f"{base}/api/v1/saas/internal/finance-handoff/",
            params={
                "workspace": tenant.subdomain,
                "email": user.email,
                "platform_url": platform_url,
            },
            headers=secret_headers,
            timeout=15,
        )
    except Exception:
        logger.exception("Finance handoff request failed for %s", tenant.subdomain)
        messages.error(request, "Could not reach Finance. Try again in a moment.")
        return redirect(billing_url)

    if resp.status_code == 200:
        url = resp.json().get("finance_url")
        if url:
            return redirect(url)
        messages.error(request, "Finance handoff returned an invalid response.")
        return redirect(billing_url)

    try:
        detail = resp.json().get("detail", "Finance is not available.")
    except Exception:
        detail = "Finance is not available."

    if resp.status_code == 403:
        messages.warning(request, detail)
        return redirect(billing_url)

    messages.error(request, detail)
    return redirect(billing_url)
