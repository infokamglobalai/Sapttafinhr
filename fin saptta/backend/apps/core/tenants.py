"""Tenant iteration helpers for Celery beat jobs."""
from contextlib import contextmanager

from django_tenants.utils import get_tenant_model, schema_context


def iter_tenant_schemas(exclude_public: bool = True):
    """Yield each customer tenant's schema name."""
    Tenant = get_tenant_model()
    qs = Tenant.objects.all()
    if exclude_public:
        qs = qs.exclude(schema_name="public")
    for tenant in qs:
        yield tenant


@contextmanager
def in_each_tenant():
    """Context-manager helper for use in a for-loop:
        for tenant in iter_tenant_schemas():
            with schema_context(tenant.schema_name):
                ...do work...
    """
    raise NotImplementedError("Use iter_tenant_schemas() with schema_context() directly.")
