from django.urls import path
from . import views

app_name = "reports"

urlpatterns = [
    path("", views.report_hub, name="index"),
    path("leave/", views.leave_report, name="leave"),
    path("leave/export/", views.leave_report_export, name="leave_export"),
    path("attendance/", views.attendance_report, name="attendance"),
    path("attendance/export/", views.attendance_report_export, name="attendance_export"),
    path("headcount/", views.headcount_report, name="headcount"),
    path("headcount/export/", views.headcount_report_export, name="headcount_export"),
    path("manpower/", views.manpower_report, name="manpower"),
    path("manpower/export/", views.manpower_report_export, name="manpower_export"),
    path("payroll/", views.payroll_summary_report, name="payroll"),
    path("payroll/export/", views.payroll_summary_export, name="payroll_export"),
    path("monthly-pack/", views.monthly_report_pack_download, name="monthly_pack"),
]
