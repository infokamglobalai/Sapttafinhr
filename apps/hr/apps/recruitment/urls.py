from django.urls import path
from . import views
from .ai_views import JDGeneratorView, OfferLetterGeneratorView, ResumeParsViewView, ResumeRankView

app_name = "recruitment"

urlpatterns = [
    path("", views.job_list, name="job_list"),
    path("new/", views.job_create, name="job_create"),
    path("<int:pk>/", views.job_detail, name="job_detail"),
    path("<int:pk>/publish/", views.job_publish, name="job_publish"),
    path("<int:pk>/close/", views.job_close, name="job_close"),
    path("<int:pk>/applicants/new/", views.add_applicant, name="add_applicant"),
    path("applications/<int:pk>/move/", views.move_application, name="move_application"),
    # AI tools
    path("ai/generate-jd/", JDGeneratorView.as_view(), name="ai_generate_jd"),
    path("ai/generate-offer/", OfferLetterGeneratorView.as_view(), name="ai_generate_offer"),
    path("ai/parse-resume/", ResumeParsViewView.as_view(), name="ai_parse_resume"),
    path("ai/rank-resumes/", ResumeRankView.as_view(), name="ai_rank_resumes"),
]
