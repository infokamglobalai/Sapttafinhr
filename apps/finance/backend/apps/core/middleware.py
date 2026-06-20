from django.conf import settings
from django.db import connection
from django_tenants.utils import get_tenant_model, get_public_schema_name


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
                except Exception:
                    pass

        # 3. Fallback to host-based subdomain routing (for backward compatibility)
        if not workspace:
            hostname = request.get_host().split(":")[0].lower()
            # Shared domains always default to public
            public_domains = ["saptta.com", "app.saptta.com", "www.saptta.com", "localhost", "127.0.0.1"]
            if hostname not in public_domains:
                parts = hostname.split(".")
                if len(parts) > 2:
                    workspace = parts[0]

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

        return self.get_response(request)
