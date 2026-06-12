from django.urls import path
from .views import (
    TeamMembersView, TeamMemberDetailView,
    TeamPermissionsView, TeamRolesView, TeamRoleDetailView
)

urlpatterns = [
    path('members/', TeamMembersView.as_view(), name='team_members'),
    path('members/<int:pk>/', TeamMemberDetailView.as_view(), name='team_member_detail'),
    path('permissions/', TeamPermissionsView.as_view(), name='team_permissions'),
    path('roles/', TeamRolesView.as_view(), name='team_roles'),
    path('roles/<int:pk>/', TeamRoleDetailView.as_view(), name='team_role_detail'),
]
