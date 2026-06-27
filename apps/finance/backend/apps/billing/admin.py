from django.contrib import admin

from .models import (
    ClientDocument, ClientDocumentTemplate,
    CreditNote, Invoice, InvoiceLine,
    Quotation, QuotationLine, SalesOrder, SalesOrderLine,
    RecurringInvoiceTemplate,
)


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0
    readonly_fields = ("taxable_amount", "cgst", "sgst", "igst", "line_total")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_no", "date", "customer", "grand_total", "amount_paid", "status")
    list_filter = ("status", "company", "fiscal_year")
    search_fields = ("invoice_no", "customer__name")
    inlines = [InvoiceLineInline]
    readonly_fields = (
        "taxable_amount", "cgst", "sgst", "igst", "grand_total",
        "amount_paid", "journal_entry",
    )


@admin.register(CreditNote)
class CreditNoteAdmin(admin.ModelAdmin):
    list_display = ("note_no", "date", "invoice", "grand_total", "status")
    list_filter = ("status", "company")
    search_fields = ("note_no",)
    readonly_fields = ("journal_entry",)


class QuotationLineInline(admin.TabularInline):
    model = QuotationLine
    extra = 0


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ("quote_no", "date", "customer", "grand_total", "status")
    list_filter = ("status", "company")
    inlines = [QuotationLineInline]


class SalesOrderLineInline(admin.TabularInline):
    model = SalesOrderLine
    extra = 0


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ("so_no", "date", "customer", "grand_total", "status")
    list_filter = ("status", "company")
    inlines = [SalesOrderLineInline]


@admin.register(RecurringInvoiceTemplate)
class RecurringAdmin(admin.ModelAdmin):
    list_display = ("name", "customer", "frequency", "next_run_date", "is_active", "runs_completed")
    list_filter = ("frequency", "is_active", "company")


@admin.register(ClientDocumentTemplate)
class ClientDocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "doc_type", "company", "is_active")
    list_filter = ("doc_type", "is_active", "company")


@admin.register(ClientDocument)
class ClientDocumentAdmin(admin.ModelAdmin):
    list_display = ("doc_no", "title", "customer", "doc_type", "status", "company")
    list_filter = ("status", "doc_type", "company")
    search_fields = ("doc_no", "title", "customer__name")
