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

    def validate(self, attrs):
        from .tax_validation import (
            gstin_pan_consistency,
            gstin_state_consistency,
            is_india_company,
            normalise_tax_id,
            validate_gcc_tax_id,
            validate_gstin,
            validate_pan,
        )

        instance = getattr(self, "instance", None)
        country = attrs.get("country", getattr(instance, "country", "IN"))
        base_currency = attrs.get("base_currency", getattr(instance, "base_currency", "INR"))
        gstin = attrs.get("gstin", getattr(instance, "gstin", ""))
        pan = attrs.get("pan", getattr(instance, "pan", ""))
        state_code = attrs.get("state_code", getattr(instance, "state_code", ""))
        tax_id = attrs.get("tax_id", getattr(instance, "tax_id", ""))

        if "gstin" in attrs and attrs["gstin"]:
            attrs["gstin"] = normalise_tax_id(attrs["gstin"])
        if "pan" in attrs and attrs["pan"]:
            attrs["pan"] = normalise_tax_id(attrs["pan"])
        if "tax_id" in attrs and attrs["tax_id"]:
            attrs["tax_id"] = normalise_tax_id(attrs["tax_id"])

        gstin = attrs.get("gstin", gstin)
        pan = attrs.get("pan", pan)
        state_code = attrs.get("state_code", state_code)
        tax_id = attrs.get("tax_id", tax_id)

        if is_india_company(country, base_currency):
            if gstin:
                err = validate_gstin(gstin)
                if err:
                    raise serializers.ValidationError({"gstin": err})
                err = gstin_state_consistency(gstin, state_code)
                if err:
                    raise serializers.ValidationError({"gstin": err})
            if pan:
                err = validate_pan(pan)
                if err:
                    raise serializers.ValidationError({"pan": err})
            if gstin and pan:
                err = gstin_pan_consistency(gstin, pan)
                if err:
                    raise serializers.ValidationError({"gstin": err})
        elif tax_id:
            err = validate_gcc_tax_id(country, tax_id)
            if err:
                raise serializers.ValidationError({"tax_id": err})

        return attrs


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
