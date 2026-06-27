from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CreditNoteCreateView, CreditNoteViewSet, InvoiceCreateView,
    InvoiceViewSet, QuotationCreateView, QuotationViewSet,
    RecurringInvoiceViewSet, SalesOrderCreateView, SalesOrderViewSet,
)
from .client_document_views import (
    ClientDocumentFromQuotationView,
    ClientDocumentTemplateViewSet,
    ClientDocumentViewSet,
)
from .ai_views import SmartPaymentReminderView

router = DefaultRouter()
router.register("invoices", InvoiceViewSet)
router.register("credit-notes", CreditNoteViewSet)
router.register("quotations", QuotationViewSet)
router.register("sales-orders", SalesOrderViewSet)
router.register("recurring-invoices", RecurringInvoiceViewSet)
router.register("client-document-templates", ClientDocumentTemplateViewSet)
router.register("client-documents", ClientDocumentViewSet)

urlpatterns = [
    path("invoices/create/", InvoiceCreateView.as_view(), name="invoice-create"),
    path("invoices/<int:invoice_id>/smart-reminder/", SmartPaymentReminderView.as_view(), name="smart-reminder"),
    path("credit-notes/create/", CreditNoteCreateView.as_view(), name="credit-note-create"),
    path("quotations/create/", QuotationCreateView.as_view(), name="quotation-create"),
    path("sales-orders/create/", SalesOrderCreateView.as_view(), name="so-create"),
    path("client-documents/from-quotation/", ClientDocumentFromQuotationView.as_view(), name="client-doc-from-quote"),
] + router.urls
