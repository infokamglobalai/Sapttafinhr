"""Tests for the double-entry invariant. Without this, the system is meaningless."""
from datetime import date
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from apps.ledger.models import JournalEntry, JournalLine
from apps.ledger.posting import Cr, Dr, LedgerService
from apps.masters.coa_template import seed_coa
from apps.masters.models import Company, FiscalYear


@pytest.fixture
def company(db):
    return Company.objects.create(name="TestCo", base_currency="INR")


@pytest.fixture
def coa(company):
    return seed_coa(company)


@pytest.fixture
def fy(company):
    return FiscalYear.objects.create(
        company=company, name="FY25-26",
        start_date=date(2025, 4, 1), end_date=date(2026, 3, 31),
    )


def test_balanced_manual_entry_posts_ok(company, coa, fy):
    cash = coa["1110"]
    sales = coa["4100"]
    svc = LedgerService()
    je = svc.post_manual(
        company=company, fiscal_year=fy,
        voucher_no="JV-0001", entry_date=date(2025, 5, 1),
        narration="Cash sale", lines=[
            Dr(cash, Decimal("1000")),
            Cr(sales, Decimal("1000")),
        ],
    )
    assert je.status == JournalEntry.Status.POSTED
    assert je.lines.count() == 2
    d, c = je._sum_lines()
    assert d == c == Decimal("1000")


def test_unbalanced_entry_rejected(company, coa, fy):
    cash = coa["1110"]
    sales = coa["4100"]
    svc = LedgerService()
    with pytest.raises(ValidationError):
        svc.post_manual(
            company=company, fiscal_year=fy,
            voucher_no="JV-BAD", entry_date=date(2025, 5, 1),
            narration="bad", lines=[
                Dr(cash, Decimal("1000")),
                Cr(sales, Decimal("999")),
            ],
        )


def test_cannot_post_to_group_account(company, coa, fy):
    group = coa["1000"]   # Assets — header, is_postable=False
    cash = coa["1110"]
    svc = LedgerService()
    with pytest.raises(ValidationError):
        svc.post_manual(
            company=company, fiscal_year=fy,
            voucher_no="JV-GRP", entry_date=date(2025, 5, 1),
            narration="bad", lines=[
                Dr(group, Decimal("100")),
                Cr(cash, Decimal("100")),
            ],
        )


def test_period_lock_blocks_entry(company, coa, fy):
    company.books_closed_until = date(2025, 6, 30)
    company.save()
    cash = coa["1110"]
    sales = coa["4100"]
    svc = LedgerService()
    with pytest.raises(ValidationError):
        svc.post_manual(
            company=company, fiscal_year=fy,
            voucher_no="JV-LOCK", entry_date=date(2025, 5, 1),
            narration="locked", lines=[
                Dr(cash, Decimal("100")),
                Cr(sales, Decimal("100")),
            ],
        )


def test_line_cannot_have_both_debit_and_credit(company, coa, fy):
    cash = coa["1110"]
    sales = coa["4100"]
    je = JournalEntry.objects.create(
        company=company, fiscal_year=fy,
        voucher_no="JV-X1", date=date(2025, 5, 1), narration="x",
    )
    with pytest.raises(ValidationError):
        JournalLine.objects.create(
            journal_entry=je, account=cash, debit=Decimal("100"), credit=Decimal("100"),
        )
