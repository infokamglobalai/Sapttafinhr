from rest_framework import serializers

from apps.team.membership import resolve_tenant_role

from .models import User


class UserSerializer(serializers.ModelSerializer):
    fin_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "is_staff", "is_verified", "fin_role", "platform_role")
        read_only_fields = ("id", "is_staff", "is_verified", "fin_role")

    def get_fin_role(self, obj):
        return resolve_tenant_role(obj)
