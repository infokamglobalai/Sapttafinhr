from django.urls import path

from . import views

app_name = "projects"

urlpatterns = [
    path("my/", views.my_projects, name="my_projects"),
    path("my/timesheet/", views.my_timesheet, name="my_timesheet"),
    path("", views.project_list, name="list"),
    path("new/", views.project_create_or_edit, name="create"),
    path("<int:pk>/edit/", views.project_create_or_edit, name="edit"),
    path("<int:pk>/", views.project_detail, name="detail"),
    path("<int:pk>/members/add/", views.project_add_member, name="add_member"),
    path("<int:pk>/documents/upload/", views.project_upload_document, name="upload_document"),
    path("<int:pk>/updates/add/", views.project_add_update, name="add_update"),
]
