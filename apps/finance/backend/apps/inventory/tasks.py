"""Celery tasks for inventory automation.

check_reorder_levels: daily — find StockLevel rows below their reorder threshold,
create in-app Notifications for staff users in that company. Dedupes within a day
by using a hash of (item, warehouse) in the notification link.
"""
from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context

from apps.core.tenants import iter_tenant_schemas
from apps.notifications.models import Notification

from .models import StockLevel


@shared_task
def check_reorder_levels():
    """Scan StockLevel across all tenants, notify staff about low stock."""
    today = timezone.now().date().isoformat()
    total = 0

    for tenant in iter_tenant_schemas():
        with schema_context(tenant.schema_name):
            low = (
                StockLevel.objects
                .filter(reorder_level__gt=0)
                .select_related("item", "warehouse")
            )
            from apps.identity.models import User
            staff_users = list(User.objects.filter(is_staff=True, is_active=True))
            if not staff_users:
                continue

            for lvl in low:
                if lvl.on_hand >= lvl.reorder_level:
                    continue
                link = f"#/stock-summary?item={lvl.item_id}&wh={lvl.warehouse_id}"
                # Dedupe by date — only one notification per item+warehouse per day
                marker = f"reorder:{lvl.item_id}:{lvl.warehouse_id}:{today}"
                for user in staff_users:
                    exists = Notification.objects.filter(
                        user=user, link=link, title__startswith="Low stock",
                        created_at__date=timezone.now().date(),
                    ).exists()
                    if exists:
                        continue
                    Notification.objects.create(
                        user=user,
                        title=f"Low stock: {lvl.item.sku}",
                        body=(
                            f"{lvl.item.name} at {lvl.warehouse.code} is below reorder level. "
                            f"On hand: {lvl.on_hand}, reorder at: {lvl.reorder_level}."
                        ),
                        level=Notification.Level.WARNING,
                        link=link,
                    )
                    total += 1
    return {"alerts_created": total}
