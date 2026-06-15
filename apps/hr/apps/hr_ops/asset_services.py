"""Asset code generation for HR operational asset register."""
from __future__ import annotations

import re

from .models import Asset

# Common IT / office asset categories → short prefix
CATEGORY_PREFIXES = {
    "laptop": "LP",
    "notebook": "LP",
    "desktop": "DT",
    "computer": "DT",
    "pc": "DT",
    "monitor": "MN",
    "display": "MN",
    "phone": "PH",
    "mobile": "PH",
    "smartphone": "PH",
    "tablet": "TB",
    "ipad": "TB",
    "access_card": "AC",
    "access card": "AC",
    "id_card": "ID",
    "vehicle": "VH",
    "car": "VH",
    "bike": "BK",
    "headset": "HS",
    "keyboard": "KB",
    "mouse": "MS",
    "printer": "PR",
    "router": "RT",
    "server": "SV",
    "furniture": "FR",
    "chair": "CH",
}


def category_prefix(category: str) -> str:
    """Map free-text category to a 2-letter prefix."""
    key = (category or "").strip().lower().replace("-", " ").replace("_", " ")
    if key in CATEGORY_PREFIXES:
        return CATEGORY_PREFIXES[key]
    words = [w for w in key.split() if w]
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    if words and len(words[0]) >= 2:
        return words[0][:2].upper()
    return "AS"


def make_abbrev(make: str) -> str:
    """First 3 letters of brand/make, e.g. Apple → APL, Dell → DEL."""
    cleaned = re.sub(r"[^A-Za-z0-9]", "", (make or "").strip())
    return cleaned[:3].upper() if cleaned else ""


def generate_asset_code(tenant, category: str = "", make: str = "") -> str:
    """
    Generate next asset code for a tenant.

    Pattern (industry-common for IT asset tracking):
      {Category}-{Brand}-{Seq}   e.g. LP-APL-001, PH-SAM-002
      {Category}-{Seq}           when brand is empty, e.g. LP-003
    """
    cat = category_prefix(category)
    brand = make_abbrev(make)
    stem = f"{cat}-{brand}" if brand else cat

    existing = Asset.objects.filter(
        tenant=tenant,
        asset_code__regex=rf"^{re.escape(stem)}-\d{{3}}$",
    ).values_list("asset_code", flat=True)

    max_num = 0
    for code in existing:
        try:
            max_num = max(max_num, int(code.rsplit("-", 1)[-1]))
        except ValueError:
            continue

    return f"{stem}-{max_num + 1:03d}"
