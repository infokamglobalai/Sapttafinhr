"""Workspace product entitlements — which Saptta products the tenant may use."""
from __future__ import annotations

import logging

from apps.tenants.models import ProductCode, ProductEntitlement, Tenant

from .billing_services import fetch_platform_billing

logger = logging.getLogger(__name__)


def tenant_product_codes(tenant: Tenant | None) -> frozenset[str]:
    """Authoritative product codes (FIN, HR) for this workspace."""
    if not tenant:
        return frozenset()

    platform = fetch_platform_billing(tenant)
    if platform and platform.get("products"):
        return frozenset(platform["products"])

    codes = set(
        tenant.product_entitlements.filter(
            status__in=ProductEntitlement.ACTIVE_STATUSES,
        ).values_list("product", flat=True)
    )
    if not codes and tenant.has_product_access(ProductCode.HR):
        codes.add(ProductCode.HR)
    return frozenset(codes)


def tenant_has_finance(tenant: Tenant | None) -> bool:
    return ProductCode.FIN in tenant_product_codes(tenant)


def tenant_has_hr(tenant: Tenant | None) -> bool:
    return ProductCode.HR in tenant_product_codes(tenant)


def product_menu_label(tenant: Tenant | None) -> str:
    codes = tenant_product_codes(tenant)
    parts = []
    if ProductCode.HR in codes:
        parts.append("Saptta-HR")
    if ProductCode.FIN in codes:
        parts.append("Saptta-Fin")
    return ", ".join(parts) if parts else "Saptta products"
