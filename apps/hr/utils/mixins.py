"""
View mixins and decorators shared across apps.
"""
from django.db import models
from django.utils import timezone


class TenantModelMixin(models.Model):
    """
    Abstract base for every tenant-scoped model.
    Provides tenant FK and a TenantManager that auto-filters by request.tenant.
    """

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantManager(models.Manager):
    """
    Auto-scopes every queryset to the current request's tenant.
    Uses django-crum to access the current request without passing it explicitly.
    """

    def get_queryset(self):
        from crum import get_current_request
        qs = super().get_queryset()
        request = get_current_request()
        if request and getattr(request, "tenant", None):
            qs = qs.filter(tenant=request.tenant)
        return qs


class AuditableMixin(models.Model):
    """Tracks created_by and updated_by via django-crum."""

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        from crum import get_current_user
        if not self.pk:
            user = get_current_user()
            if user and not user.pk:
                user = None
            self.created_by = user
        super().save(*args, **kwargs)
