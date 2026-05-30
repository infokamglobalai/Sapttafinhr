from django.urls import path
from . import views

app_name = "performance"

urlpatterns = [
    # Manager
    path("team/", views.team_reviews, name="team_reviews"),
    path("write/<int:employee_pk>/<int:cycle_pk>/", views.review_create_or_edit, name="review_write"),
    # Employee
    path("my/", views.my_reviews, name="my_reviews"),
    path("<int:pk>/", views.review_detail, name="review_detail"),
    path("<int:pk>/acknowledge/", views.acknowledge_review, name="acknowledge"),
    # HR admin
    path("cycles/", views.cycle_list, name="cycles"),
    path("cycles/new/", views.cycle_create_or_edit, name="cycle_create"),
    path("cycles/<int:pk>/edit/", views.cycle_create_or_edit, name="cycle_edit"),
    path("cycles/<int:pk>/", views.cycle_detail, name="cycle_detail"),
    # AI assistant
    path("ai/draft-review/<int:employee_pk>/<int:cycle_pk>/", views.ai_draft_review, name="ai_draft_review"),
]
