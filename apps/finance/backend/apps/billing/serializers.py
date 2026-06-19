from rest_framework import serializers

from apps.masters.models import Company, FiscalYear, Item, Party
from apps.masters.tax import SUPPLY_STANDARD, SUPPLY_TYPE_CHOICES

from .models import (
    CreditNote, Invoice, InvoiceLine,
    Quotation, QuotationLine, SalesOrder, SalesOrderLine,
    RecurringInvoiceTemplate,
)
from .quote_so import QuotationService, SalesOrderService
from .services import CreditNoteService, InvoiceService


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = (
            "id", "item", "description", "hsn_code",
            "quantity", "unit_price", "discount_percent", "tax_rate", "supply_type",
            "taxable_amount", "cgst", "sgst", "igst", "vat", "line_total",
        )
        read_only_fields = ("taxable_amount", "cgst", "sgst", "igst", "vat", "line_total")


class InvoiceReadSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    lines = InvoiceLineSerializer(many=True, read_only=True)
    balance_due = serializers.DecimalField(max_digits=18, decimal_places=4, read_only=True)
    is_paid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id", "company", "fiscal_year", "invoice_no", "date", "due_date",
            "customer", "customer_name", "place_of_supply", "notes", "status",
            "taxable_amount", "cgst", "sgst", "igst", "vat", "grand_total",
            "amount_paid", "balance_due", "is_paid",
            "journal_entry", "lines",
        )


class InvoiceLineInput(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all(), required=False, allow_null=True)
    description = serializers.CharField(max_length=255)
    hsn_code = serializers.CharField(required=False, allow_blank=True, default="")
    quantity = serializers.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_price = serializers.DecimalField(max_digits=18, decimal_places=4)
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    supply_type = serializers.ChoiceField(
        choices=SUPPLY_TYPE_CHOICES, required=False, default=SUPPLY_STANDARD)


class InvoiceCreateSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    fiscal_year = serializers.PrimaryKeyRelatedField(queryset=FiscalYear.objects.all())
    invoice_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    due_date = serializers.DateField(required=False, allow_null=True)
    customer = serializers.PrimaryKeyRelatedField(queryset=Party.objects.all())
    # Buyer state code — required for India GST place-of-supply; blank for GCC VAT.
    place_of_supply = serializers.CharField(max_length=2, required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    lines = InvoiceLineInput(many=True)

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("At least one line required.")
        return value

    def create(self, validated_data):
        lines = validated_data.pop("lines")
        invoice = Invoice(**validated_data)
        return InvoiceService().create_and_post(
            invoice=invoice,
            lines_data=lines,
            user=self.context["request"].user,
        )


class CreditNoteReadSerializer(serializers.ModelSerializer):
    invoice_no = serializers.CharField(source="invoice.invoice_no", read_only=True)
    customer_name = serializers.CharField(source="invoice.customer.name", read_only=True)

    class Meta:
        model = CreditNote
        fields = (
            "id", "company", "fiscal_year", "note_no", "date",
            "invoice", "invoice_no", "customer_name", "reason", "status",
            "taxable_amount", "cgst", "sgst", "igst", "vat", "grand_total",
            "journal_entry",
        )


class QuotationLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationLine
        fields = ("id", "item", "description", "quantity", "unit_price", "tax_rate", "line_total")
        read_only_fields = ("line_total",)


class QuotationReadSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    lines = QuotationLineSerializer(many=True, read_only=True)

    class Meta:
        model = Quotation
        fields = ("id", "company", "quote_no", "date", "valid_until",
                  "customer", "customer_name", "notes", "status", "grand_total", "lines")


class QuotationLineInput(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all(), required=False, allow_null=True)
    description = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_price = serializers.DecimalField(max_digits=18, decimal_places=4)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)


class QuotationCreateSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    quote_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    valid_until = serializers.DateField(required=False, allow_null=True)
    customer = serializers.PrimaryKeyRelatedField(queryset=Party.objects.all())
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    lines = QuotationLineInput(many=True)

    def create(self, validated_data):
        lines = validated_data.pop("lines")
        q = Quotation(**validated_data)
        return QuotationService().create(quote=q, lines_data=lines)


class SOLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrderLine
        fields = ("id", "item", "description", "quantity", "unit_price", "tax_rate", "line_total")
        read_only_fields = ("line_total",)


class SalesOrderReadSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    lines = SOLineSerializer(many=True, read_only=True)

    class Meta:
        model = SalesOrder
        fields = ("id", "company", "so_no", "date", "customer", "customer_name",
                  "quotation", "place_of_supply", "notes", "status", "grand_total", "lines")


class SOCreateSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    so_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    customer = serializers.PrimaryKeyRelatedField(queryset=Party.objects.all())
    quotation = serializers.PrimaryKeyRelatedField(queryset=Quotation.objects.all(),
                                                    required=False, allow_null=True)
    place_of_supply = serializers.CharField(max_length=2)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    lines = QuotationLineInput(many=True)

    def create(self, validated_data):
        lines = validated_data.pop("lines")
        so = SalesOrder(**validated_data)
        return SalesOrderService().create(so=so, lines_data=lines)


class RecurringInvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = RecurringInvoiceTemplate
        fields = "__all__"


class CreditNoteCreateSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    fiscal_year = serializers.PrimaryKeyRelatedField(queryset=FiscalYear.objects.all())
    note_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    invoice = serializers.PrimaryKeyRelatedField(queryset=Invoice.objects.all())
    taxable_amount = serializers.DecimalField(max_digits=18, decimal_places=4)
    reason = serializers.CharField(required=False, allow_blank=True, default="")

    def create(self, validated_data):
        return CreditNoteService().create_and_post(
            user=self.context["request"].user,
            **validated_data,
        )
