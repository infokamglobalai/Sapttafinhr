from django.urls import path

from . import public_views

app_name = "careers"

urlpatterns = [
    path("<slug:slug>/", public_views.careers_index, name="index"),
    path("<slug:slug>/feed.json", public_views.careers_feed, name="feed"),
    path("<slug:slug>/<int:job_id>/", public_views.careers_job, name="job"),
]
