from django.contrib import admin

from .models import EInvoiceIRN, EWayBill, GccEInvoice, GSTR2BLine


@admin.register(EInvoiceIRN)
class EInvoiceAdmin(admin.ModelAdmin):
    list_display = ("irn", "invoice", "ack_no", "status", "created_at")
    search_fields = ("irn", "ack_no")


@admin.register(GccEInvoice)
class GccEInvoiceAdmin(admin.ModelAdmin):
    list_display = ("uuid", "scheme", "invoice", "status", "cleared_at", "created_at")
    list_filter = ("scheme", "status")
    search_fields = ("uuid", "invoice_hash")


@admin.register(EWayBill)
class EWBAdmin(admin.ModelAdmin):
    list_display = ("eway_no", "invoice", "valid_until", "vehicle_no", "status")
    search_fields = ("eway_no", "vehicle_no")


@admin.register(GSTR2BLine)
class GSTR2BAdmin(admin.ModelAdmin):
    list_display = ("return_period", "supplier_gstin", "invoice_no", "taxable", "match_status")
    list_filter = ("match_status", "return_period")
    search_fields = ("supplier_gstin", "invoice_no")
