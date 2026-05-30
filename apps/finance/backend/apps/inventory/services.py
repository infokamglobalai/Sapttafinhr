"""Stock movement service — updates StockLevel + posts COGS / Inventory JE."""
from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.core.money import to_money

from .models import StockLevel, StockMovement, Warehouse


def _get_or_create_level(item, warehouse) -> StockLevel:
    lvl, _ = StockLevel.objects.get_or_create(item=item, warehouse=warehouse)
    return lvl


@transaction.atomic
def record_movement(*, company, date, item, warehouse, kind: str,
                    quantity, unit_cost=None,
                    bin=None, batch=None, serial=None,
                    reference: str = "", journal_entry=None) -> StockMovement:
    """Record one stock movement and update the StockLevel.
    Valuation method: Weighted Average (per-item-per-warehouse running avg cost).
    """
    qty = to_money(quantity)
    if qty == 0:
        raise ValidationError("Quantity cannot be zero.")

    cost = to_money(unit_cost or 0)
    lvl = _get_or_create_level(item, warehouse)

    new_qty = lvl.on_hand + qty
    if new_qty < 0:
        raise ValidationError(
            f"Insufficient stock: {item.sku} @ {warehouse.code} on_hand={lvl.on_hand}, "
            f"movement={qty}, would go to {new_qty}"
        )

    # Weighted-average cost: only inbound updates avg_cost
    if qty > 0 and cost > 0:
        total_val = (lvl.avg_cost * lvl.on_hand) + (cost * qty)
        lvl.avg_cost = (total_val / new_qty).quantize(Decimal("0.0001")) if new_qty else cost
    lvl.on_hand = new_qty
    lvl.save(update_fields=["on_hand", "avg_cost", "updated_at"])

    mv = StockMovement.objects.create(
        company=company, date=date, item=item, warehouse=warehouse,
        bin=bin, batch=batch, serial=serial,
        kind=kind, quantity=qty, unit_cost=cost,
        reference=reference, journal_entry=journal_entry,
    )
    return mv


@transaction.atomic
def transfer_stock(*, company, date, item, from_warehouse: Warehouse,
                   to_warehouse: Warehouse, quantity, reference: str = ""):
    """Move stock between warehouses — two movements, both at current avg cost."""
    lvl = _get_or_create_level(item, from_warehouse)
    cost = lvl.avg_cost
    out_mv = record_movement(
        company=company, date=date, item=item, warehouse=from_warehouse,
        kind=StockMovement.Kind.TRANSFER_OUT, quantity=-to_money(quantity),
        unit_cost=cost, reference=reference,
    )
    in_mv = record_movement(
        company=company, date=date, item=item, warehouse=to_warehouse,
        kind=StockMovement.Kind.TRANSFER_IN, quantity=to_money(quantity),
        unit_cost=cost, reference=reference,
    )
    return out_mv, in_mv


def stock_summary(company_id: int, warehouse_id: int = None) -> list[dict]:
    """On-hand summary across items."""
    qs = StockLevel.objects.filter(item__company_id=company_id).select_related("item", "warehouse")
    if warehouse_id:
        qs = qs.filter(warehouse_id=warehouse_id)
    rows = []
    for l in qs:
        if l.on_hand == 0 and l.reorder_level == 0:
            continue
        rows.append({
            "item_id": l.item.id,
            "sku": l.item.sku,
            "name": l.item.name,
            "warehouse": l.warehouse.code,
            "on_hand": str(l.on_hand),
            "avg_cost": str(l.avg_cost),
            "value": str((l.on_hand * l.avg_cost).quantize(Decimal("0.0001"))),
            "reorder_level": str(l.reorder_level),
            "below_reorder": l.on_hand < l.reorder_level,
        })
    return rows
