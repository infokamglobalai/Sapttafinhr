"""Posting Engine — the ONLY path that writes JournalLine rows.

Every business document defines a PostingPolicy that returns a list of
LineSpec objects. LedgerService.post() validates D=C, persists the
JournalEntry, and records the audit event.

Example:

    class SalesInvoicePolicy:
        def build_lines(self, invoice):
            return [
                Dr(invoice.customer_ar_account, invoice.grand_total),
                Cr(invoice.sales_account, invoice.taxable_value),
                Cr(invoice.cgst_payable, invoice.cgst),
                Cr(invoice.sgst_payable, invoice.sgst),
            ]

    LedgerService().post_document(invoice, SalesInvoicePolicy(), user=request.user)
"""
from dataclasses import dataclass
from datetime import date as _date
from decimal import Decimal
from typing import Protocol

from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from apps.core.money import to_money
from apps.masters.models import Account, Company, FiscalYear

from .models import JournalEntry, JournalLine


@dataclass(frozen=True)
class LineSpec:
    account: Account
    debit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")
    description: str = ""
    cost_center: str = ""
    project: str = ""
    party_id: int | None = None


def Dr(account: Account, amount, description: str = "", **kw) -> LineSpec:
    return LineSpec(account=account, debit=to_money(amount), description=description, **kw)


def Cr(account: Account, amount, description: str = "", **kw) -> LineSpec:
    return LineSpec(account=account, credit=to_money(amount), description=description, **kw)


class PostingPolicy(Protocol):
    def build_lines(self, document) -> list[LineSpec]: ...


class LedgerService:
    """Single entry point for posting to the ledger."""

    @transaction.atomic
    def post_document(
        self,
        document,
        policy: PostingPolicy,
        *,
        company: Company,
        fiscal_year: FiscalYear,
        voucher_no: str,
        entry_date: _date,
        narration: str = "",
        user=None,
    ) -> JournalEntry:
        """Build lines from policy, create a balanced JournalEntry, post it."""
        specs = policy.build_lines(document)
        if not specs:
            raise ValueError("Posting policy returned no lines.")

        ct = ContentType.objects.get_for_model(document.__class__)
        je = JournalEntry.objects.create(
            company=company,
            fiscal_year=fiscal_year,
            voucher_no=voucher_no,
            date=entry_date,
            narration=narration,
            source_content_type=ct,
            source_object_id=document.pk,
        )
        for spec in specs:
            JournalLine.objects.create(
                journal_entry=je,
                account=spec.account,
                debit=spec.debit,
                credit=spec.credit,
                description=spec.description,
                cost_center=spec.cost_center,
                project=spec.project,
                party_id=spec.party_id,
            )
        je.post(user=user)
        return je

    @transaction.atomic
    def post_manual(
        self,
        *,
        company: Company,
        fiscal_year: FiscalYear,
        voucher_no: str,
        entry_date: _date,
        narration: str,
        lines: list[LineSpec],
        user=None,
    ) -> JournalEntry:
        """Post a manual JE (no source document)."""
        if not lines:
            raise ValueError("Manual JE requires at least one line.")
        je = JournalEntry.objects.create(
            company=company,
            fiscal_year=fiscal_year,
            voucher_no=voucher_no,
            date=entry_date,
            narration=narration,
        )
        for spec in lines:
            JournalLine.objects.create(
                journal_entry=je,
                account=spec.account,
                debit=spec.debit,
                credit=spec.credit,
                description=spec.description,
                cost_center=spec.cost_center,
                project=spec.project,
                party_id=spec.party_id,
            )
        je.post(user=user)
        return je
