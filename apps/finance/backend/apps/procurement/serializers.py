from rest_framework import serializers

from apps.masters.models import Account, Company, FiscalYear, Item, Party
from apps.masters.tax import SUPPLY_STANDARD, SUPPLY_TYPE_CHOICES

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
from .services import GRNService, PurchaseOrderService, VendorBillService, VendorPaymentService


# ---------- PO ----------

class POLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderLine
        fields = ("id", "item", "description", "hsn_code", "quantity",
                  "unit_price", "tax_rate", "taxable_amount", "cgst", "sgst",
                  "igst", "line_total", "received_qty")
        read_only_fields = ("taxable_amount", "cgst", "sgst", "igst", "line_total", "received_qty")


class POReadSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    lines = POLineSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ("id", "company", "fiscal_year", "po_no", "date", "delivery_date",
                  "vendor", "vendor_name", "notes", "status",
                  "taxable_amount", "cgst", "sgst", "igst", "grand_total", "lines")


class POLineInput(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all(), required=False, allow_null=True)
    description = serializers.CharField(max_length=255)
    hsn_code = serializers.CharField(required=False, allow_blank=True, default="")
    quantity = serializers.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_price = serializers.DecimalField(max_digits=18, decimal_places=4)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)


class POCreateSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    fiscal_year = serializers.PrimaryKeyRelatedField(queryset=FiscalYear.objects.all())
    po_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    delivery_date = serializers.DateField(required=False, allow_null=True)
    vendor = serializers.PrimaryKeyRelatedField(queryset=Party.objects.all())
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    lines = POLineInput(many=True)

    def create(self, validated_data):
        lines = validated_data.pop("lines")
        po = PurchaseOrder(**validated_data)
        return PurchaseOrderService().create(po=po, lines_data=lines)


# ---------- GRN ----------

class GRNLineRead(serializers.ModelSerializer):
    po_line_description = serializers.CharField(source="po_line.description", read_only=True)

    class Meta:
        model = GRNLine
        fields = ("id", "po_line", "po_line_description", "received_qty")


class GRNReadSerializer(serializers.ModelSerializer):
    po_no = serializers.CharField(source="purchase_order.po_no", read_only=True)
    vendor_name = serializers.CharField(source="purchase_order.vendor.name", read_only=True)
    lines = GRNLineRead(many=True, read_only=True)

    class Meta:
        model = GRN
        fields = ("id", "company", "grn_no", "date", "purchase_order", "po_no",
                  "vendor_name", "notes", "status", "lines")


class GRNReceiptInput(serializers.Serializer):
    po_line = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrderLine.objects.all())
    received_qty = serializers.DecimalField(max_digits=18, decimal_places=4)


class GRNCreateSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    grn_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    purchase_order = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrder.objects.all())
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    receipts = GRNReceiptInput(many=True)

    def create(self, validated_data):
        receipts = validated_data.pop("receipts")
        grn = GRN(**validated_data)
        return GRNService().create(grn=grn, receipts=receipts)


# ---------- Vendor Bill ----------

class VBillLineRead(serializers.ModelSerializer):
    expense_account_code = serializers.CharField(source="expense_account.code", read_only=True)

    class Meta:
        model = VendorBillLine
        fields = ("id", "item", "expense_account", "expense_account_code",
                  "po_line", "description", "hsn_code",
                  "quantity", "unit_price", "tax_rate", "supply_type", "tds_section", "tds_rate",
                  "taxable_amount", "cgst", "sgst", "igst", "vat", "tds_amount", "line_total")
        read_only_fields = ("taxable_amount", "cgst", "sgst", "igst", "vat",
                            "tds_amount", "line_total")


class VBillReadSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    lines = VBillLineRead(many=True, read_only=True)
    balance_due = serializers.DecimalField(max_digits=18, decimal_places=4, read_only=True)

    class Meta:
        model = VendorBill
        fields = ("id", "company", "fiscal_year", "bill_no", "date", "due_date",
                  "vendor", "vendor_name", "purchase_order", "place_of_supply",
                  "rcm_applicable", "notes", "status",
                  "taxable_amount", "cgst", "sgst", "igst", "vat", "tds_amount",
                  "grand_total", "amount_paid", "balance_due",
                  "journal_entry", "lines")


class VBillLineInput(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all(), required=False, allow_null=True)
    expense_account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())
    po_line = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrderLine.objects.all(),
                                                  required=False, allow_null=True)
    description = serializers.CharField(max_length=255)
    hsn_code = serializers.CharField(required=False, allow_blank=True, default="")
    quantity = serializers.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_price = serializers.DecimalField(max_digits=18, decimal_places=4)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    supply_type = serializers.ChoiceField(
        choices=SUPPLY_TYPE_CHOICES, required=False, default=SUPPLY_STANDARD)
    tds_section = serializers.CharField(required=False, allow_blank=True, default="")
    tds_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)


class VBillCreateSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    fiscal_year = serializers.PrimaryKeyRelatedField(queryset=FiscalYear.objects.all())
    bill_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    due_date = serializers.DateField(required=False, allow_null=True)
    vendor = serializers.PrimaryKeyRelatedField(queryset=Party.objects.all())
    purchase_order = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrder.objects.all(),
                                                        required=False, allow_null=True)
    place_of_supply = serializers.CharField(max_length=2, required=False, allow_blank=True, default="")
    rcm_applicable = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    lines = VBillLineInput(many=True)

    def create(self, validated_data):
        lines = validated_data.pop("lines")
        bill = VendorBill(**validated_data)
        return VendorBillService().create_and_post(
            bill=bill, lines_data=lines, user=self.context["request"].user,
        )


# ---------- Vendor Payment ----------

class VPaymentAllocRead(serializers.ModelSerializer):
    bill_no = serializers.CharField(source="bill.bill_no", read_only=True)

    class Meta:
        model = VendorPaymentAllocation
        fields = ("id", "bill", "bill_no", "amount")


class VPaymentReadSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    paid_from_code = serializers.CharField(source="paid_from_account.code", read_only=True)
    allocations = VPaymentAllocRead(many=True, read_only=True)

    class Meta:
        model = VendorPayment
        fields = ("id", "company", "fiscal_year", "payment_no", "date",
                  "vendor", "vendor_name", "mode", "reference", "amount", "notes",
                  "status", "paid_from_account", "paid_from_code",
                  "journal_entry", "allocations")


class VPaymentAllocInput(serializers.Serializer):
    bill = serializers.PrimaryKeyRelatedField(queryset=VendorBill.objects.all())
    amount = serializers.DecimalField(max_digits=18, decimal_places=4)


class VPaymentCreateSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    fiscal_year = serializers.PrimaryKeyRelatedField(queryset=FiscalYear.objects.all())
    payment_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    vendor = serializers.PrimaryKeyRelatedField(queryset=Party.objects.all())
    mode = serializers.ChoiceField(choices=VendorPayment.Mode.choices, default=VendorPayment.Mode.BANK)
    reference = serializers.CharField(required=False, allow_blank=True, default="")
    amount = serializers.DecimalField(max_digits=18, decimal_places=4)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    paid_from_account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())
    allocations = VPaymentAllocInput(many=True, required=False, default=list)

    def create(self, validated_data):
        allocs = validated_data.pop("allocations", [])
        payment = VendorPayment(**validated_data)
        return VendorPaymentService().create_and_post(
            payment=payment, allocations=allocs, user=self.context["request"].user,
        )
