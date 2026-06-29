"""Opening-balance import → a single balanced opening journal entry."""
from datetime import date

import pytest

from apps.ledger.models import JournalEntry
from apps.masters.models import Account, Company, FiscalYear
from apps.masters.opening_balances import opening_template_csv, run_opening_balances


@pytest.fixture
def company(db):
    return Company.objects.create(name="OB Test Co", base_currency="INR")


@pytest.fixture
def fy(company):
    return FiscalYear.objects.create(
        company=company, name="FY25-26",
        start_date=date(2025, 4, 1), end_date=date(2026, 3, 31), is_active=True,
    )


@pytest.fixture
def accounts(company):
    cash = Account.objects.create(company=company, code="1110", name="Cash", type="ASSET")
    capital = Account.objects.create(company=company, code="2110", name="Capital", type="EQUITY")
    return cash, capital


# ── Template (pure) ───────────────────────────────────────────────────────────

def test_template_has_columns_and_examples():
    lines = opening_template_csv().strip().splitlines()
    assert lines[0].split(",")[:3] == ["account_code", "debit", "credit"]
    assert len(lines) >= 3  # header + ≥2 example rows


# ── Dry-run / commit ──────────────────────────────────────────────────────────

def test_dry_run_balanced_writes_nothing(company, fy, accounts):
    rows = [
        {"account_code": "1110", "debit": "500000", "credit": ""},
        {"account_code": "2110", "debit": "", "credit": "500000"},
    ]
    report = run_opening_balances(company=company, fiscal_year=fy, rows=rows, commit=False)

    assert report["balanced"] is True
    assert (report["ok"], report["errors"]) == (2, 0)
    assert report["total_debit"] == "500000" and report["total_credit"] == "500000"
    assert report["posted_voucher"] is None
    assert JournalEntry.objects.filter(company=company).count() == 0


def test_commit_posts_one_opening_entry(company, fy, accounts):
    rows = [
        {"account_code": "1110", "debit": "500000"},
        {"account_code": "2110", "credit": "500000"},
    ]
    report = run_opening_balances(company=company, fiscal_year=fy, rows=rows, commit=True)

    assert report["posted_voucher"] == "OPENING-FY25-26"
    je = JournalEntry.objects.get(company=company, voucher_no="OPENING-FY25-26")
    assert je.status == JournalEntry.Status.POSTED
    assert je.lines.count() == 2
    assert je.date == fy.start_date


def test_unbalanced_blocks_commit(company, fy, accounts):
    rows = [
        {"account_code": "1110", "debit": "500000"},
        {"account_code": "2110", "credit": "400000"},
    ]
    report = run_opening_balances(company=company, fiscal_year=fy, rows=rows, commit=True)

    assert report["balanced"] is False
    assert report["difference"] == "100000"
    assert report["posted_voucher"] is None
    assert "does not balance" in report.get("error", "")
    assert JournalEntry.objects.filter(company=company).count() == 0


# ── Row validation ────────────────────────────────────────────────────────────

def test_unknown_account_is_error(company, fy, accounts):
    rows = [
        {"account_code": "9999", "debit": "1000"},
        {"account_code": "2110", "credit": "1000"},
    ]
    report = run_opening_balances(company=company, fiscal_year=fy, rows=rows, commit=False)

    assert report["errors"] == 1 and report["balanced"] is False
    bad = next(r for r in report["rows"] if r["row"] == 2)
    assert any("not found" in m for m in bad["messages"])


def test_non_postable_account_is_error(company, fy):
    Account.objects.create(company=company, code="1000", name="Assets (group)", type="ASSET", is_postable=False)
    Account.objects.create(company=company, code="2110", name="Capital", type="EQUITY")
    rows = [
        {"account_code": "1000", "debit": "1000"},
        {"account_code": "2110", "credit": "1000"},
    ]
    report = run_opening_balances(company=company, fiscal_year=fy, rows=rows, commit=False)

    grp = next(r for r in report["rows"] if r["row"] == 2)
    assert any("group/header" in m for m in grp["messages"])


def test_both_debit_and_credit_is_error(company, fy, accounts):
    rows = [{"account_code": "1110", "debit": "100", "credit": "100"}]
    report = run_opening_balances(company=company, fiscal_year=fy, rows=rows, commit=False)

    assert report["rows"][0]["status"] == "error"
    assert any("both" in m for m in report["rows"][0]["messages"])


def test_idempotent_second_commit_blocked(company, fy, accounts):
    rows = [
        {"account_code": "1110", "debit": "500000"},
        {"account_code": "2110", "credit": "500000"},
    ]
    first = run_opening_balances(company=company, fiscal_year=fy, rows=rows, commit=True)
    assert first["posted_voucher"] == "OPENING-FY25-26"

    second = run_opening_balances(company=company, fiscal_year=fy, rows=rows, commit=True)
    assert second["posted_voucher"] is None
    assert "already exists" in second.get("error", "")
    assert JournalEntry.objects.filter(company=company, voucher_no="OPENING-FY25-26").count() == 1
