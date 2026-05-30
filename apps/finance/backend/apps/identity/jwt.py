"""Custom JWT token serializer — embeds identity claims in the access token.

Adds `email` and `full_name` so the SPA can render the signed-in user without a
separate /auth/me/ round-trip.

NOTE: a tenant/workspace claim is intentionally NOT added here. FIN users live
in the public schema and have no membership link to a tenant (tenancy is by
subdomain), so there is no reliable per-user workspace to embed yet. Adding that
requires a user↔tenant membership model + migration — see README "backend gaps".
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class SapttaTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = getattr(user, "full_name", "")
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": self.user.id,
            "email": self.user.email,
            "full_name": getattr(self.user, "full_name", ""),
            "is_staff": self.user.is_staff,
        }
        return data


class SapttaTokenObtainPairView(TokenObtainPairView):
    serializer_class = SapttaTokenObtainPairSerializer
