"""Finance AI Assistant — natural language interface for accounting queries.

Uses Claude API with tool use to answer finance questions and take actions.
"""
from __future__ import annotations

import logging
from datetime import date

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the fin-saptta Finance Assistant — an expert AI accountant embedded in the accounting system.
You help finance teams with:
- GST queries (liabilities, GSTR-1/3B, HSN summaries)
- Outstanding receivables and payables
- P&L and cash position queries
- Drafting payment reminder emails
- Ledger queries (trial balance, account balances)
- Creating journal entries, invoice summaries

Be precise with numbers, always mention INR (₹), and format amounts clearly.
Today's date: {today}
Company: {company_name}
User: {user_email}
"""

TOOLS = [
    {
        "name": "get_cash_position",
        "description": "Get current cash and bank balance for the company",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_id": {"type": "integer"}
            },
            "required": ["company_id"]
        }
    },
    {
        "name": "get_overdue_invoices",
        "description": "Get list of overdue invoices with customer details",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_id": {"type": "integer"},
                "limit": {"type": "integer", "description": "Max results (default 10)"}
            },
            "required": ["company_id"]
        }
    },
    {
        "name": "get_gst_summary",
        "description": "Get GST liability summary for a month",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_id": {"type": "integer"},
                "month": {"type": "string", "description": "YYYY-MM format, defaults to current month"}
            },
            "required": ["company_id"]
        }
    },
    {
        "name": "get_pnl_summary",
        "description": "Get month-to-date profit and loss summary",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_id": {"type": "integer"}
            },
            "required": ["company_id"]
        }
    },
    {
        "name": "draft_payment_reminder",
        "description": "Draft a professional payment reminder email for an overdue customer",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_name": {"type": "string"},
                "amount": {"type": "number"},
                "invoice_no": {"type": "string"},
                "days_overdue": {"type": "integer"},
                "company_name": {"type": "string"}
            },
            "required": ["customer_name", "amount", "invoice_no", "days_overdue", "company_name"]
        }
    },
    {
        "name": "get_vendor_payables",
        "description": "Get outstanding vendor bills/payables",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_id": {"type": "integer"},
                "limit": {"type": "integer"}
            },
            "required": ["company_id"]
        }
    },
]


def _execute_tool(name: str, inputs: dict, company_id: int, user) -> str:
    try:
        from decimal import Decimal

        if name == "get_cash_position":
            from apps.reports import queries
            cash = queries._cash_balance(inputs["company_id"], date.today())
            return f"Current cash & bank balance: ₹{cash:,.2f}"

        elif name == "get_overdue_invoices":
            from apps.billing.models import Invoice
            today = date.today()
            limit = inputs.get("limit", 10)
            invoices = [
                i for i in Invoice.objects.filter(
                    company_id=inputs["company_id"],
                    status=Invoice.Status.POSTED,
                    due_date__lt=today,
                ).select_related("customer").order_by("-due_date")[:limit]
                if i.grand_total - i.amount_paid > 0
            ]
            if not invoices:
                return "No overdue invoices. 🎉"
            lines = [
                f"• {i.invoice_no} | {i.customer.name} | ₹{i.grand_total - i.amount_paid:,.0f} | Due {i.due_date} ({(today - i.due_date).days}d overdue)"
                for i in invoices
            ]
            total = sum(i.grand_total - i.amount_paid for i in invoices)
            return f"{len(invoices)} overdue invoices totalling ₹{total:,.0f}:\n" + "\n".join(lines)

        elif name == "get_gst_summary":
            from apps.billing.models import Invoice
            from django.db.models import Sum
            month_str = inputs.get("month", date.today().strftime("%Y-%m"))
            year, month = map(int, month_str.split("-"))
            from calendar import monthrange
            start = date(year, month, 1)
            end = date(year, month, monthrange(year, month)[1])
            res = Invoice.objects.filter(
                company_id=inputs["company_id"],
                status=Invoice.Status.POSTED,
                date__gte=start, date__lte=end,
            ).aggregate(cgst=Sum("cgst"), sgst=Sum("sgst"), igst=Sum("igst"), taxable=Sum("taxable_amount"))
            cgst = res["cgst"] or Decimal("0")
            sgst = res["sgst"] or Decimal("0")
            igst = res["igst"] or Decimal("0")
            taxable = res["taxable"] or Decimal("0")
            return (f"GST summary for {month_str}:\n"
                    f"Taxable: ₹{taxable:,.0f} | CGST: ₹{cgst:,.0f} | SGST: ₹{sgst:,.0f} | IGST: ₹{igst:,.0f}\n"
                    f"Total GST: ₹{cgst + sgst + igst:,.0f}")

        elif name == "get_pnl_summary":
            from apps.reports import queries
            today = date.today()
            start = today.replace(day=1)
            pnl = queries.profit_and_loss(inputs["company_id"], start, today)
            return (f"P&L for {start} to {today}:\n"
                    f"Income: ₹{pnl['total_income']:,.0f}\n"
                    f"Expenses: ₹{pnl['total_expense']:,.0f}\n"
                    f"Net Profit: ₹{pnl['net_profit']:,.0f}")

        elif name == "draft_payment_reminder":
            # Claude itself will draft this — just return the inputs formatted
            inp = inputs
            tone = "firm" if inp["days_overdue"] > 30 else "polite"
            return (
                f"[Draft for {tone} reminder]\n"
                f"Subject: Payment Reminder — Invoice {inp['invoice_no']} — ₹{inp['amount']:,.0f}\n\n"
                f"Dear {inp['customer_name']},\n\n"
                f"I hope this message finds you well. I'm writing to follow up on Invoice {inp['invoice_no']} "
                f"for ₹{inp['amount']:,.0f}, which was due {inp['days_overdue']} days ago.\n\n"
                f"Could you please arrange payment at the earliest? "
                f"{'We value our relationship and want to resolve this quickly.' if inp['days_overdue'] <= 30 else 'Prompt settlement will help us avoid escalation.'}\n\n"
                f"If you have any questions, please reach out directly.\n\n"
                f"Best regards,\nAccounts Team\n{inp['company_name']}"
            )

        elif name == "get_vendor_payables":
            from apps.procurement.models import VendorBill
            limit = inputs.get("limit", 10)
            bills = [
                b for b in VendorBill.objects.filter(
                    company_id=inputs["company_id"],
                    status__in=["POSTED", "PARTIAL"],
                ).select_related("vendor").order_by("due_date")[:limit]
                if b.balance_due > 0
            ]
            if not bills:
                return "No outstanding vendor bills."
            today = date.today()
            lines = [
                f"• {b.bill_no} | {b.vendor.name} | ₹{b.balance_due:,.0f} | Due {b.due_date}"
                + (" ⚠️ OVERDUE" if b.due_date and b.due_date < today else "")
                for b in bills
            ]
            return f"{len(bills)} bills outstanding:\n" + "\n".join(lines)

        return f"Tool {name} not implemented."
    except Exception as e:
        logger.exception("Finance AI tool %s failed", name)
        return f"Error: {e}"


def chat(message: str, company_id: int, user, history: list | None = None) -> dict:
    """Finance AI chat. Returns {reply, actions_taken}."""
    from django.conf import settings
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"reply": "Finance AI is not configured (ANTHROPIC_API_KEY not set).", "actions_taken": []}

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
    except Exception:
        return {"reply": "Anthropic SDK not available.", "actions_taken": []}

    from apps.masters.models import Company
    company = Company.objects.filter(id=company_id).first()
    system = SYSTEM_PROMPT.format(
        today=date.today().isoformat(),
        company_name=company.name if company else f"Company {company_id}",
        user_email=user.email,
    ) + f"\nDefault company_id: {company_id}"

    messages = list(history or [])
    messages.append({"role": "user", "content": message})
    actions_taken = []

    for _ in range(5):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            reply = " ".join(b.text for b in response.content if hasattr(b, "text"))
            return {"reply": reply, "actions_taken": actions_taken}

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = _execute_tool(block.name, block.input, company_id, user)
                    actions_taken.append({"tool": block.name, "result": result[:200]})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            break

    return {"reply": "Could not complete your request.", "actions_taken": actions_taken}
