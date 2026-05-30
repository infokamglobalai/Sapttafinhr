from django.urls import path
from . import views

app_name = "hr_ops"

urlpatterns = [
    path("letters/", views.letter_template_list, name="letter_templates"),
    path("letters/<int:pk>/download/", views.letter_download, name="letter_download"),
    path("letters/<int:pk>/share/", views.share_letter, name="share_letter"),
    path("letters/generate/<int:employee_pk>/<int:template_pk>/", views.generate_letter_view, name="generate_letter"),
    path("assets/", views.asset_list, name="assets"),
    path("assets/<int:asset_pk>/assign/", views.asset_assign, name="asset_assign"),
    path("assets/return/<int:assignment_pk>/", views.asset_return, name="asset_return"),
    path("onboarding/", views.onboarding_list, name="onboarding"),
    path("onboarding/<int:pk>/", views.onboarding_detail, name="onboarding_detail"),
    path("onboarding/<int:pk>/complete/", views.onboarding_complete_view, name="onboarding_complete"),
    path("onboarding/start/<int:employee_pk>/", views.onboarding_start, name="onboarding_start"),
    path("onboarding/item/<int:item_pk>/complete/", views.onboarding_item_complete, name="onboarding_item_complete"),
    path("onboarding/item/<int:item_pk>/skip/", views.onboarding_item_skip, name="onboarding_item_skip"),
    path("onboarding/templates/", views.onboarding_template_list, name="onboarding_templates"),
    path("onboarding/templates/new/", views.onboarding_template_create_or_edit, name="onboarding_template_create"),
    path("onboarding/templates/<int:pk>/edit/", views.onboarding_template_create_or_edit, name="onboarding_template_edit"),
    path("exits/", views.exit_list, name="exit_list"),
    path("exits/create/<int:employee_pk>/", views.exit_request_create, name="exit_create"),
    path("announcements/", views.announcement_list, name="announcements"),
    path("letters/new/", views.letter_template_create_or_edit, name="letter_template_create"),
    path("letters/<int:pk>/edit/", views.letter_template_create_or_edit, name="letter_template_edit"),
    path("assets/new/", views.asset_create_or_edit, name="asset_create"),
    path("assets/<int:pk>/edit/", views.asset_create_or_edit, name="asset_edit"),
    path("announcements/new/", views.announcement_create_or_edit, name="announcement_create"),
    path("announcements/<int:pk>/edit/", views.announcement_create_or_edit, name="announcement_edit"),
    # Notifications
    path("notifications/", views.notification_list, name="notifications"),
    path("notifications/<int:pk>/open/", views.notification_open, name="notification_open"),
    path("notifications/dropdown/", views.notification_dropdown, name="notification_dropdown"),
    # Audit log + alerts
    path("audit/", views.audit_log_list, name="audit_log"),
    path("documents/expiring/", views.document_expiry, name="document_expiry"),
    path("pulse/", views.people_pulse, name="people_pulse"),
]
