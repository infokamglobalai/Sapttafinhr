from django.db import models
from apps.core.models import TimeStampedModel


class TenantMember(TimeStampedModel):
    """A user's membership in this tenant workspace, with a role."""

    class Role(models.TextChoices):
        OWNER       = 'OWNER',       'Owner'
        ADMIN       = 'ADMIN',       'Admin'
        MANAGER     = 'MANAGER',     'Manager'
        ACCOUNTANT  = 'ACCOUNTANT',  'Accountant'
        EMPLOYEE    = 'EMPLOYEE',    'Employee'
        VIEWER      = 'VIEWER',      'Viewer'

    # References identity.User.id in the public schema (no FK — cross-schema).
    user_id         = models.IntegerField(db_index=True, unique=True)
    email           = models.EmailField(unique=True, db_index=True)
    full_name       = models.CharField(max_length=200, blank=True)
    role            = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    is_active       = models.BooleanField(default=True)
    invited_by_email = models.EmailField(blank=True)

    class Meta:
        ordering = ['email']

    def __str__(self):
        return f'{self.email} ({self.role})'
