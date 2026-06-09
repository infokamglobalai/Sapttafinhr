from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountSuggestView,
    AnomalyScanView,
    JournalEntryViewSet,
    ManualJournalEntryCreateView,
    TrialBalanceView,
)

router = DefaultRouter()
router.register("entries", JournalEntryViewSet)

urlpatterns = router.urls + [
    path("manual/", ManualJournalEntryCreateView.as_view(), name="ledger-manual"),
    path("trial-balance/", TrialBalanceView.as_view(), name="trial-balance"),
    path("anomalies/", AnomalyScanView.as_view(), name="ledger-anomalies"),
    path("suggest-account/", AccountSuggestView.as_view(), name="ledger-suggest-account"),
]
