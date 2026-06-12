from rest_framework import serializers

from .models import Account, Branch, Company, CostCenter, FiscalYear, HSNCode, Item, NumberSeries, Party, Project
from .numbering import peek_next


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = "__all__"


class FiscalYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalYear
        fields = "__all__"


class AccountSerializer(serializers.ModelSerializer):
    parent_code = serializers.CharField(source="parent.code", read_only=True)

    class Meta:
        model = Account
        fields = (
            "id", "company", "code", "name", "type",
            "parent", "parent_code", "is_postable", "is_active", "description",
        )


class PartySerializer(serializers.ModelSerializer):
    has_bank_details = serializers.BooleanField(read_only=True)

    class Meta:
        model = Party
        fields = "__all__"


class HSNCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = HSNCode
        fields = "__all__"


class CostCenterSerializer(serializers.ModelSerializer):
    class Meta: model = CostCenter; fields = "__all__"


class ProjectSerializer(serializers.ModelSerializer):
    class Meta: model = Project; fields = "__all__"


class NumberSeriesSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source="get_doc_type_display", read_only=True)
    next_number = serializers.SerializerMethodField()

    class Meta:
        model = NumberSeries
        fields = (
            "id", "company", "doc_type", "doc_type_display",
            "prefix", "padding", "start_number", "is_active", "next_number",
        )

    def get_next_number(self, obj) -> str:
        return peek_next(obj.company, obj.doc_type)


class ItemSerializer(serializers.ModelSerializer):
    hsn_code = serializers.CharField(source="hsn.code", read_only=True)
    effective_tax_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )

    class Meta:
        model = Item
        fields = (
            "id", "company", "sku", "name", "kind", "description",
            "hsn", "hsn_code", "unit",
            "sale_price", "purchase_price", "tax_rate", "effective_tax_rate",
            "is_active",
        )
