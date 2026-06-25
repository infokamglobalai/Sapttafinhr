from rest_framework import serializers

from apps.billing.models import Invoice
from apps.masters.models import Account, Company, FiscalYear, Party

from .models import Receipt, ReceiptAllocation
from .services import ReceiptService


class ReceiptAllocationReadSerializer(serializers.ModelSerializer):
    invoice_no = serializers.CharField(source="invoice.invoice_no", read_only=True)

    class Meta:
        model = ReceiptAllocation
        fields = ("id", "invoice", "invoice_no", "amount")


class ReceiptReadSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    deposit_account_code = serializers.CharField(source="deposit_account.code", read_only=True)
    allocations = ReceiptAllocationReadSerializer(many=True, read_only=True)

    class Meta:
        model = Receipt
        fields = (
            "id", "company", "fiscal_year", "receipt_no", "date",
            "customer", "customer_name", "mode", "reference", "amount",
            "currency", "fx_rate",
            "notes", "status", "deposit_account", "deposit_account_code",
            "journal_entry", "allocations",
        )


class AllocationInput(serializers.Serializer):
    invoice = serializers.PrimaryKeyRelatedField(queryset=Invoice.objects.all())
    amount = serializers.DecimalField(max_digits=18, decimal_places=4)


class ReceiptCreateSerializer(serializers.Serializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    fiscal_year = serializers.PrimaryKeyRelatedField(queryset=FiscalYear.objects.all())
    receipt_no = serializers.CharField(max_length=40)
    date = serializers.DateField()
    customer = serializers.PrimaryKeyRelatedField(queryset=Party.objects.all())
    mode = serializers.ChoiceField(choices=Receipt.Mode.choices, default=Receipt.Mode.BANK)
    reference = serializers.CharField(required=False, allow_blank=True, default="")
    amount = serializers.DecimalField(max_digits=18, decimal_places=4)
    currency = serializers.CharField(max_length=3, required=False, default="INR")
    fx_rate = serializers.DecimalField(
        max_digits=18, decimal_places=6, required=False, default=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    deposit_account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())
    allocations = AllocationInput(many=True, required=False, default=list)

    def create(self, validated_data):
        allocations = validated_data.pop("allocations", [])
        receipt = Receipt(**validated_data)
        return ReceiptService().create_and_post(
            receipt=receipt,
            allocations=allocations,
            user=self.context["request"].user,
        )
