"""Pytest fixtures to make django-tenants work under pytest-django.

Tenant-app models (masters, ledger, billing, …) live in a per-tenant Postgres
schema, but pytest-django's default test DB only migrates the public schema —
so those tables don't exist and tenant tests fail with "relation ... does not
exist". This conftest creates a real test tenant (which auto-creates + migrates
its schema) once per session, and runs every DB test inside that tenant's
schema. django-tenants routes SHARED_APPS models (identity, saas, core) to the
public schema even from within a tenant context, so shared-schema tests work too.
"""
import pytest


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):  # noqa: F811
    """After the standard test DB is built, provision a 'test' tenant + schema."""
    with django_db_blocker.unblock():
        from apps.core.models import Tenant

        # Ensure the public tenant exists (django-tenants requires it).
        Tenant.objects.get_or_create(schema_name="public", defaults={"name": "Public"})

        # Create the tenant whose schema holds the TENANT_APPS tables. Saving a
        # TenantMixin with auto_create_schema=True creates + migrates the schema.
        tenant, created = Tenant.objects.get_or_create(
            schema_name="test", defaults={"name": "Test Tenant"}
        )
        if created:
            # Schema is created on save; migrations run automatically.
            pass


@pytest.fixture(autouse=True)
def _use_test_schema(request, django_db_blocker):
    """Run each DB test inside the 'test' tenant schema context."""
    # Only activate for tests that actually touch the DB.
    if "django_db" not in request.keywords and "django_db_setup" not in request.fixturenames:
        yield
        return

    from django_tenants.utils import schema_context

    with schema_context("test"):
        yield
