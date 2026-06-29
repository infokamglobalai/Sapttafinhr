import logging
from django.conf import settings
from django.db import connection
from django_tenants.utils import get_tenant_model, get_public_schema_name

logger = logging.getLogger(__name__)


class HeaderTenantMiddleware:
    """
    Custom tenant middleware that resolves the schema name dynamically.
    Enables running Saptta Finance on a single domain.
    
    Order of resolution:
    1. HTTP header 'X-Workspace' or query parameters ('workspace', 'ws')
    2. JWT authorization token claim 'workspace'
    3. Fallback to subdomain routing (resolves schema name from host name)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        logger.debug(
            "Tenant resolve path=%s host=%s X-Workspace=%s",
            request.path,
            request.get_host(),
            request.headers.get("X-Workspace"),
        )

        connection.set_schema_to_public()

        # 1. Resolve workspace from headers or query parameters
        workspace = request.headers.get("X-Workspace") or request.GET.get("workspace") or request.GET.get("ws")

        # 2. Extract workspace from JWT Authorization header
        if not workspace:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token_str = auth_header.split(" ")[1]
                try:
                    from rest_framework_simplejwt.tokens import AccessToken
                    token = AccessToken(token_str)
                    workspace = token.get("workspace")
                    # Fallback for tokens minted without a workspace claim (e.g.
                    # signup tokens, or older tokens): resolve the owner's tenant
                    # from the user id, the same way the login serializer does.
                    # Without this such tokens fall back to the public schema and
                    # every tenant API call 500s ("relation does not exist").
                    if not workspace:
                        uid = token.get("user_id")
                        if uid:
                            from apps.identity.jwt import resolve_workspace_for
                            from apps.identity.models import User
                            owner = User.objects.filter(pk=uid).first()
                            if owner:
                                workspace = resolve_workspace_for(owner)
                except Exception:
                    pass

        # 3. Fallback to host-based subdomain routing (for backward compatibility)
        if not workspace:
            hostname = request.get_host().split(":")[0].lower()
            # Shared domains always default to public
            public_domains = ["saptta.com", "app.saptta.com", "www.saptta.com", "finance.saptta.com", "localhost", "127.0.0.1"]
            if hostname not in public_domains:
                parts = hostname.split(".")
                if len(parts) > 2:
                    sub = parts[0]
                    # Skip common platform/infrastructure subdomains to avoid useless DB lookups on custom domains
                    if sub not in ["app", "www", "finance", "finance-web", "hr", "public", "api"]:
                        workspace = sub

        TenantModel = get_tenant_model()
        tenant = None

        if workspace:
            workspace = workspace.strip().lower()
            try:
                tenant = TenantModel.objects.get(schema_name=workspace)
            except TenantModel.DoesNotExist:
                pass

        if not tenant:
            try:
                tenant = TenantModel.objects.get(schema_name=get_public_schema_name())
            except TenantModel.DoesNotExist:
                pass

        if tenant:
            connection.set_tenant(tenant)
            request.tenant = tenant
        else:
            request.tenant = None

        logger.debug(
            "Tenant set schema=%s path=%s",
            tenant.schema_name if tenant else None,
            request.path,
        )

        return self.get_response(request)
