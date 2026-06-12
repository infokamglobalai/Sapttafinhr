from django.conf import settings
from django.db import connection
from django_tenants.utils import get_tenant_model, get_public_schema_name


class CustomTenantMiddleware:
    """
    Custom tenant middleware that runs on the unified domain.
    Resolves the tenant schema from an EXPLICIT 'X-Workspace' header (or
    '?workspace=' query param); otherwise stays on the public schema.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        Tenant = get_tenant_model()
        public_schema = get_public_schema_name()

        # Ensure we start in the public schema for resolving tenant & user
        connection.set_schema_to_public()

        # Default to public; switch only on an explicit workspace selector.
        tenant = Tenant.objects.get(schema_name=public_schema)
        workspace = request.headers.get("X-Workspace") or request.GET.get("workspace")
        if workspace:
            try:
                tenant = Tenant.objects.get(schema_name=workspace)
            except Tenant.DoesNotExist:
                pass

        request.tenant = tenant
        connection.set_tenant(request.tenant)

        # Match django-tenants URL configuration behavior
        if tenant.schema_name == public_schema:
            request.urlconf = settings.PUBLIC_SCHEMA_URLCONF
        else:
            request.urlconf = settings.ROOT_URLCONF

        response = self.get_response(request)
        return response
