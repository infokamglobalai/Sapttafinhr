from rest_framework import serializers

from apps.masters.models import Item

from .models import Batch, Bin, SerialNumber, StockLevel, StockMovement, Warehouse


class WarehouseSer(serializers.ModelSerializer):
    class Meta: model = Warehouse; fields = "__all__"


class BinSer(serializers.ModelSerializer):
    class Meta: model = Bin; fields = "__all__"


class BatchSer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    class Meta: model = Batch; fields = "__all__"


class SerialSer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    class Meta: model = SerialNumber; fields = "__all__"


class MovementSer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    item_name = serializers.CharField(source="item.name", read_only=True)
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)
    class Meta: model = StockMovement; fields = "__all__"


class MovementInput(serializers.Serializer):
    company = serializers.IntegerField()
    date = serializers.DateField()
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all())
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all())
    kind = serializers.ChoiceField(choices=StockMovement.Kind.choices)
    quantity = serializers.DecimalField(max_digits=18, decimal_places=4)
    unit_cost = serializers.DecimalField(max_digits=18, decimal_places=4, required=False, default=0)
    reference = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class StockLevelSer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    item_name = serializers.CharField(source="item.name", read_only=True)
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)
    class Meta: model = StockLevel; fields = "__all__"
