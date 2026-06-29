"""Self-serve master-data import: validated CSV with a dry-run preview.

Onboarding customers arrive with their existing chart of accounts and
customer/vendor lists. This module lets them upload a templated CSV that is
validated row-by-row through the *same* DRF serializer the API uses, reports
per-row errors and duplicates, and — only on an explicit commit — writes the
clean rows inside a single transaction. A dry-run (commit=False) returns the
identical report without touching the database, so users see exactly what will
happen before they pull the trigger.

Scope (first slice): ``account`` (chart of accounts) and ``party`` (customers &
vendors). ``parent_code`` resolves against accounts already in the company
(seed the COA or import parents first); unknown parents are reported and the
account is imported flat.
"""
from __future__ import annotations

import csv
import io
from dataclasses import dataclass

from django.db import transaction

from .models import Account, HSNCode, Item, Party
from .serializers import AccountSerializer, ItemSerializer, PartySerializer


@dataclass(frozen=True)
class ColumnSpec:
    csv: str                 # CSV header
    field: str               # serializer/model field name
    required: bool = False
    upper: bool = False      # upper-case before validating (choice fields)


@dataclass(frozen=True)
class FkLookup:
    """A CSV column holding a human code that resolves to a related row's id.

    Used for hierarchy/links (Account.parent via parent_code, Item.hsn via
    hsn_code). Resolution is scoped to the company; an unknown code is reported
    and the row is imported without that link.
    """
    csv: str                 # CSV column (e.g. parent_code, hsn_code)
    set_field: str           # serializer field to populate with the resolved id
    model: type              # model to resolve against
    lookup_field: str = "code"


@dataclass(frozen=True)
class EntitySpec:
    key: str
    label: str
    model: type
    serializer: type
    columns: tuple[ColumnSpec, ...]
    dedupe_fields: tuple[str, ...]      # duplicate detection within a company
    example: dict
    fk_lookups: tuple[FkLookup, ...] = ()

    @property
    def headers(self) -> list[str]:
        return [c.csv for c in self.columns]


ENTITIES: dict[str, EntitySpec] = {
    "account": EntitySpec(
        key="account",
        label="Chart of Accounts",
        model=Account,
        serializer=AccountSerializer,
        columns=(
            ColumnSpec("code", "code", required=True),
            ColumnSpec("name", "name", required=True),
            ColumnSpec("type", "type", required=True, upper=True),
            ColumnSpec("parent_code", "parent", upper=False),
            ColumnSpec("is_postable", "is_postable"),
            ColumnSpec("description", "description"),
        ),
        dedupe_fields=("code",),
        fk_lookups=(FkLookup("parent_code", "parent", Account),),
        example={
            "code": "4000", "name": "Sales", "type": "INCOME",
            "parent_code": "", "is_postable": "true",
            "description": "Revenue from operations",
        },
    ),
    "party": EntitySpec(
        key="party",
        label="Customers & Vendors",
        model=Party,
        serializer=PartySerializer,
        columns=(
            ColumnSpec("name", "name", required=True),
            ColumnSpec("kind", "kind", upper=True),
            ColumnSpec("legal_name", "legal_name"),
            ColumnSpec("gstin", "gstin"),
            ColumnSpec("pan", "pan"),
            ColumnSpec("email", "email"),
            ColumnSpec("phone", "phone"),
            ColumnSpec("billing_address", "billing_address"),
            ColumnSpec("state_code", "state_code"),
            ColumnSpec("credit_limit", "credit_limit"),
            ColumnSpec("bank_account_name", "bank_account_name"),
            ColumnSpec("bank_account_number", "bank_account_number"),
            ColumnSpec("bank_name", "bank_name"),
            ColumnSpec("bank_ifsc", "bank_ifsc"),
        ),
        dedupe_fields=("name", "kind"),
        example={
            "name": "Acme Industries", "kind": "CUSTOMER",
            "legal_name": "Acme Industries Pvt Ltd", "gstin": "27AAACA1234A1Z5",
            "pan": "AAACA1234A", "email": "ap@acme.example", "phone": "9876543210",
            "billing_address": "12 MG Road, Pune", "state_code": "27",
            "credit_limit": "100000", "bank_account_name": "Acme Industries Pvt Ltd",
            "bank_account_number": "1234567890", "bank_name": "HDFC Bank",
            "bank_ifsc": "HDFC0000123",
        },
    ),
    "item": EntitySpec(
        key="item",
        label="Items (Products & Services)",
        model=Item,
        serializer=ItemSerializer,
        columns=(
            ColumnSpec("sku", "sku", required=True),
            ColumnSpec("name", "name", required=True),
            ColumnSpec("kind", "kind", upper=True),
            ColumnSpec("description", "description"),
            ColumnSpec("hsn_code", "hsn"),  # resolved against HSN codes (see fk_lookups)
            ColumnSpec("unit", "unit"),
            ColumnSpec("sale_price", "sale_price"),
            ColumnSpec("purchase_price", "purchase_price"),
            ColumnSpec("tax_rate", "tax_rate"),
        ),
        dedupe_fields=("sku",),
        fk_lookups=(FkLookup("hsn_code", "hsn", HSNCode),),
        example={
            "sku": "WIDGET-01", "name": "Standard Widget", "kind": "GOODS",
            "description": "Stainless widget, 10mm", "hsn_code": "8479",
            "unit": "Nos", "sale_price": "100", "purchase_price": "60", "tax_rate": "18",
        },
    ),
}

# Default kind for party rows that leave the column blank.
_PARTY_DEFAULT_KIND = "CUSTOMER"


def template_csv(entity_key: str) -> str:
    """A header row plus one example row, ready to download and fill in."""
    spec = ENTITIES[entity_key]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=spec.headers, lineterminator="\n")
    writer.writeheader()
    writer.writerow(spec.example)
    return buf.getvalue()


def parse_csv(file_or_bytes) -> list[dict]:
    """Decode an uploaded CSV (handles a UTF-8 BOM from Excel) into row dicts."""
    raw = file_or_bytes.read() if hasattr(file_or_bytes, "read") else file_or_bytes
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8-sig")
    return [dict(r) for r in csv.DictReader(io.StringIO(raw))]


def _dedupe_key(values: dict, fields: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(str(values.get(f, "") or "").strip().upper() for f in fields)


def run_import(*, company, entity_key: str, rows: list[dict], commit: bool = False) -> dict:
    """Validate every row and (optionally) persist the clean ones.

    Returns a report: per-row status (ok | error | duplicate) with messages, plus
    counts. ``created`` is only non-zero when ``commit`` is True.
    """
    spec = ENTITIES[entity_key]

    # FK code → id maps (scoped to the company) for each lookup column
    # (Account.parent via parent_code, Item.hsn via hsn_code).
    fk_maps: dict[str, dict[str, int]] = {
        fk.csv: {getattr(o, fk.lookup_field): o.id for o in fk.model.objects.filter(company=company)}
        for fk in spec.fk_lookups
    }
    fk_columns = {fk.csv for fk in spec.fk_lookups}

    # Existing dedupe keys already in the DB for this company.
    db_keys = {
        _dedupe_key({f: getattr(obj, f) for f in spec.dedupe_fields}, spec.dedupe_fields)
        for obj in spec.model.objects.filter(company=company)
    }

    report: list[dict] = []
    pending = []          # (row_no, serializer) for valid rows
    seen_in_batch: set = set()

    for line_no, raw in enumerate(rows, start=2):  # row 1 is the header
        messages: list[str] = []
        data: dict = {"company": company.pk}
        label = (raw.get("name") or raw.get("code") or raw.get("sku") or "").strip()

        for col in spec.columns:
            if col.csv in fk_columns:
                continue  # resolved separately below
            value = (raw.get(col.csv) or "").strip()
            if not value:
                if col.required:
                    messages.append(f"{col.csv} is required")
                continue
            data[col.field] = value.upper() if col.upper else value

        # Party kind defaults to CUSTOMER when left blank.
        if spec.key == "party" and not data.get("kind"):
            data["kind"] = _PARTY_DEFAULT_KIND

        # Resolve optional FK columns (parent account, HSN code) against existing rows.
        for fk in spec.fk_lookups:
            raw_code = (raw.get(fk.csv) or "").strip()
            if raw_code:
                resolved = fk_maps[fk.csv].get(raw_code)
                if resolved is None:
                    messages.append(f"{fk.csv} '{raw_code}' not found — imported without it")
                else:
                    data[fk.set_field] = resolved

        if any(m.endswith("is required") for m in messages):
            report.append({"row": line_no, "status": "error", "messages": messages, "label": label})
            continue

        key = _dedupe_key(data, spec.dedupe_fields)
        if key in db_keys or key in seen_in_batch:
            report.append({"row": line_no, "status": "duplicate",
                           "messages": ["already exists — skipped"], "label": label})
            continue

        serializer = spec.serializer(data=data)
        if not serializer.is_valid():
            errs = [f"{field}: {'; '.join(str(m) for m in msgs)}"
                    for field, msgs in serializer.errors.items()]
            report.append({"row": line_no, "status": "error",
                           "messages": errs or messages, "label": label})
            continue

        seen_in_batch.add(key)
        report.append({"row": line_no, "status": "ok", "messages": messages, "label": label})
        pending.append((line_no, serializer))

    created = 0
    if commit and pending:
        with transaction.atomic():
            for _, serializer in pending:
                serializer.save()
                created += 1

    return {
        "entity": spec.key,
        "label": spec.label,
        "company": company.pk,
        "commit": commit,
        "total_rows": len(rows),
        "ok": sum(1 for r in report if r["status"] == "ok"),
        "errors": sum(1 for r in report if r["status"] == "error"),
        "duplicates": sum(1 for r in report if r["status"] == "duplicate"),
        "created": created,
        "rows": report,
    }
