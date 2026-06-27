from rest_framework import serializers

from apps.masters.models import Company, FiscalYear, Item, Party
from apps.masters.tax import SUPPLY_STANDARD, SUPPLY_TYPE_CHOICES

from .models import (
    ClientDocument, ClientDocumentTemplate,
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
            "customer", "customer_name", "place_of_supply", "currency", "fx_rate",
            "notes", "status",
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
    # Transaction currency. Line amounts/totals are stored in this currency; the
    # GL is posted in the company's base currency using fx_rate (see services).
    currency = serializers.CharField(max_length=3, required=False, default="INR")
    fx_rate = serializers.DecimalField(
        max_digits=18, decimal_places=6, required=False, default=1,
        help_text="1 unit of `currency` = this many base-currency units. 1 when currency == base.")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    warehouse = serializers.IntegerField(required=False, allow_null=True)
    lines = InvoiceLineInput(many=True)

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("At least one line required.")
        return value

    def create(self, validated_data):
        warehouse_id = validated_data.pop("warehouse", None)
        lines = validated_data.pop("lines")
        invoice = Invoice(**validated_data)
        return InvoiceService().create_and_post(
            invoice=invoice,
            lines_data=lines,
            user=self.context["request"].user,
            warehouse_id=warehouse_id,
        )


class CreditNoteReadSerializer(serializers.ModelSerializer):
    invoice_no = serializers.CharField(source="invoice.invoice_no", read_only=True)
    customer_name = serializers.CharField(source="invoice.customer.name", read_only=True)
    # A credit note is always in its source invoice's transaction currency (the
    # GL is posted at the invoice's fx_rate). Derived, so the UI can format the
    # CN's amounts in the right currency without a column on the model.
    currency = serializers.CharField(source="invoice.currency", read_only=True)

    class Meta:
        model = CreditNote
        fields = (
            "id", "company", "fiscal_year", "note_no", "date",
            "invoice", "invoice_no", "customer_name", "currency", "reason", "status",
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


class ClientDocumentTemplateSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source="get_doc_type_display", read_only=True)

    class Meta:
        model = ClientDocumentTemplate
        fields = (
            "id", "company", "doc_type", "doc_type_display", "name",
            "template_html", "is_active", "created_at", "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")


class ClientDocumentReadSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True, default="")
    quotation_no = serializers.CharField(source="quotation.quote_no", read_only=True, default="")
    doc_type_display = serializers.CharField(source="get_doc_type_display", read_only=True)

    class Meta:
        model = ClientDocument
        fields = (
            "id", "company", "template", "template_name", "doc_type", "doc_type_display",
            "doc_no", "title", "customer", "customer_name", "quotation", "quotation_no",
            "sales_order", "body_html", "extra_context", "status", "finalized_at",
            "created_at", "updated_at",
        )


class ClientDocumentFromQuotationSerializer(serializers.Serializer):
    quotation = serializers.PrimaryKeyRelatedField(queryset=Quotation.objects.all())
    doc_type = serializers.ChoiceField(
        choices=ClientDocumentTemplate.DocType.choices, default="sow", required=False
    )
    template = serializers.PrimaryKeyRelatedField(
        queryset=ClientDocumentTemplate.objects.all(), required=False, allow_null=True
    )
    project_name = serializers.CharField(required=False, allow_blank=True, default="")
    milestones = serializers.CharField(required=False, allow_blank=True, default="")
    payment_terms = serializers.CharField(required=False, allow_blank=True, default="")
    contract_start = serializers.CharField(required=False, allow_blank=True, default="")
    contract_end = serializers.CharField(required=False, allow_blank=True, default="")

    def create(self, validated_data):
        from .client_documents import create_from_quotation

        quotation = validated_data["quotation"]
        extra = {
            k: validated_data.get(k, "")
            for k in ("project_name", "milestones", "payment_terms", "contract_start", "contract_end")
            if validated_data.get(k)
        }
        template = validated_data.get("template")
        return create_from_quotation(
            quotation,
            doc_type=validated_data.get("doc_type") or "sow",
            template_id=template.pk if template else None,
            extra_context=extra,
        )


class ClientDocumentBodySerializer(serializers.Serializer):
    body_html = serializers.CharField()
