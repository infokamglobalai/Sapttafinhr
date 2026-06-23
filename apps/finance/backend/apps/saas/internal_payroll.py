"""Internal payroll journal posting — HR → Finance ledger sync (Complete plan)."""
from __future__ import annotations

import hmac
import json
from datetime import date
from decimal import Decimal

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods


def _authorized(request) -> bool:
    from django.conf import settings

    secret = getattr(settings, "SSO_SHARED_SECRET", "")
    if not secret:
        return False
    header = request.headers.get("Authorization", "")
    presented = header[7:] if header.startswith("Bearer ") else ""
    return bool(presented) and hmac.compare_digest(presented, secret)


@require_http_methods(["POST"])
def payroll_journal(request):
    """POST /api/v1/saas/internal/payroll-journal/  (Bearer SSO_SHARED_SECRET)."""
    if not _authorized(request):
        return JsonResponse({"detail": "Unauthorized."}, status=401)

    try:
        data = json.loads(request.body.decode() or "{}")
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    workspace = (data.get("workspace") or "").strip().lower()
    voucher_no = (data.get("voucher_no") or "").strip()
    lines = data.get("lines") or []
    if not workspace or not voucher_no or not lines:
        return JsonResponse({"detail": "workspace, voucher_no, and lines are required."}, status=400)

    try:
        entry_date = date.fromisoformat(str(data.get("entry_date"))[:10])
    except (TypeError, ValueError):
        return JsonResponse({"detail": "entry_date must be ISO format (YYYY-MM-DD)."}, status=400)

    from apps.core.models import Tenant as FinTenant
    from django_tenants.utils import schema_context

    fin_tenant = FinTenant.objects.filter(schema_name=workspace).first()
    if not fin_tenant:
        return JsonResponse({"detail": "Unknown finance workspace."}, status=404)

    with schema_context(fin_tenant.schema_name):
        from apps.ledger.models import JournalEntry
        from apps.ledger.posting import Cr, Dr, LedgerService
        from apps.masters.coa_template import ensure_account
        from apps.masters.models import Company, FiscalYear

        company = Company.objects.filter(is_active=True).order_by("id").first()
        if not company:
            return JsonResponse({"detail": "No active company in finance workspace."}, status=400)

        existing = JournalEntry.objects.filter(company=company, voucher_no=voucher_no).first()
        if existing:
            return JsonResponse({
                "detail": "Payroll journal already posted.",
                "already_posted": True,
                "journal_entry_id": existing.id,
                "voucher_no": existing.voucher_no,
            })

        fiscal_year = (
            FiscalYear.objects.filter(company=company, is_active=True).order_by("-start_date").first()
            or FiscalYear.objects.filter(company=company).order_by("-start_date").first()
        )
        if not fiscal_year:
            return JsonResponse({"detail": "No fiscal year configured in finance."}, status=400)

        je_lines = []
        for row in lines:
            code = row.get("code", "")
            name = row.get("name", code)
            type_ = row.get("type", "EXPENSE")
            parent = row.get("parent_code")
            side = row.get("side", "")
            amount = Decimal(str(row.get("amount") or "0"))
            if amount <= 0 or side not in ("debit", "credit"):
                continue
            account = ensure_account(company, code, name, type_, parent)
            desc = row.get("description") or name
            if side == "debit":
                je_lines.append(Dr(account, amount, description=desc))
            else:
                je_lines.append(Cr(account, amount, description=desc))

        if not je_lines:
            return JsonResponse({"detail": "No valid journal lines."}, status=400)

        narration = (data.get("narration") or "").strip() or f"Payroll journal {voucher_no}"
        je = LedgerService().post_manual(
            company=company,
            fiscal_year=fiscal_year,
            voucher_no=voucher_no,
            entry_date=entry_date,
            narration=narration,
            lines=je_lines,
        )

        return JsonResponse({
            "journal_entry_id": je.id,
            "voucher_no": je.voucher_no,
            "workspace": workspace,
            "company": company.name,
        })
