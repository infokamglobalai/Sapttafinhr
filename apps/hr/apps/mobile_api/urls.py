from django.urls import path

from . import views

app_name = "mobile_api"

urlpatterns = [
    path("v1/me/", views.me_view, name="me"),
    path("v1/attendance/today/", views.attendance_today, name="attendance_today"),
    path("v1/attendance/punch/", views.attendance_punch, name="attendance_punch"),
    path("v1/attendance/history/", views.attendance_history, name="attendance_history"),
    path("v1/leaves/balances/", views.leave_balances, name="leave_balances"),
    path("v1/leaves/requests/", views.leave_requests_list, name="leave_requests"),
    path("v1/leaves/requests/create/", views.leave_requests_create, name="leave_requests_create"),
    path("v1/payslips/", views.payslips_list, name="payslips"),
    path("v1/payslips/<int:pk>/pdf/", views.payslip_pdf, name="payslip_pdf"),
    path("v1/notifications/", views.notifications_list, name="notifications"),
    path("v1/notifications/<int:pk>/read/", views.notification_mark_read, name="notification_read"),
    path("v1/approvals/leaves/", views.approvals_leaves_list, name="approvals_leaves"),
    path("v1/approvals/leaves/<int:pk>/", views.approvals_leaves_action, name="approvals_leaves_action"),
]
