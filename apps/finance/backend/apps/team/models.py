from django.db import models
from apps.core.models import TimeStampedModel


class Permission(models.Model):
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    module = models.CharField(max_length=50)  # "HRM" or "Accounting"

    class Meta:
        ordering = ["module", "codename"]

    def __str__(self):
        return f"{self.module}.{self.codename}"


class Role(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.CharField(max_length=255, blank=True)
    is_system = models.BooleanField(default=False)
    permissions = models.ManyToManyField(Permission, through="RolePermission", related_name="roles", blank=True)

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("role", "permission")


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
    custom_role     = models.ForeignKey('Role', on_delete=models.SET_NULL, null=True, blank=True, related_name="members")
    is_active       = models.BooleanField(default=True)
    invited_by_email = models.EmailField(blank=True)

    class Meta:
        ordering = ['email']

    def __str__(self):
        return f'{self.email} ({self.role})'
