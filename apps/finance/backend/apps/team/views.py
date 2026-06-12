from django.db import IntegrityError
from django_tenants.utils import schema_context
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TenantMember, Role, Permission, RolePermission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'codename', 'name', 'module']


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SlugRelatedField(
        many=True,
        slug_field='codename',
        queryset=Permission.objects.all()
    )

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_system', 'permissions']
        read_only_fields = ['id', 'is_system']

    def validate_permissions(self, value):
        request = self.context.get("request")
        tenant = getattr(request, "tenant", None)
        if tenant:
            from apps.saas.models import CompanyModule
            active_modules = list(CompanyModule.objects.filter(company=tenant, is_active=True).values_list("module__code", flat=True))
            allowed_modules = []
            if "FIN" in active_modules:
                allowed_modules.append("Accounting")
            if "HR" in active_modules:
                allowed_modules.append("HRM")
            
            for perm in value:
                if perm.module not in allowed_modules:
                    raise serializers.ValidationError(
                        f"You cannot assign permission '{perm.codename}' from module '{perm.module}' because it is not purchased."
                    )
        return value


class TenantMemberSerializer(serializers.ModelSerializer):
    custom_role_name = serializers.CharField(source="custom_role.name", read_only=True)

    class Meta:
        model = TenantMember
        fields = ['id', 'user_id', 'email', 'full_name', 'role', 'custom_role', 'custom_role_name', 'is_active',
                  'invited_by_email', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user_id', 'invited_by_email', 'created_at', 'updated_at']


class InviteMemberSerializer(serializers.Serializer):
    email     = serializers.EmailField()
    full_name = serializers.CharField(max_length=200)
    role      = serializers.ChoiceField(choices=TenantMember.Role.choices, required=False, default=TenantMember.Role.EMPLOYEE)
    custom_role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), required=False, allow_null=True)
    password  = serializers.CharField(min_length=8, write_only=True)


class TeamMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        members = TenantMember.objects.select_related('custom_role').all()
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
            role=d.get('role', TenantMember.Role.EMPLOYEE),
            custom_role=d.get('custom_role'),
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
        custom_role_id = request.data.get('custom_role')
        is_active = request.data.get('is_active')
        
        if role is not None:
            member.role = role
        if custom_role_id is not None:
            if custom_role_id == "":
                member.custom_role = None
            else:
                try:
                    member.custom_role = Role.objects.get(pk=custom_role_id)
                except Role.DoesNotExist:
                    return Response({"detail": "Role not found."}, status=status.HTTP_404_NOT_FOUND)
        if is_active is not None:
            member.is_active = is_active
            
        member.save()
        return Response(TenantMemberSerializer(member).data)

    def delete(self, request, pk):
        member = self._get(pk)
        if not member:
            return Response(status=status.HTTP_404_NOT_FOUND)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeamPermissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return Response([])
        from apps.saas.models import CompanyModule
        active_modules = list(CompanyModule.objects.filter(company=tenant, is_active=True).values_list("module__code", flat=True))
        
        allowed_modules = []
        if "FIN" in active_modules:
            allowed_modules.append("Accounting")
        if "HR" in active_modules:
            allowed_modules.append("HRM")

        perms = Permission.objects.filter(module__in=allowed_modules)
        return Response(PermissionSerializer(perms, many=True).data)


class TeamRolesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = Role.objects.prefetch_related('permissions').all()
        return Response(RoleSerializer(roles, many=True).data)

    def post(self, request):
        ser = RoleSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class TeamRoleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Role.objects.get(pk=pk)
        except Role.DoesNotExist:
            return None

    def get(self, request, pk):
        role = self._get(pk)
        if not role:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(RoleSerializer(role).data)

    def patch(self, request, pk):
        role = self._get(pk)
        if not role:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if role.is_system:
            return Response({"detail": "System roles cannot be modified."}, status=status.HTTP_400_BAD_REQUEST)
        ser = RoleSerializer(role, data=request.data, partial=True, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        role = self._get(pk)
        if not role:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if role.is_system:
            return Response({"detail": "System roles cannot be deleted."}, status=status.HTTP_400_BAD_REQUEST)
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
