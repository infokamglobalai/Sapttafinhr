from django.urls import path
from . import views

app_name = "attendance"

urlpatterns = [
    path("", views.attendance_register, name="register"),
    path("punch/", views.punch, name="punch"),
    path("punch/status/", views.punch_status, name="punch_status"),
    path("my/", views.my_attendance, name="my_attendance"),
    path("regularize/", views.regularization_request, name="regularization"),
    path("regularizations/", views.regularization_list, name="regularizations"),
    path("regularizations/<int:pk>/action/", views.regularization_action, name="regularization_action"),
    path("shifts/", views.shift_list, name="shifts"),
    path("shifts/new/", views.shift_create_or_edit, name="shift_create"),
    path("shifts/<int:pk>/edit/", views.shift_create_or_edit, name="shift_edit"),
    path("anomaly-scan/", views.anomaly_scan, name="anomaly_scan"),
    path("anomaly/", views.anomaly_scan_page, name="anomaly"),
    path("team/", views.team_attendance, name="team_attendance"),
]
