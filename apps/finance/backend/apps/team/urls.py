from django.urls import path
from .views import TeamMembersView, TeamMemberDetailView

urlpatterns = [
    path('members/', TeamMembersView.as_view(), name='team_members'),
    path('members/<int:pk>/', TeamMemberDetailView.as_view(), name='team_member_detail'),
]
