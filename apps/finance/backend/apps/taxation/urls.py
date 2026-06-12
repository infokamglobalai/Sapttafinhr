from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GenerateEInvoiceView, GenerateEWBView,
    GSTR1ExportView, GSTR2BReconcileView, GSTR3BExportView, HSNSummaryView,
    TDSViewSet, TDSSectionsView, TDSSummaryView,
)

router = DefaultRouter()
router.register("tds", TDSViewSet, basename="tds")

urlpatterns = [
    path("einvoice/<int:invoice_id>/", GenerateEInvoiceView.as_view()),
    path("eway/<int:invoice_id>/", GenerateEWBView.as_view()),
    path("hsn-summary/", HSNSummaryView.as_view()),
    path("gstr1/", GSTR1ExportView.as_view()),
    path("gstr3b/", GSTR3BExportView.as_view()),
    path("gstr2b/reconcile/", GSTR2BReconcileView.as_view()),
    path("tds/sections/", TDSSectionsView.as_view()),
    path("tds/summary/", TDSSummaryView.as_view()),
    path("", include(router.urls)),
]
