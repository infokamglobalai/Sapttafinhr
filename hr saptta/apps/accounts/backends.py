from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class TenantAuthBackend(ModelBackend):
    """
    Authenticates users scoped to the current tenant.
    Prevents users from one tenant logging into another tenant's subdomain.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        email = username or kwargs.get("email")
        if not email:
            return None

        tenant = getattr(request, "tenant", None)

        try:
            user = User.objects.get(email=email, tenant=tenant)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
