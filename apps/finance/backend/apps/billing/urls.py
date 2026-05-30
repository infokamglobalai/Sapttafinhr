from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CreditNoteCreateView,
    CreditNoteViewSet,
    InvoiceCreateView,
    InvoiceViewSet,
    QuotationCreateView,
    QuotationViewSet,
    RecurringInvoiceViewSet,
    SalesOrderCreateView,
    SalesOrderViewSet,
)

router = DefaultRouter()
router.register("invoices", InvoiceViewSet)
router.register("credit-notes", CreditNoteViewSet)
router.register("quotations", QuotationViewSet)
router.register("sales-orders", SalesOrderViewSet)
router.register("recurring-invoices", RecurringInvoiceViewSet)

urlpatterns = [
    path("invoices/create/", InvoiceCreateView.as_view(), name="invoice-create"),
    path("credit-notes/create/", CreditNoteCreateView.as_view(), name="credit-note-create"),
    path("quotations/create/", QuotationCreateView.as_view(), name="quotation-create"),
    path("sales-orders/create/", SalesOrderCreateView.as_view(), name="so-create"),
] + router.urls
