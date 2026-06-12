"""API-key authentication for the public REST API."""
from django.utils import timezone
from rest_framework import authentication, exceptions

from .models import APIKey


class APIKeyAuthentication(authentication.BaseAuthentication):
    keyword = "ApiKey"

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith(self.keyword + " "):
            return None
        key = auth_header[len(self.keyword) + 1:].strip()
        try:
            api_key = APIKey.objects.select_related("company").get(key=key, is_active=True)
        except APIKey.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid API key")
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=["last_used_at"])
        # Attach to request for view introspection
        request.api_key = api_key
        # We don't have a user to return, so synthesize an anonymous-but-auth flag
        from apps.identity.models import User
        u = User.objects.filter(is_superuser=True).first()
        return (u, api_key) if u else (None, api_key)
