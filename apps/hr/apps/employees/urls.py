from django.urls import path
from . import views

app_name = "employees"

urlpatterns = [
    path("", views.employee_list, name="list"),
    path("create/", views.employee_create, name="create"),
    path("bulk-import/", views.bulk_import, name="bulk_import"),
    path("bulk-provision-logins/", views.bulk_provision_logins, name="bulk_provision"),
    path("bulk-credentials/", views.bulk_credentials, name="bulk_credentials"),
    path("<int:pk>/", views.employee_detail, name="detail"),
    path("<int:pk>/edit/", views.employee_edit, name="edit"),
    path("<int:pk>/create-login/", views.employee_create_login, name="create_login"),
    path("<int:pk>/id-card/", views.id_card_pdf, name="id_card"),
    path("<int:employee_pk>/documents/upload/", views.document_upload, name="document_upload"),
    # Org structure
    path("departments/", views.department_list, name="departments"),
    path("departments/create/", views.department_create, name="department_create"),
    path("designations/", views.designation_list, name="designations"),
    path("designations/create/", views.designation_create, name="designation_create"),
    path("locations/", views.location_list, name="locations"),
    path("locations/create/", views.location_create, name="location_create"),
    # AI / analytics
    path("attrition/", views.attrition_dashboard, name="attrition"),
    path("attrition/recompute/", views.attrition_recompute, name="attrition_recompute"),
]
