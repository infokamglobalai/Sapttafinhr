import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Custom User Manager
# ---------------------------------------------------------------------------
class UserManager(BaseUserManager):
    def create_user(self, email, tenant, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, tenant=tenant, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Platform-level superuser — no tenant."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        email = self.normalize_email(email)
        user = self.model(email=email, tenant=None, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
    )
    email = models.EmailField(max_length=254)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # Django admin access
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "email"],
                name="unique_user_per_tenant",
                condition=models.Q(tenant__isnull=False),
            )
        ]

    def __str__(self):
        return self.email

    def _employee_profile_or_none(self):
        try:
            return self.employee_profile
        except Exception:
            return None

    @property
    def display_name(self) -> str:
        """Short friendly name for nav, chips, and greetings."""
        profile = self._employee_profile_or_none()
        if profile:
            if profile.first_name:
                return profile.first_name
            if profile.full_name:
                return profile.full_name.split()[0]

        if self.is_superuser:
            return "Super Admin"
        if self.is_hr_admin:
            return "Admin"
        if self.is_manager:
            return "Manager"

        local = (self.email or "").split("@")[0]
        return local.replace(".", " ").replace("_", " ").strip().title() or "User"

    @property
    def role_label(self) -> str:
        """Human-readable primary role for profile menus."""
        if self.is_superuser:
            return "Platform Super Admin"
        if self.is_hr_admin:
            return "HR Administrator"
        if self.is_manager:
            return "Team Lead / Manager"
        profile = self._employee_profile_or_none()
        if profile:
            return "Employee"
        role = self.user_roles.select_related("role").first()
        if role:
            return role.role.name.replace("_", " ").title()
        return "User"

    def get_full_name(self):
        profile = self._employee_profile_or_none()
        if profile and profile.full_name:
            return profile.full_name
        return self.display_name

    @property
    def profile_photo_url(self):
        """Employee profile photo URL when linked, else None."""
        profile = self._employee_profile_or_none()
        if profile and profile.profile_photo:
            return profile.profile_photo.url
        return None

    @property
    def avatar_initials(self) -> str:
        """Up to two letters for avatar fallback."""
        profile = self._employee_profile_or_none()
        if profile and profile.first_name and profile.last_name:
            return f"{profile.first_name[0]}{profile.last_name[0]}".upper()
        parts = self.display_name.split()
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        name = self.display_name or "U"
        return name[:2].upper()

    @property
    def avatar_tone(self) -> str:
        """Stable accent tone for initials avatar (orange, blue, indigo, teal, violet, slate)."""
        tones = ("orange", "blue", "indigo", "teal", "violet", "slate")
        key = (self.email or str(self.pk or "")).encode("utf-8")
        return tones[sum(key) % len(tones)]

    def has_perm_code(self, codename):
        """Check if user has a specific RBAC permission codename."""
        if self.is_superuser:
            return True
        return self.user_roles.filter(
            role__role_permissions__permission__codename=codename
        ).exists()

    def has_role(self, role_name: str) -> bool:
        if self.is_superuser:
            return True
        return self.user_roles.filter(role__name=role_name).exists()

    @property
    def is_company_owner(self) -> bool:
        """Purchaser / workspace owner — billing and company branding."""
        if self.is_superuser:
            return True
        return self.user_roles.filter(role__name="super_admin").exists()

    @property
    def is_hr_admin(self) -> bool:
        """User has full HR admin access — sees all admin pages."""
        if self.is_superuser:
            return True
        return self.user_roles.filter(role__name__in=("super_admin", "hr_admin")).exists()

    @property
    def is_manager(self) -> bool:
        """User can approve their direct reports' leave/attendance."""
        if self.is_hr_admin:
            return True
        return self.user_roles.filter(role__name="manager").exists()


# ---------------------------------------------------------------------------
# RBAC: Roles, Permissions, Assignments
# ---------------------------------------------------------------------------
class Permission(models.Model):
    """Platform-wide permission definitions (seeded via migration)."""
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    module = models.CharField(max_length=50)

    class Meta:
        db_table = "rbac_permissions"
        ordering = ["module", "codename"]

    def __str__(self):
        return f"{self.module}.{self.codename}"


class Role(models.Model):
    SYSTEM_ROLES = ["super_admin", "hr_admin", "manager", "employee"]

    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="roles"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    permissions = models.ManyToManyField(
        Permission, through="RolePermission", related_name="roles", blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rbac_roles"
        unique_together = ("tenant", "name")

    def __str__(self):
        return f"{self.tenant.subdomain} / {self.name}"


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        db_table = "rbac_role_permissions"
        unique_together = ("role", "permission")


class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_roles")
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    granted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="roles_granted"
    )
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rbac_user_roles"
        unique_together = ("user", "role")
