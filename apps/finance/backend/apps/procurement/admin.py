from django.contrib import admin

from .models import (
    GRN,
    GRNLine,
    PurchaseOrder,
    PurchaseOrderLine,
    VendorBill,
    VendorBillLine,
    VendorPayment,
    VendorPaymentAllocation,
)


class POLineInline(admin.TabularInline):
    model = PurchaseOrderLine
    extra = 0
    readonly_fields = ("taxable_amount", "cgst", "sgst", "igst", "line_total", "received_qty")


@admin.register(PurchaseOrder)
class POAdmin(admin.ModelAdmin):
    list_display = ("po_no", "date", "vendor", "grand_total", "status")
    list_filter = ("status", "company")
    inlines = [POLineInline]


class GRNLineInline(admin.TabularInline):
    model = GRNLine
    extra = 0


@admin.register(GRN)
class GRNAdmin(admin.ModelAdmin):
    list_display = ("grn_no", "date", "purchase_order", "status")
    inlines = [GRNLineInline]


class VBillLineInline(admin.TabularInline):
    model = VendorBillLine
    extra = 0
    readonly_fields = ("taxable_amount", "cgst", "sgst", "igst", "tds_amount", "line_total")


@admin.register(VendorBill)
class VBillAdmin(admin.ModelAdmin):
    list_display = ("bill_no", "date", "vendor", "grand_total", "tds_amount", "amount_paid", "status")
    list_filter = ("status", "company", "rcm_applicable")
    inlines = [VBillLineInline]
    readonly_fields = ("journal_entry",)


class VPaymentAllocInline(admin.TabularInline):
    model = VendorPaymentAllocation
    extra = 0


@admin.register(VendorPayment)
class VPaymentAdmin(admin.ModelAdmin):
    list_display = ("payment_no", "date", "vendor", "amount", "mode", "status")
    list_filter = ("status", "mode", "company")
    inlines = [VPaymentAllocInline]
    readonly_fields = ("journal_entry",)
