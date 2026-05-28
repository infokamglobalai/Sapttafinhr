"""Tenant, Domain, and shared base models."""
from django.db import models
from django_tenants.models import DomainMixin, TenantMixin


class Tenant(TenantMixin):
    """A customer organization. Each gets its own Postgres schema."""

    name = models.CharField(max_length=200)
    created_on = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    auto_create_schema = True
    auto_drop_schema = False  # never silently drop in prod

    def __str__(self) -> str:
        return self.name


class Domain(DomainMixin):
    """Maps a hostname (e.g. acme.localhost) to a Tenant."""

    pass


class TimeStampedModel(models.Model):
    """Abstract base — created_at / updated_at on every record."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class IdempotencyKey(models.Model):
    """Stores idempotency keys for money-creating POST endpoints."""

    key = models.CharField(max_length=128, unique=True, db_index=True)
    user_id = models.BigIntegerField()
    endpoint = models.CharField(max_length=255)
    response_status = models.IntegerField()
    response_body = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["created_at"])]
