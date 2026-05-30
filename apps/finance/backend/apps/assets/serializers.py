from rest_framework import serializers

from .models import DepreciationEntry, FixedAsset


class FixedAssetSer(serializers.ModelSerializer):
    asset_account_code = serializers.CharField(source="asset_account.code", read_only=True)
    class Meta:
        model = FixedAsset
        fields = "__all__"
        read_only_fields = ("current_book_value", "accumulated_depreciation", "last_depreciated")

    def create(self, validated_data):
        validated_data["current_book_value"] = validated_data["purchase_cost"]
        return super().create(validated_data)


class DepreciationSer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    class Meta: model = DepreciationEntry; fields = "__all__"
