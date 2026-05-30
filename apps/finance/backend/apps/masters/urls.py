from django.urls import path
from rest_framework.routers import DefaultRouter

from .closing_views import BooksClosingView, CompanyExportView
from .views import (
    AccountViewSet,
    BranchViewSet,
    CompanyViewSet,
    CostCenterViewSet,
    FiscalYearViewSet,
    HSNCodeViewSet,
    ItemViewSet,
    PartyViewSet,
    ProjectViewSet,
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

urlpatterns = [
    path("companies/<int:company_id>/close-books/", BooksClosingView.as_view()),
    path("companies/<int:company_id>/export/", CompanyExportView.as_view()),
] + router.urls
