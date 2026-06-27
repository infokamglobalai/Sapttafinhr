from django.urls import path
from . import views
from .ai_views import JDGeneratorView, OfferLetterGeneratorView, ResumeParsViewView, ResumeRankView

app_name = "recruitment"

urlpatterns = [
    path("", views.job_list, name="job_list"),
    path("new/", views.job_create, name="job_create"),
    path("jd-templates/<int:pk>/load/", views.jd_template_load, name="jd_template_load"),
    path("<int:pk>/", views.job_detail, name="job_detail"),
    path("<int:pk>/publish/", views.job_publish, name="job_publish"),
    path("<int:pk>/close/", views.job_close, name="job_close"),
    path("<int:pk>/scoring-weights/", views.edit_scoring_weights, name="edit_scoring_weights"),
    path("<int:pk>/applicants/new/", views.add_applicant, name="add_applicant"),
    path("<int:pk>/applicants/bulk/", views.bulk_upload, name="bulk_upload"),
    path("applications/<int:pk>/convert/", views.convert_to_employee, name="convert_to_employee"),
    path("applications/<int:pk>/offer-draft/", views.create_offer_hr_draft, name="create_offer_hr_draft"),
    path("applications/<int:pk>/move/", views.move_application, name="move_application"),
    path("applications/<int:pk>/move-api/", views.move_application_api, name="move_application_api"),
    # Async pool ranking (Phase 4)
    path("<int:pk>/rank-pool/", views.start_pool_ranking, name="start_pool_ranking"),
    path("<int:pk>/rank-pool/<int:job_id>/progress/", views.ranking_progress, name="ranking_progress"),
    # Comparison dashboard & insights (Phase 5)
    path("<int:pk>/dashboard/", views.dashboard, name="dashboard"),
    path("<int:pk>/compare/", views.compare, name="compare"),
    path("<int:pk>/shortlist/", views.shortlist_top, name="shortlist_top"),
    path("applications/<int:pk>/tag/", views.add_tag, name="add_tag"),
    # Talent intelligence (Phase 6)
    path("analytics/", views.recruitment_analytics, name="analytics"),
    path("pools/", views.talent_pools, name="talent_pools"),
    path("pools/<int:pk>/", views.talent_pool_detail, name="talent_pool_detail"),
    path("pools/<int:pk>/add/", views.pool_add_candidate, name="pool_add_candidate"),
    path("pools/<int:pk>/match/", views.pool_match, name="pool_match"),
    path("candidates/<int:pk>/similar/", views.similar_candidates, name="similar_candidates"),
    path("<int:pk>/internal-matches/", views.internal_matches, name="internal_matches"),
    # Workflow & integrations (Phase 7)
    path("<int:pk>/interviews/", views.interviews, name="interviews"),
    path("<int:pk>/interviews/schedule/", views.schedule_interview, name="schedule_interview"),
    path("interviews/<int:pk>/status/", views.set_interview_status, name="set_interview_status"),
    path("<int:pk>/recommend/", views.recommend_candidates, name="recommend_candidates"),
    path("<int:pk>/push-ats/", views.push_ats, name="push_ats"),
    # AI tools
    path("ai/generate-jd/", JDGeneratorView.as_view(), name="ai_generate_jd"),
    path("ai/generate-offer/", OfferLetterGeneratorView.as_view(), name="ai_generate_offer"),
    path("ai/parse-resume/", ResumeParsViewView.as_view(), name="ai_parse_resume"),
    path("ai/rank-resumes/", ResumeRankView.as_view(), name="ai_rank_resumes"),
]
