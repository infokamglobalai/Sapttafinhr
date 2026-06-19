from rest_framework import serializers

from .jurisdictions import get_jurisdiction
from .models import Account, Branch, Company, CostCenter, FiscalYear, HSNCode, Item, NumberSeries, Party, Project
from .numbering import peek_next


class CompanySerializer(serializers.ModelSerializer):
    tax_regime_display = serializers.CharField(source="get_tax_regime_display", read_only=True)
    tax_id_label = serializers.SerializerMethodField()
    jurisdiction = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = "__all__"

    def get_tax_id_label(self, obj) -> str:
        rules = get_jurisdiction(obj.country)
        return rules["tax_id_label"] if rules else "Tax ID"

    def get_jurisdiction(self, obj) -> dict | None:
        """The full rule set for this company's country (read-only reference)."""
        return get_jurisdiction(obj.country)


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
