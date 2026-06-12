from django.conf import settings
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

        email = email.strip().lower()
        tenant = getattr(request, "tenant", None)
        user = self._get_user_for_auth(email, tenant, request)

        if user is None:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def _get_user_for_auth(self, email, tenant, request):
        try:
            return User.objects.get(email__iexact=email, tenant=tenant)
        except User.DoesNotExist:
            pass

        # Dev: login on http://localhost:8001 without subdomain when tenant is unresolved
        if tenant is None and settings.DEBUG:
            host = request.get_host().split(":")[0].lower() if request else ""
            if host in ("localhost", "127.0.0.1"):
                qs = User.objects.filter(
                    email__iexact=email, is_active=True, tenant__isnull=False
                )
                if qs.count() == 1:
                    return qs.first()
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
