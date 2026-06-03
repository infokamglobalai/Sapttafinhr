"""Read-only report builders. All derive from JournalLine + business docs — no recompute."""
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Q, Sum

from apps.billing.models import Invoice
from apps.ledger.models import JournalEntry, JournalLine
from apps.masters.models import Account
from apps.payments.models import Receipt
from apps.procurement.models import VendorBill


# ---------- Profit & Loss ----------

def profit_and_loss(company_id: int, start: date, end: date) -> dict:
    qs = JournalLine.objects.filter(
        journal_entry__company_id=company_id,
        journal_entry__status=JournalEntry.Status.POSTED,
        journal_entry__date__gte=start,
        journal_entry__date__lte=end,
    )

    income = _classify(qs, Account.Type.INCOME, sign="credit")
    expense = _classify(qs, Account.Type.EXPENSE, sign="debit")
    total_income = sum((r["amount"] for r in income), Decimal("0"))
    total_expense = sum((r["amount"] for r in expense), Decimal("0"))

    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "income": income,
        "expense": expense,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": total_income - total_expense,
    }


# ---------- Balance Sheet ----------

def balance_sheet(company_id: int, as_of: date) -> dict:
    qs = JournalLine.objects.filter(
        journal_entry__company_id=company_id,
        journal_entry__status=JournalEntry.Status.POSTED,
        journal_entry__date__lte=as_of,
    )

    assets = _classify(qs, Account.Type.ASSET, sign="debit")
    liabilities = _classify(qs, Account.Type.LIABILITY, sign="credit")
    equity = _classify(qs, Account.Type.EQUITY, sign="credit")

    # Net profit up to date adds to equity (retained earnings flow)
    income_total = sum((r["amount"] for r in _classify(qs, Account.Type.INCOME, sign="credit")), Decimal("0"))
    expense_total = sum((r["amount"] for r in _classify(qs, Account.Type.EXPENSE, sign="debit")), Decimal("0"))
    retained = income_total - expense_total

    total_assets = sum((r["amount"] for r in assets), Decimal("0"))
    total_liab = sum((r["amount"] for r in liabilities), Decimal("0"))
    total_equity = sum((r["amount"] for r in equity), Decimal("0")) + retained

    return {
        "as_of": as_of.isoformat(),
        "assets": assets,
        "liabilities": liabilities,
        "equity": equity,
        "current_period_pl": retained,
        "total_assets": total_assets,
        "total_liabilities": total_liab,
        "total_equity": total_equity,
        "is_balanced": total_assets == (total_liab + total_equity),
    }


def _classify(qs, account_type: str, *, sign: str) -> list[dict]:
    """Return per-account balances for accounts of a given type.
    sign='debit' means natural balance is debit (debit-credit); 'credit' is the inverse.
    """
    grouped = (
        qs.filter(account__type=account_type, account__is_postable=True)
        .values("account_id", "account__code", "account__name")
        .annotate(d=Sum("debit"), c=Sum("credit"))
        .order_by("account__code")
    )
    rows: list[dict] = []
    for r in grouped:
        d = r["d"] or Decimal("0")
        c = r["c"] or Decimal("0")
        amount = (d - c) if sign == "debit" else (c - d)
        if amount == 0:
            continue
        rows.append({
            "account_id": r["account_id"],
            "code": r["account__code"],
            "name": r["account__name"],
            "amount": amount,
        })
    return rows


# ---------- Party Ledger ----------

def party_ledger(company_id: int, party_id: int, start: date, end: date) -> dict:
    """Statement of account for a customer/vendor."""
    qs = JournalLine.objects.filter(
        journal_entry__company_id=company_id,
        journal_entry__status=JournalEntry.Status.POSTED,
        party_id=party_id,
        journal_entry__date__gte=start,
        journal_entry__date__lte=end,
    ).select_related("journal_entry", "account").order_by("journal_entry__date", "id")

    rows = []
    running = Decimal("0")
    for ln in qs:
        running += (ln.debit - ln.credit)
        rows.append({
            "date": ln.journal_entry.date.isoformat(),
            "voucher_no": ln.journal_entry.voucher_no,
            "account": f"{ln.account.code} — {ln.account.name}",
            "narration": ln.description or ln.journal_entry.narration,
            "debit": ln.debit,
            "credit": ln.credit,
            "running_balance": running,
        })
    return {"party_id": party_id, "rows": rows, "closing_balance": running}


# ---------- AR Aging ----------

def ar_aging(company_id: int, as_of: date) -> dict:
    buckets = [("0-30", 0, 30), ("31-60", 31, 60), ("61-90", 61, 90), ("90+", 91, 999_999)]
    out = defaultdict(lambda: {"0-30": Decimal("0"), "31-60": Decimal("0"),
                               "61-90": Decimal("0"), "90+": Decimal("0"),
                               "total": Decimal("0"), "customer_name": ""})

    qs = Invoice.objects.filter(
        company_id=company_id,
        status=Invoice.Status.POSTED,
        date__lte=as_of,
    ).select_related("customer")

    for inv in qs:
        balance = inv.grand_total - inv.amount_paid
        if balance <= 0:
            continue
        days = (as_of - inv.date).days
        bucket = next((b[0] for b in buckets if b[1] <= days <= b[2]), "90+")
        row = out[inv.customer_id]
        row["customer_name"] = inv.customer.name
        row[bucket] += balance
        row["total"] += balance

    rows = [{"customer_id": k, **v} for k, v in out.items()]
    rows.sort(key=lambda r: r["total"], reverse=True)
    grand_total = sum((r["total"] for r in rows), Decimal("0"))
    return {"as_of": as_of.isoformat(), "rows": rows, "grand_total": grand_total}


# ---------- Sales Register ----------

def sales_register(company_id: int, start: date, end: date) -> dict:
    qs = (
        Invoice.objects.filter(
            company_id=company_id,
            status=Invoice.Status.POSTED,
            date__gte=start, date__lte=end,
        )
        .select_related("customer")
        .order_by("date", "id")
    )
    rows = [
        {
            "id": inv.id,
            "date": inv.date.isoformat(),
            "invoice_no": inv.invoice_no,
            "customer_name": inv.customer.name,
            "gstin": inv.customer.gstin,
            "place_of_supply": inv.place_of_supply,
            "taxable_amount": inv.taxable_amount,
            "cgst": inv.cgst, "sgst": inv.sgst, "igst": inv.igst,
            "grand_total": inv.grand_total,
            "amount_paid": inv.amount_paid,
            "balance_due": inv.grand_total - inv.amount_paid,
        }
        for inv in qs
    ]
    totals = {
        "taxable_amount": sum((r["taxable_amount"] for r in rows), Decimal("0")),
        "cgst": sum((r["cgst"] for r in rows), Decimal("0")),
        "sgst": sum((r["sgst"] for r in rows), Decimal("0")),
        "igst": sum((r["igst"] for r in rows), Decimal("0")),
        "grand_total": sum((r["grand_total"] for r in rows), Decimal("0")),
    }
    return {"period": {"start": start.isoformat(), "end": end.isoformat()},
            "rows": rows, "totals": totals}


# ---------- Dashboard KPIs ----------

def dashboard(company_id: int, today: date) -> dict:
    month_start = today.replace(day=1)
    last_30 = today - timedelta(days=30)

    # Cash position = sum balance of all Cash + Bank type accounts (codes 1110 + 11xx in bank tree)
    cash_balance = _cash_balance(company_id, today)

    # AR / AP
    ar = _control_balance(company_id, "1130", today, side="debit")
    ap = _control_balance(company_id, "2110", today, side="credit")

    # MTD income/expense (from posted JE)
    mtd_income = _type_total(company_id, Account.Type.INCOME, month_start, today, side="credit")
    mtd_expense = _type_total(company_id, Account.Type.EXPENSE, month_start, today, side="debit")

    # Overdue invoices (due_date < today, balance > 0)
    overdue = Invoice.objects.filter(
        company_id=company_id,
        status=Invoice.Status.POSTED,
        due_date__lt=today,
    ).filter(grand_total__gt=Sum("amount_paid"))  # approximate; refined below
    # Cleaner approach:
    overdue_invoices = [
        i for i in Invoice.objects.filter(
            company_id=company_id,
            status=Invoice.Status.POSTED,
            due_date__lt=today,
        ) if (i.grand_total - i.amount_paid) > 0
    ]
    overdue_amount = sum((i.grand_total - i.amount_paid for i in overdue_invoices), Decimal("0"))

    # Recent activity
    recent_invoices = Invoice.objects.filter(
        company_id=company_id, date__gte=last_30,
    ).select_related("customer").order_by("-date", "-id")[:5]
    recent_receipts = Receipt.objects.filter(
        company_id=company_id, date__gte=last_30,
    ).select_related("customer").order_by("-date", "-id")[:5]

    # Revenue trend — last 6 months (income from JE)
    revenue_trend = _monthly_revenue_trend(company_id, today, months=6)

    # Cash flow forecast — next 60 days from outstanding invoices/bills
    cashflow_forecast = _cashflow_forecast(company_id, today, cash_balance, horizon_days=60)

    # GST dues this month (CGST+SGST+IGST on sales)
    gst_dues = _gst_dues_mtd(company_id, month_start, today)

    # Top overdue invoices (up to 5)
    top_overdue = sorted(overdue_invoices, key=lambda i: i.grand_total - i.amount_paid, reverse=True)[:5]

    # Top 5 customers by revenue MTD
    top_customers = _top_customers(company_id, month_start, today)

    return {
        "as_of": today.isoformat(),
        "cash_balance": cash_balance,
        "accounts_receivable": ar,
        "accounts_payable": ap,
        "mtd_income": mtd_income,
        "mtd_expense": mtd_expense,
        "mtd_net": mtd_income - mtd_expense,
        "overdue_count": len(overdue_invoices),
        "overdue_amount": overdue_amount,
        "gst_dues": gst_dues,
        "revenue_trend": revenue_trend,
        "cashflow_forecast": cashflow_forecast,
        "top_customers": top_customers,
        "top_overdue_invoices": [
            {
                "id": i.id, "invoice_no": i.invoice_no, "date": i.date.isoformat(),
                "due_date": i.due_date.isoformat() if i.due_date else None,
                "customer": i.customer.name,
                "customer_email": getattr(i.customer, "email", ""),
                "amount": str(i.grand_total),
                "balance_due": str(i.grand_total - i.amount_paid),
                "days_overdue": (today - i.due_date).days if i.due_date else 0,
            }
            for i in top_overdue
        ],
        "recent_invoices": [
            {"id": i.id, "invoice_no": i.invoice_no, "date": i.date.isoformat(),
             "customer": i.customer.name, "amount": i.grand_total,
             "balance_due": i.grand_total - i.amount_paid}
            for i in recent_invoices
        ],
        "recent_receipts": [
            {"id": r.id, "receipt_no": r.receipt_no, "date": r.date.isoformat(),
             "customer": r.customer.name, "amount": r.amount}
            for r in recent_receipts
        ],
    }


def _monthly_revenue_trend(company_id: int, today: date, months: int = 6) -> list:
    """Return monthly income totals for the last N months."""
    result = []
    for i in range(months - 1, -1, -1):
        # Go back i months
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        from calendar import monthrange
        start = date(year, month, 1)
        end = date(year, month, monthrange(year, month)[1])
        income = _type_total(company_id, Account.Type.INCOME, start, end, side="credit")
        expense = _type_total(company_id, Account.Type.EXPENSE, start, end, side="debit")
        result.append({
            "month": start.strftime("%b %Y"),
            "income": str(income),
            "expense": str(expense),
            "net": str(income - expense),
        })
    return result


def _cashflow_forecast(company_id: int, today: date, current_cash: Decimal, horizon_days: int = 60) -> list:
    """Day-by-day cumulative cash forecast from outstanding invoices and vendor bills."""
    horizon = today + timedelta(days=horizon_days)
    daily = defaultdict(Decimal)

    # Expected inflows from open invoices
    for inv in Invoice.objects.filter(
        company_id=company_id,
        status=Invoice.Status.POSTED,
        due_date__gte=today,
        due_date__lte=horizon,
    ):
        balance = inv.grand_total - inv.amount_paid
        if balance > 0:
            daily[inv.due_date] += balance

    # Expected outflows from open vendor bills
    try:
        for bill in VendorBill.objects.filter(
            company_id=company_id,
            status__in=["POSTED", "PARTIAL"],
            due_date__gte=today,
            due_date__lte=horizon,
        ):
            balance = bill.grand_total - bill.amount_paid
            if balance > 0:
                daily[bill.due_date] -= balance
    except Exception:
        pass  # VendorBill schema may differ

    # Build cumulative series (weekly buckets for readability)
    result = []
    running = current_cash
    check = today
    while check <= horizon:
        running += daily.get(check, Decimal("0"))
        # Only include week boundaries + today
        if check == today or check.weekday() == 0 or check == horizon:
            result.append({
                "date": check.isoformat(),
                "label": check.strftime("%d %b"),
                "balance": str(running),
            })
        check += timedelta(days=1)
    return result


def _gst_dues_mtd(company_id: int, start: date, end: date) -> dict:
    """Sum CGST/SGST/IGST output tax on sales invoices for the period."""
    invoices = Invoice.objects.filter(
        company_id=company_id,
        status=Invoice.Status.POSTED,
        date__gte=start,
        date__lte=end,
    )
    totals = invoices.aggregate(
        cgst=Sum("cgst"),
        sgst=Sum("sgst"),
        igst=Sum("igst"),
    )
    cgst = totals["cgst"] or Decimal("0")
    sgst = totals["sgst"] or Decimal("0")
    igst = totals["igst"] or Decimal("0")
    return {
        "cgst": str(cgst),
        "sgst": str(sgst),
        "igst": str(igst),
        "total": str(cgst + sgst + igst),
    }


def _top_customers(company_id: int, start: date, end: date, limit: int = 5) -> list:
    """Top customers by billed amount in the period."""
    invoices = Invoice.objects.filter(
        company_id=company_id,
        status=Invoice.Status.POSTED,
        date__gte=start,
        date__lte=end,
    ).select_related("customer")
    by_customer: dict = defaultdict(Decimal)
    for inv in invoices:
        by_customer[inv.customer.name] += inv.grand_total
    sorted_customers = sorted(by_customer.items(), key=lambda x: x[1], reverse=True)[:limit]
    return [{"customer": name, "amount": str(amt)} for name, amt in sorted_customers]


def _cash_balance(company_id: int, as_of: date) -> Decimal:
    """Sum of all postable Asset accounts under codes 1110, 1120, 1121 (Cash + Bank)."""
    cash_codes = ["1110", "1121"]
    qs = JournalLine.objects.filter(
        journal_entry__company_id=company_id,
        journal_entry__status=JournalEntry.Status.POSTED,
        journal_entry__date__lte=as_of,
        account__code__in=cash_codes,
    )
    agg = qs.aggregate(d=Sum("debit"), c=Sum("credit"))
    return (agg["d"] or Decimal("0")) - (agg["c"] or Decimal("0"))


def _control_balance(company_id: int, code: str, as_of: date, *, side: str) -> Decimal:
    qs = JournalLine.objects.filter(
        journal_entry__company_id=company_id,
        journal_entry__status=JournalEntry.Status.POSTED,
        journal_entry__date__lte=as_of,
        account__code=code,
    )
    agg = qs.aggregate(d=Sum("debit"), c=Sum("credit"))
    d, c = agg["d"] or Decimal("0"), agg["c"] or Decimal("0")
    return (d - c) if side == "debit" else (c - d)


def cash_flow(company_id: int, start: date, end: date) -> dict:
    """Indirect-method-lite cash flow: net change in cash + bank balances over period."""
    opening = _cash_balance(company_id, start)
    closing = _cash_balance(company_id, end)
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "opening_cash": opening,
        "closing_cash": closing,
        "net_change": closing - opening,
    }


def day_book(company_id: int, on_date: date) -> list[dict]:
    """All JE lines on a given day."""
    qs = JournalLine.objects.filter(
        journal_entry__company_id=company_id,
        journal_entry__status=JournalEntry.Status.POSTED,
        journal_entry__date=on_date,
    ).select_related("journal_entry", "account").order_by("journal_entry__voucher_no", "id")
    return [
        {
            "voucher_no": l.journal_entry.voucher_no,
            "account": f"{l.account.code} — {l.account.name}",
            "narration": l.description or l.journal_entry.narration,
            "debit": str(l.debit), "credit": str(l.credit),
        }
        for l in qs
    ]


def cost_center_pnl(company_id: int, start: date, end: date) -> list[dict]:
    """Income/Expense grouped by cost_center dimension."""
    qs = JournalLine.objects.filter(
        journal_entry__company_id=company_id,
        journal_entry__status=JournalEntry.Status.POSTED,
        journal_entry__date__gte=start,
        journal_entry__date__lte=end,
        account__type__in=[Account.Type.INCOME, Account.Type.EXPENSE],
    ).exclude(cost_center="")
    agg = qs.values("cost_center", "account__type").annotate(
        d=Sum("debit"), c=Sum("credit"),
    )
    out: dict[str, dict] = {}
    for r in agg:
        cc = r["cost_center"]
        slot = out.setdefault(cc, {"cost_center": cc, "income": Decimal("0"), "expense": Decimal("0")})
        if r["account__type"] == Account.Type.INCOME:
            slot["income"] += (r["c"] or 0) - (r["d"] or 0)
        else:
            slot["expense"] += (r["d"] or 0) - (r["c"] or 0)
    rows = list(out.values())
    for r in rows:
        r["net"] = r["income"] - r["expense"]
    return sorted(rows, key=lambda r: r["cost_center"])


def consolidation_pnl(tenant_company_ids: list[int], start: date, end: date) -> dict:
    """P&L summed across multiple companies. Used in multi-company tenants."""
    totals = {"income": Decimal("0"), "expense": Decimal("0"), "net": Decimal("0"),
              "by_company": []}
    for cid in tenant_company_ids:
        pnl = profit_and_loss(cid, start, end)
        totals["income"] += pnl["total_income"]
        totals["expense"] += pnl["total_expense"]
        totals["net"] += pnl["net_profit"]
        totals["by_company"].append({
            "company_id": cid,
            "income": pnl["total_income"],
            "expense": pnl["total_expense"],
            "net": pnl["net_profit"],
        })
    return totals


def budget_vs_actual(company_id: int, fiscal_year_id: int) -> list[dict]:
    """Budget vs actual per account for the fiscal year."""
    from apps.expenses.models import Budget

    budgets = Budget.objects.filter(
        company_id=company_id, fiscal_year_id=fiscal_year_id,
    ).select_related("account")
    rows = []
    for b in budgets:
        actual_qs = JournalLine.objects.filter(
            journal_entry__company_id=company_id,
            journal_entry__status=JournalEntry.Status.POSTED,
            journal_entry__date__gte=b.period_start,
            journal_entry__date__lte=b.period_end,
            account=b.account,
        ).aggregate(d=Sum("debit"), c=Sum("credit"))
        d = actual_qs["d"] or Decimal("0")
        c = actual_qs["c"] or Decimal("0")
        actual = (d - c) if b.account.type == Account.Type.EXPENSE else (c - d)
        rows.append({
            "account_code": b.account.code,
            "account_name": b.account.name,
            "period_start": b.period_start.isoformat(),
            "period_end": b.period_end.isoformat(),
            "budget": b.amount,
            "actual": actual,
            "variance": b.amount - actual,
            "variance_pct": float((actual / b.amount * 100) if b.amount else 0),
        })
    return rows


def audit_log(company_id: int, limit: int = 200) -> list[dict]:
    """Recent edits across all historized models (uses simple_history)."""
    from apps.masters.models import Account, Company
    from apps.billing.models import Invoice
    # Aggregate latest history rows from key models.
    rows = []
    for model in [Invoice, Account]:
        try:
            qs = model.history.all().order_by("-history_date")[:limit]
            for h in qs:
                rows.append({
                    "model": model.__name__,
                    "object_id": h.id,
                    "action": h.history_type,
                    "user": str(h.history_user) if h.history_user else "—",
                    "date": h.history_date.isoformat(),
                })
        except Exception:
            continue
    return sorted(rows, key=lambda r: r["date"], reverse=True)[:limit]


def _type_total(company_id: int, type_: str, start: date, end: date, *, side: str) -> Decimal:
    qs = JournalLine.objects.filter(
        journal_entry__company_id=company_id,
        journal_entry__status=JournalEntry.Status.POSTED,
        journal_entry__date__gte=start,
        journal_entry__date__lte=end,
        account__type=type_,
    )
    agg = qs.aggregate(d=Sum("debit"), c=Sum("credit"))
    d, c = agg["d"] or Decimal("0"), agg["c"] or Decimal("0")
    return (c - d) if side == "credit" else (d - c)


def receivables_risk(company_id: int) -> list:
    """Risk score per active customer based on payment history."""
    from apps.masters.models import Party
    from apps.billing.models import Invoice
    from apps.payments.models import Receipt

    today = date.today()
    customers = Party.objects.filter(company_id=company_id, kind__in=["CUSTOMER", "BOTH"], is_active=True)
    result = []

    for c in customers:
        invoices = Invoice.objects.filter(company_id=company_id, customer=c, status=Invoice.Status.POSTED)
        total_invoiced = invoices.aggregate(t=Sum("grand_total"))["t"] or Decimal("0")
        overdue_count = sum(1 for i in invoices if i.grand_total - i.amount_paid > 0 and i.due_date and i.due_date < today)
        outstanding = sum((i.grand_total - i.amount_paid for i in invoices if i.grand_total - i.amount_paid > 0), Decimal("0"))

        # Average days to pay from paid receipts
        paid_invoices = [i for i in invoices if i.amount_paid >= i.grand_total and i.due_date]
        avg_days_late = 0
        if paid_invoices:
            receipts = Receipt.objects.filter(company_id=company_id, customer=c).order_by("date")
            # Simple proxy: compare invoice due dates to receipt dates
            delays = []
            for inv in paid_invoices[:20]:  # sample last 20
                receipt = receipts.filter(date__gte=inv.date).first()
                if receipt and inv.due_date:
                    delays.append(max(0, (receipt.date - inv.due_date).days))
            if delays:
                avg_days_late = sum(delays) / len(delays)

        # Score
        score = 0
        if avg_days_late > 30: score += 40
        elif avg_days_late > 10: score += 20
        if overdue_count > 3: score += 30
        elif overdue_count > 1: score += 15
        credit_limit = c.credit_limit or Decimal("0")
        if credit_limit > 0 and outstanding > credit_limit * Decimal("0.9"): score += 20
        score = min(100, score)

        risk = "HIGH" if score >= 60 else "MEDIUM" if score >= 30 else "LOW"
        result.append({
            "customer_id": c.id,
            "customer": c.name,
            "risk": risk,
            "score": score,
            "outstanding": str(outstanding),
            "overdue_count": overdue_count,
            "avg_days_late": round(avg_days_late, 1),
            "credit_limit": str(credit_limit),
        })

    return sorted(result, key=lambda x: x["score"], reverse=True)
