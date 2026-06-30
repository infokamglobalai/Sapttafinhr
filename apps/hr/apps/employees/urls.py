from django.urls import path
from . import views
from . import ess_views

app_name = "employees"

urlpatterns = [
    path("my-work/", ess_views.my_work, name="my_work"),
    path("my-team/", ess_views.my_team, name="my_team"),
    path("directory/", views.company_directory, name="directory"),
    path("org-chart/", views.org_chart, name="org_chart"),
    path("org-chart/reassign/<int:pk>/", views.org_chart_reassign, name="org_chart_reassign"),
    path("colleague/<int:pk>/", views.colleague_profile, name="colleague"),
    path("", views.employee_list, name="list"),
    path("export/", views.employee_export, name="export"),
    path("create/", views.employee_create, name="create"),
    path("bulk-import/", views.bulk_import, name="bulk_import"),
    path("bulk-provision-logins/", views.bulk_provision_logins, name="bulk_provision"),
    path("bulk-credentials/", views.bulk_credentials, name="bulk_credentials"),
    path("team-access/", views.team_access, name="team_access"),
    path("team-access/<int:pk>/", views.team_access_update, name="team_access_update"),
    path("<int:pk>/", views.employee_detail, name="detail"),
    path("<int:pk>/edit/", views.employee_edit, name="edit"),
    path("<int:pk>/create-login/", views.employee_create_login, name="create_login"),
    path("<int:pk>/credentials/", views.employee_credentials, name="credentials"),
    path("<int:pk>/revoke-access/", views.employee_revoke_access, name="revoke_access"),
    path("<int:pk>/restore-access/", views.employee_restore_access, name="restore_access"),
    path("<int:pk>/id-card/", views.id_card_pdf, name="id_card"),
    path("<int:employee_pk>/documents/upload/", views.document_upload, name="document_upload"),
    # Org structure
    path("departments/", views.department_list, name="departments"),
    path("departments/create/", views.department_create, name="department_create"),
    path("departments/<int:pk>/deactivate/", views.department_deactivate, name="department_deactivate"),
    path("departments/<int:pk>/restore/", views.department_restore, name="department_restore"),
    path("designations/", views.designation_list, name="designations"),
    path("designations/create/", views.designation_create, name="designation_create"),
    path("designations/<int:pk>/deactivate/", views.designation_deactivate, name="designation_deactivate"),
    path("designations/<int:pk>/restore/", views.designation_restore, name="designation_restore"),
    path("locations/", views.location_list, name="locations"),
    path("locations/create/", views.location_create, name="location_create"),
    path("locations/<int:pk>/deactivate/", views.location_deactivate, name="location_deactivate"),
    path("locations/<int:pk>/restore/", views.location_restore, name="location_restore"),
    # AI / analytics
    path("attrition/", views.attrition_dashboard, name="attrition"),
    path("attrition/recompute/", views.attrition_recompute, name="attrition_recompute"),
]
