from django.urls import path

from .views import (
    GenerateEInvoiceView,
    GenerateEWBView,
    GSTR1ExportView,
    GSTR2BReconcileView,
    GSTR3BExportView,
    HSNSummaryView,
)

urlpatterns = [
    path("einvoice/<int:invoice_id>/", GenerateEInvoiceView.as_view()),
    path("eway/<int:invoice_id>/", GenerateEWBView.as_view()),
    path("hsn-summary/", HSNSummaryView.as_view()),
    path("gstr1/", GSTR1ExportView.as_view()),
    path("gstr3b/", GSTR3BExportView.as_view()),
    path("gstr2b/reconcile/", GSTR2BReconcileView.as_view()),
]
