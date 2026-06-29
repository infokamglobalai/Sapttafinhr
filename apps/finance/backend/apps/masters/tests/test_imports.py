"""Master-data CSV import — template, dry-run vs commit, validation, dedupe, parents."""
import pytest

from apps.masters.imports import ENTITIES, run_import, template_csv
from apps.masters.models import Account, Company, HSNCode, Item, Party


# ── Template (pure, no DB) ────────────────────────────────────────────────────

def test_party_template_has_headers_and_example_row():
    lines = template_csv("party").strip().splitlines()
    assert lines[0].split(",")[:2] == ["name", "kind"]
    assert "Acme Industries" in lines[1]


def test_account_template_lists_required_columns_first():
    assert ENTITIES["account"].headers[:3] == ["code", "name", "type"]


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def company(db):
    return Company.objects.create(name="Import Test Co", base_currency="INR")


# ── Party import ──────────────────────────────────────────────────────────────

def test_dry_run_reports_without_writing(company):
    rows = [
        {"name": "Good Customer", "kind": "customer", "email": "a@b.com"},
        {"name": "", "kind": "VENDOR"},  # missing required name
    ]
    report = run_import(company=company, entity_key="party", rows=rows, commit=False)

    assert (report["ok"], report["errors"], report["created"]) == (1, 1, 0)
    assert Party.objects.filter(company=company).count() == 0
    assert report["rows"][0]["row"] == 2 and report["rows"][0]["status"] == "ok"
    assert report["rows"][1]["status"] == "error"


def test_commit_creates_only_clean_rows(company):
    rows = [
        {"name": "Cust A", "kind": "customer"},
        {"name": "Bad Email", "kind": "customer", "email": "not-an-email"},
    ]
    report = run_import(company=company, entity_key="party", rows=rows, commit=True)

    assert (report["created"], report["errors"]) == (1, 1)
    party = Party.objects.get(company=company)
    assert party.name == "Cust A"
    assert party.kind == "CUSTOMER"  # lower-case input was normalised


def test_party_kind_defaults_to_customer(company):
    report = run_import(
        company=company, entity_key="party", rows=[{"name": "No Kind"}], commit=True
    )
    assert report["created"] == 1
    assert Party.objects.get(company=company).kind == "CUSTOMER"


def test_party_duplicate_detection_db_and_batch(company):
    Party.objects.create(company=company, name="Dup Co", kind="CUSTOMER")
    rows = [
        {"name": "Dup Co", "kind": "customer"},   # already in the DB
        {"name": "Fresh", "kind": "customer"},
        {"name": "Fresh", "kind": "customer"},     # duplicate within this batch
    ]
    report = run_import(company=company, entity_key="party", rows=rows, commit=True)

    assert report["duplicates"] == 2
    assert report["created"] == 1


# ── Account import ────────────────────────────────────────────────────────────

def test_account_invalid_type_is_error(company):
    rows = [{"code": "9999", "name": "Mystery", "type": "BOGUS"}]
    report = run_import(company=company, entity_key="account", rows=rows, commit=True)

    assert (report["errors"], report["created"]) == (1, 0)


def test_account_parent_resolution(company):
    parent = Account.objects.create(company=company, code="4000", name="Income", type="INCOME")
    rows = [
        {"code": "4100", "name": "Product Sales", "type": "INCOME", "parent_code": "4000"},
        {"code": "4200", "name": "Service Sales", "type": "INCOME", "parent_code": "9000"},  # unknown
    ]
    report = run_import(company=company, entity_key="account", rows=rows, commit=True)

    assert report["created"] == 2
    assert Account.objects.get(company=company, code="4100").parent_id == parent.id
    assert Account.objects.get(company=company, code="4200").parent_id is None
    orphan_row = next(r for r in report["rows"] if r["row"] == 3)
    assert any("not found" in m for m in orphan_row["messages"])


def test_account_duplicate_code_skipped(company):
    Account.objects.create(company=company, code="1000", name="Cash", type="ASSET")
    rows = [{"code": "1000", "name": "Cash Again", "type": "ASSET"}]
    report = run_import(company=company, entity_key="account", rows=rows, commit=True)

    assert report["duplicates"] == 1
    assert report["created"] == 0
    assert Account.objects.get(company=company, code="1000").name == "Cash"  # original untouched


# ── Item import (FK resolution via the generalised fk_lookups) ────────────────

def test_item_template_lists_required_columns_first():
    assert ENTITIES["item"].headers[:2] == ["sku", "name"]


def test_item_commit_resolves_hsn_and_normalises_kind(company):
    hsn = HSNCode.objects.create(company=company, code="8479", description="Machines")
    rows = [
        {"sku": "W-1", "name": "Widget", "kind": "goods", "hsn_code": "8479", "sale_price": "100", "tax_rate": "18"},
        {"sku": "S-1", "name": "Service", "kind": "service", "hsn_code": "9999"},  # unknown HSN
    ]
    report = run_import(company=company, entity_key="item", rows=rows, commit=True)

    assert report["created"] == 2
    w = Item.objects.get(company=company, sku="W-1")
    assert w.hsn_id == hsn.id and w.kind == "GOODS"
    assert Item.objects.get(company=company, sku="S-1").hsn_id is None
    unknown = next(r for r in report["rows"] if r["row"] == 3)
    assert any("not found" in m for m in unknown["messages"])


def test_item_requires_sku_and_name(company):
    rows = [{"sku": "", "name": "No SKU"}, {"sku": "X-1", "name": ""}]
    report = run_import(company=company, entity_key="item", rows=rows, commit=False)
    assert (report["ok"], report["errors"]) == (0, 2)


def test_item_duplicate_sku_skipped(company):
    Item.objects.create(company=company, sku="DUP", name="Existing")
    report = run_import(company=company, entity_key="item", rows=[{"sku": "DUP", "name": "Again"}], commit=True)
    assert (report["duplicates"], report["created"]) == (1, 0)
