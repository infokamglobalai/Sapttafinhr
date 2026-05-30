from django.urls import path
from . import views

app_name = "leaves"

urlpatterns = [
    path("apply/", views.apply_leave_view, name="apply"),
    path("my/", views.my_leaves, name="my_leaves"),
    path("my/<int:pk>/cancel/", views.cancel_leave_view, name="cancel"),
    path("pending/", views.pending_leaves, name="pending"),
    path("<int:pk>/action/", views.leave_action, name="action"),
    path("types/", views.leave_type_list, name="leave_types"),
    path("types/new/", views.leave_type_create_or_edit, name="leave_type_create"),
    path("types/<int:pk>/edit/", views.leave_type_create_or_edit, name="leave_type_edit"),
    path("holidays/", views.holiday_calendar, name="holidays"),
    path("holidays/create/", views.holiday_create, name="holiday_create"),
    path("balances/", views.leave_balance_admin, name="balances"),
]
