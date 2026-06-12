"""Tenant, Domain, and shared base models."""
from django.db import models
from django_tenants.models import DomainMixin, TenantMixin


class Tenant(TenantMixin):
    """A customer organization. Each gets its own Postgres schema."""

    name = models.CharField(max_length=200)
    created_on = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    # Where dunning / lifecycle email goes (set to the owner's email at signup).
    billing_email = models.EmailField(blank=True)

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


class AuditLog(models.Model):
    """Append-only record of operator/admin actions on the platform.

    Lives in the public schema (operator actions are cross-tenant). Written by
    admin actions and sensitive control-plane operations (suspend/reactivate a
    workspace, etc.) so there's an accountable trail of who did what.
    """

    actor_email = models.CharField(max_length=254, blank=True)
    action = models.CharField(max_length=80, db_index=True)
    target = models.CharField(max_length=255, blank=True, help_text="e.g. tenant schema / object")
    detail = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["action", "created_at"])]

    def __str__(self) -> str:
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.actor_email} {self.action} {self.target}"

    @classmethod
    def record(cls, *, actor_email: str = "", action: str, target: str = "", **detail) -> "AuditLog":
        return cls.objects.create(
            actor_email=actor_email or "", action=action, target=target or "", detail=detail or {}
        )
