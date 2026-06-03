from django.db import IntegrityError
from django_tenants.utils import schema_context
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TenantMember


class TenantMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantMember
        fields = ['id', 'user_id', 'email', 'full_name', 'role', 'is_active',
                  'invited_by_email', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user_id', 'invited_by_email', 'created_at', 'updated_at']


class InviteMemberSerializer(serializers.Serializer):
    email     = serializers.EmailField()
    full_name = serializers.CharField(max_length=200)
    role      = serializers.ChoiceField(choices=TenantMember.Role.choices)
    password  = serializers.CharField(min_length=8, write_only=True)


class TeamMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        members = TenantMember.objects.all()
        return Response(TenantMemberSerializer(members, many=True).data)

    def post(self, request):
        ser = InviteMemberSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        if TenantMember.objects.filter(email__iexact=d['email']).exists():
            return Response(
                {'detail': 'This person is already a member of your workspace.'},
                status=status.HTTP_409_CONFLICT,
            )

        # Create or retrieve the platform User in the public schema.
        with schema_context('public'):
            from apps.identity.models import User
            user = User.objects.filter(email__iexact=d['email']).first()
            if not user:
                try:
                    user = User.objects.create_user(
                        email=d['email'],
                        password=d['password'],
                        full_name=d['full_name'],
                    )
                except IntegrityError:
                    return Response(
                        {'detail': 'Could not create user account.'},
                        status=status.HTTP_409_CONFLICT,
                    )

        member = TenantMember.objects.create(
            user_id=user.id,
            email=user.email,
            full_name=d['full_name'],
            role=d['role'],
            invited_by_email=request.user.email,
        )
        return Response(TenantMemberSerializer(member).data, status=status.HTTP_201_CREATED)


class TeamMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return TenantMember.objects.get(pk=pk)
        except TenantMember.DoesNotExist:
            return None

    def patch(self, request, pk):
        member = self._get(pk)
        if not member:
            return Response(status=status.HTTP_404_NOT_FOUND)
        role      = request.data.get('role')
        is_active = request.data.get('is_active')
        if role is not None:
            member.role = role
        if is_active is not None:
            member.is_active = is_active
        member.save(update_fields=[f for f in ['role', 'is_active', 'updated_at'] if True])
        return Response(TenantMemberSerializer(member).data)

    def delete(self, request, pk):
        member = self._get(pk)
        if not member:
            return Response(status=status.HTTP_404_NOT_FOUND)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
