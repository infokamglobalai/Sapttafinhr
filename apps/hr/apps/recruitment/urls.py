from django.urls import path

from . import views

app_name = "recruitment"

urlpatterns = [
    path("", views.job_list, name="job_list"),
    path("new/", views.job_create, name="job_create"),
    path("<int:pk>/", views.job_detail, name="job_detail"),
    path("<int:pk>/publish/", views.job_publish, name="job_publish"),
    path("<int:pk>/close/", views.job_close, name="job_close"),
    path("<int:pk>/applicants/new/", views.add_applicant, name="add_applicant"),
    path("applications/<int:pk>/move/", views.move_application, name="move_application"),
]
