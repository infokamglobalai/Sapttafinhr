from django.urls import path
from . import views
from . import policy_views
from . import letter_views
from . import request_views
from . import ess_views
from . import calendar_views
from . import celebration_views
from . import company_vault_views
from .ai_views import AIChatView

app_name = "hr_ops"

urlpatterns = [
    path("letters/", views.letter_template_list, name="letter_templates"),
    path("letters/history/", letter_views.letter_history, name="letter_history"),
    path("letters/settings/", letter_views.letter_company_settings, name="letter_company_settings"),
    path("letters/signatories/", letter_views.letter_signatories, name="letter_signatories"),
    path("letters/signatories/new/", letter_views.letter_signatory_edit, name="letter_signatory_create"),
    path("letters/signatories/import-legacy/", letter_views.letter_signatory_import_legacy, name="letter_signatory_import_legacy"),
    path("letters/signatories/<int:pk>/edit/", letter_views.letter_signatory_edit, name="letter_signatory_edit"),
    path("letters/signatories/<int:pk>/delete/", letter_views.letter_signatory_delete, name="letter_signatory_delete"),
    path("letters/seed-defaults/", letter_views.letter_seed_defaults, name="letter_seed_defaults"),
    path("letters/<int:pk>/", letter_views.letter_detail, name="letter_detail"),
    path("letters/<int:pk>/edit/", letter_views.letter_edit_draft, name="letter_edit_draft"),
    path("letters/<int:pk>/submit/", letter_views.letter_submit, name="letter_submit"),
    path("letters/<int:pk>/approve/", letter_views.letter_approve, name="letter_approve"),
    path("letters/<int:pk>/reject/", letter_views.letter_reject, name="letter_reject"),
    path("letters/<int:pk>/issue/", letter_views.letter_issue, name="letter_issue"),
    path("letters/<int:pk>/email/", letter_views.letter_email, name="letter_email"),
    path("letters/<int:pk>/duplicate/", letter_views.letter_duplicate, name="letter_duplicate"),
    path("letters/<int:pk>/revision/", letter_views.letter_revision, name="letter_revision"),
    path("letters/<int:pk>/delete/", letter_views.letter_delete, name="letter_delete"),
    path("letters/<int:pk>/download/", views.letter_download, name="letter_download"),
    path("letters/<int:pk>/share/", views.share_letter, name="share_letter"),
    path("letters/generate/<int:employee_pk>/", letter_views.employee_letter_picker, name="employee_letter_picker"),
    path("letters/generate/<int:employee_pk>/<int:template_pk>/", letter_views.generate_letter_view, name="generate_letter"),
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
    path("exits/<int:pk>/update/", views.exit_update, name="exit_update"),
    path("exits/<int:pk>/finalize/", views.exit_finalize, name="exit_finalize"),
    path("exits/<int:pk>/settlement-pdf/", views.exit_settlement_pdf, name="exit_settlement_pdf"),
    path("exits/<int:pk>/revoke-login/", views.exit_revoke_login, name="exit_revoke_login"),
    path("announcements/", views.announcement_list, name="announcements"),
    path("letters/new/", views.letter_template_create_or_edit, name="letter_template_create"),
    path("letters/templates/<int:pk>/edit/", views.letter_template_create_or_edit, name="letter_template_edit"),
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
    # Celebrations & wishes
    path("celebrations/", celebration_views.celebration_feed, name="celebrations"),
    path("celebrations/new/", celebration_views.celebration_create_or_edit, name="celebration_create"),
    path("celebrations/<int:pk>/", celebration_views.celebration_detail, name="celebration_detail"),
    path("celebrations/<int:pk>/edit/", celebration_views.celebration_create_or_edit, name="celebration_edit"),
    path("celebrations/<int:pk>/wish/", celebration_views.celebration_wish, name="celebration_wish"),
    # AI Chat
    path("ai/chat/", AIChatView.as_view(), name="ai_chat"),
    # HR policies (powers policy bot)
    path("policies/", policy_views.policy_list, name="policy_list"),
    path("policies/new/", policy_views.policy_create_or_edit, name="policy_create"),
    path("policies/<int:pk>/edit/", policy_views.policy_create_or_edit, name="policy_edit"),
    path("policies/<int:pk>/distribute/", policy_views.policy_distribute, name="policy_distribute"),
    path("policies/<int:pk>/compliance/", policy_views.policy_compliance, name="policy_compliance"),
    path("policies/<int:pk>/remind/", policy_views.policy_remind, name="policy_remind"),
    path("policies/<int:pk>/download/", policy_views.policy_download, name="policy_download"),
    path("policies/view/", policy_views.employee_policy_list, name="employee_policies"),
    path("policies/view/<int:pk>/", policy_views.employee_policy_view, name="employee_policy_view"),
    path("policies/<int:pk>/delete/", policy_views.policy_delete, name="policy_delete"),
    # Company legal document vault
    path("vault/", company_vault_views.vault_list, name="company_vault_list"),
    path("vault/upload/", company_vault_views.vault_upload, name="company_vault_upload"),
    path("vault/upload/<int:pk>/", company_vault_views.vault_upload, name="company_vault_edit"),
    path("vault/documents/<int:pk>/download/", company_vault_views.vault_download, name="company_vault_download"),
    path("vault/documents/<int:pk>/archive/", company_vault_views.vault_deactivate, name="company_vault_archive"),
    path("vault/requests/", company_vault_views.access_request_queue, name="company_vault_requests"),
    path("vault/requests/<int:pk>/", company_vault_views.access_request_review, name="company_vault_request_review"),
    path("vault/my-requests/", company_vault_views.my_doc_requests, name="my_company_doc_requests"),
    path("vault/my-requests/new/", company_vault_views.doc_request_create, name="company_doc_request_create"),
    path("vault/my-requests/<int:pk>/", company_vault_views.my_doc_request_detail, name="my_company_doc_request_detail"),
    # Service requests (helpdesk)
    path("requests/my/", request_views.my_requests, name="my_service_requests"),
    path("requests/new/", request_views.request_create, name="request_create"),
    path("requests/my/<int:pk>/", request_views.my_request_detail, name="my_service_request_detail"),
    path("requests/team/", request_views.team_requests, name="team_service_requests"),
    path("requests/team/<int:pk>/", request_views.team_request_detail, name="team_service_request_detail"),
    path("requests/queue/", request_views.admin_queue, name="service_request_queue"),
    path("requests/queue/<int:pk>/", request_views.admin_request_detail, name="service_request_admin_detail"),
    # Employee self-service
    path("my/assets/", ess_views.my_assets, name="my_assets"),
    path("my/onboarding/", ess_views.my_onboarding, name="my_onboarding"),
    path("my/onboarding/item/<int:item_pk>/complete/", ess_views.my_onboarding_item_complete, name="my_onboarding_item_complete"),
    # Company calendar (dashboard widget)
    path("calendar/events/", calendar_views.calendar_event_create, name="calendar_event_create"),
    path("calendar/events/<int:pk>/delete/", calendar_views.calendar_event_delete, name="calendar_event_delete"),
]
