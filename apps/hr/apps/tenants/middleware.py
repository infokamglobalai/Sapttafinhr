from django.http import Http404
from django.http import HttpResponseForbidden
from django.conf import settings
from django.core.cache import cache

from .models import ProductCode, Tenant


class TenantMiddleware:
    """
    Resolves the current tenant from the request subdomain and attaches it
    to ``request.tenant``.

    Caches the tenant lookup for 5 minutes to avoid a DB hit on every request.
    Platform superadmin domain bypasses tenant resolution.
    """

    CACHE_PREFIX = "tenant_subdomain:"
    CACHE_TTL = 300  # 5 minutes
    EXEMPT_PREFIXES = ("/static/", "/media/", "/superadmin/", "/auth/sso/", "/internal/")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from apps.accounts.platform import remember_platform_origin
        remember_platform_origin(request)

        # Exempt paths (static, superadmin, SSO entry, internal control-plane)
        # bypass tenant resolution entirely — they either don't need a tenant or
        # establish it themselves, and must not 404 on an unknown Host header
        # (e.g. server-to-server calls to `hr-backend:8000`).
        if self._is_exempt_path(request.path):
            request.tenant = None
            return self.get_response(request)

        request.tenant = self._resolve_tenant(request)

        # Tag Sentry events with tenant info so errors are searchable by tenant.
        if request.tenant is not None:
            try:
                from sentry_sdk import set_tag, set_context
                set_tag("tenant.subdomain", request.tenant.subdomain)
                set_tag("tenant.plan", request.tenant.plan)
                set_context("tenant", {
                    "id": str(request.tenant.id),
                    "name": request.tenant.name,
                    "subdomain": request.tenant.subdomain,
                    "plan": request.tenant.plan,
                })
            except ImportError:
                pass

        # Defense-in-depth tenant guard: a logged-in tenant user must belong to
        # the resolved tenant. Login is already tenant-scoped (TenantAuthBackend)
        # and sessions are host-scoped (no SESSION_COOKIE_DOMAIN), so this should
        # never trigger in practice — but it hard-stops any cross-tenant access a
        # future view that forgets to filter by request.tenant might otherwise allow.
        if (
            request.user.is_authenticated
            and not request.user.is_superuser
            and request.tenant is not None
            and getattr(request.user, "tenant_id", None)
            and request.user.tenant_id != request.tenant.id
        ):
            return HttpResponseForbidden("You don't have access to this workspace.")

        if (
            request.tenant is not None
            and not self._is_exempt_path(request.path)
            and not request.tenant.has_product_access(ProductCode.HR)
        ):
            return HttpResponseForbidden("This workspace does not have an active HR subscription.")

        # If an authenticated platform superuser (no tenant) tries to use
        # the HRMS UI, redirect them to the Django admin which is where
        # they belong. The HRMS UI assumes tenant context everywhere.
        if (
            request.user.is_authenticated
            and request.user.is_superuser
            and request.tenant is None
            and not request.path.startswith("/superadmin/")
            and not request.path.startswith("/static/")
            and not request.path.startswith("/auth/logout")
        ):
            from django.contrib import messages
            from django.shortcuts import redirect
            messages.info(request, "Platform superusers use the /superadmin/ panel. Log in as a tenant user to access the HRMS UI.")
            return redirect("/superadmin/")

        # Forced first-run setup gate: until the workspace is set up, an
        # authenticated tenant user is redirected to the setup wizard. Exempt the
        # setup page itself, auth, static/media, and internal/superadmin paths.
        if (
            request.user.is_authenticated
            and request.tenant is not None
            and not request.tenant.setup_complete
            and not self._is_exempt_path(request.path)
            and not request.path.startswith("/setup/")
            and not request.path.startswith("/auth/")
        ):
            from django.shortcuts import redirect
            return redirect("/setup/")

        return self.get_response(request)

    def _is_exempt_path(self, path):
        return any(path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES)

    def _resolve_tenant(self, request):
        host = request.get_host().split(":")[0].lower()  # strip port
        superadmin_domain = getattr(settings, "HRMS_SUPERADMIN_DOMAIN", "")
        tenant_base_domain = getattr(settings, "HRMS_TENANT_DOMAIN", "")

        # Dev / superadmin: fall back to the authenticated user's tenant.
        # This lets developers work without subdomain DNS (acmecorp.localhost).
        if host == superadmin_domain or host in ("localhost", "127.0.0.1"):
            user = getattr(request, "user", None)
            if user is not None and user.is_authenticated and getattr(user, "tenant_id", None):
                return user.tenant
            return None

        # Extract subdomain: acmecorp.yourbrand.com → "acmecorp"
        subdomain = host.replace(f".{tenant_base_domain}", "").strip(".")

        if not subdomain:
            return None

        cache_key = f"{self.CACHE_PREFIX}{subdomain}"
        tenant = cache.get(cache_key)

        if tenant is None:
            try:
                tenant = Tenant.objects.get(subdomain=subdomain, status__in=["active", "trial"])
                cache.set(cache_key, tenant, self.CACHE_TTL)
            except Tenant.DoesNotExist:
                raise Http404(f"No HRMS account found for '{subdomain}'.")

        return tenant
