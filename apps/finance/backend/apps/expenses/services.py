"""Expense Claim approval + reimbursement flow."""
from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.core.money import to_money
from apps.ledger.posting import Cr, Dr, LedgerService
from apps.masters.coa_template import account_by_code

from .models import ExpenseClaim, ExpenseClaimLine


@transaction.atomic
def submit_claim(claim: ExpenseClaim) -> ExpenseClaim:
    if claim.status != ExpenseClaim.Status.DRAFT:
        raise ValidationError("Only DRAFT claims can be submitted.")
    claim.total = sum((l.amount for l in claim.lines.all()), Decimal("0"))
    claim.status = ExpenseClaim.Status.SUBMITTED
    claim.save(update_fields=["total", "status", "updated_at"])
    return claim


@transaction.atomic
def approve_claim(claim: ExpenseClaim, *, approver, reimburse_account_code: str = "2110") -> ExpenseClaim:
    """Approve + post JE.
       Dr expense accounts (per line)
       Cr Employee Reimbursement Payable (using AP account by default)
    """
    if claim.status not in (ExpenseClaim.Status.SUBMITTED, ExpenseClaim.Status.DRAFT):
        raise ValidationError("Claim already processed.")

    company = claim.company
    lines = list(claim.lines.all())
    if not lines:
        raise ValidationError("No expense lines.")

    payable = account_by_code(company, reimburse_account_code)
    je_lines = []
    for l in lines:
        je_lines.append(Dr(l.expense_account, l.amount,
                           description=l.description,
                           cost_center=str(l.cost_center.code) if l.cost_center else "",
                           project=str(l.project.code) if l.project else ""))
    je_lines.append(Cr(payable, claim.total,
                        description=f"Claim {claim.claim_no} reimbursement payable"))

    je = LedgerService().post_manual(
        company=company, fiscal_year=claim.fiscal_year,
        voucher_no=f"EXP-{claim.claim_no}",
        entry_date=claim.date, narration=f"Expense claim by {claim.employee.email}",
        lines=je_lines, user=approver,
    )
    claim.status = ExpenseClaim.Status.APPROVED
    claim.approved_by = approver
    claim.approved_at = timezone.now()
    claim.journal_entry = je
    claim.save(update_fields=["status", "approved_by", "approved_at",
                               "journal_entry", "updated_at"])
    return claim


def reject_claim(claim: ExpenseClaim, *, reason: str) -> ExpenseClaim:
    claim.status = ExpenseClaim.Status.REJECTED
    claim.rejection_reason = reason
    claim.save(update_fields=["status", "rejection_reason", "updated_at"])
    return claim
