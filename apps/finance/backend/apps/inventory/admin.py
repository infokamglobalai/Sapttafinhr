from django.contrib import admin

from .models import Batch, Bin, SerialNumber, StockLevel, StockMovement, Warehouse


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "company", "is_default", "is_active")


@admin.register(Bin)
class BinAdmin(admin.ModelAdmin):
    list_display = ("code", "warehouse")


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ("batch_no", "item", "expiry_date")
    search_fields = ("batch_no", "item__sku")


@admin.register(SerialNumber)
class SerialAdmin(admin.ModelAdmin):
    list_display = ("serial_no", "item", "warehouse", "status")
    list_filter = ("status",)


@admin.register(StockMovement)
class MovementAdmin(admin.ModelAdmin):
    list_display = ("date", "item", "warehouse", "kind", "quantity", "unit_cost", "reference")
    list_filter = ("kind", "warehouse")
    search_fields = ("item__sku", "reference")


@admin.register(StockLevel)
class StockLevelAdmin(admin.ModelAdmin):
    list_display = ("item", "warehouse", "on_hand", "avg_cost", "reorder_level")
    list_filter = ("warehouse",)
