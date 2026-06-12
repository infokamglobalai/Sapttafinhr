from django.urls import path
from rest_framework.routers import DefaultRouter

from .closing_views import BooksClosingView, CompanyExportView
from .setup_views import SetupCompleteView, SetupStatusView
from .views import (
    AccountViewSet, BranchViewSet, CompanyViewSet, CostCenterViewSet,
    ExchangeRateView, FiscalYearViewSet, HSNCodeViewSet, ItemViewSet,
    NumberSeriesViewSet, PartyViewSet, ProjectViewSet,
)

router = DefaultRouter()
router.register("companies", CompanyViewSet)
router.register("branches", BranchViewSet)
router.register("fiscal-years", FiscalYearViewSet)
router.register("accounts", AccountViewSet)
router.register("parties", PartyViewSet)
router.register("hsn-codes", HSNCodeViewSet)
router.register("items", ItemViewSet)
router.register("cost-centers", CostCenterViewSet)
router.register("projects", ProjectViewSet)
router.register("number-series", NumberSeriesViewSet)

urlpatterns = [
    path("setup/status/", SetupStatusView.as_view(), name="setup-status"),
    path("setup/complete/", SetupCompleteView.as_view(), name="setup-complete"),
    path("companies/<int:company_id>/close-books/", BooksClosingView.as_view()),
    path("companies/<int:company_id>/export/", CompanyExportView.as_view()),
    path("exchange-rates/", ExchangeRateView.as_view(), name="exchange-rates"),
] + router.urls
