"""HR AI Assistant — natural language interface for HR queries and actions.

Uses Claude API with tool use to:
  - Answer leave balance, salary, attendance, holiday questions
  - Apply leave, submit attendance regularization, submit expenses
  - Give manager a team attendance/leave summary
"""
from __future__ import annotations

import json
import logging
from datetime import date

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Saptta HR Assistant — a helpful, concise AI embedded in the HR system.
You help employees and managers with:
- Checking leave balances, applying leave, checking holidays
- Viewing attendance records and submitting regularizations
- Querying payroll information and payslips
- Answering HR policy questions

Always be professional, brief, and accurate. If you don't have enough information,
say so clearly. When taking an action (like applying leave), confirm with the user
what you're about to do before doing it.

Today's date: {today}
User: {user_name} ({user_role})
Tenant: {tenant_name}
"""

TOOLS = [
    {
        "name": "get_leave_balance",
        "description": "Get the employee's remaining leave balance for each leave type",
        "input_schema": {
            "type": "object",
            "properties": {
                "employee_id": {"type": "integer", "description": "Employee ID (use current user's employee ID)"}
            },
            "required": ["employee_id"]
        }
    },
    {
        "name": "get_upcoming_holidays",
        "description": "Get list of upcoming public holidays for this tenant",
        "input_schema": {
            "type": "object",
            "properties": {
                "days_ahead": {"type": "integer", "description": "How many days ahead to look (default 30)"}
            }
        }
    },
    {
        "name": "get_attendance_summary",
        "description": "Get attendance summary for an employee in the current month",
        "input_schema": {
            "type": "object",
            "properties": {
                "employee_id": {"type": "integer"}
            },
            "required": ["employee_id"]
        }
    },
    {
        "name": "apply_leave",
        "description": "Submit a leave application for an employee",
        "input_schema": {
            "type": "object",
            "properties": {
                "employee_id": {"type": "integer"},
                "leave_type_code": {"type": "string", "description": "Leave type code (CL, EL, SL etc.)"},
                "from_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                "to_date": {"type": "string", "description": "End date YYYY-MM-DD"},
                "reason": {"type": "string"}
            },
            "required": ["employee_id", "leave_type_code", "from_date", "to_date"]
        }
    },
    {
        "name": "get_payslip_summary",
        "description": "Get the latest payslip summary for an employee",
        "input_schema": {
            "type": "object",
            "properties": {
                "employee_id": {"type": "integer"}
            },
            "required": ["employee_id"]
        }
    },
    {
        "name": "get_team_summary",
        "description": "Get a summary of the manager's team — who's on leave, attendance rates",
        "input_schema": {
            "type": "object",
            "properties": {
                "manager_id": {"type": "integer"},
                "period": {"type": "string", "description": "today | this_week | this_month"}
            },
            "required": ["manager_id"]
        }
    },
]


def _execute_tool(name: str, inputs: dict, tenant, user) -> str:
    """Execute an HR tool call and return the result as a string."""
    try:
        if name == "get_leave_balance":
            from apps.leaves.models import LeaveBalance
            emp_id = inputs.get("employee_id")
            balances = LeaveBalance.objects.filter(
                employee_id=emp_id, tenant=tenant
            ).select_related("leave_type")
            if not balances.exists():
                return "No leave balance records found."
            lines = [f"{b.leave_type.name} ({b.leave_type.code}): {b.remaining_days} days remaining (used {b.used_days}/{b.allocated_days})" for b in balances]
            return "\n".join(lines)

        elif name == "get_upcoming_holidays":
            from apps.hr_ops.models import Holiday
            days = inputs.get("days_ahead", 30)
            today = date.today()
            from datetime import timedelta
            upcoming = Holiday.objects.filter(
                tenant=tenant, date__gte=today, date__lte=today + timedelta(days=days)
            ).order_by("date")
            if not upcoming.exists():
                return f"No holidays in the next {days} days."
            return "\n".join([f"{h.date.strftime('%d %b %Y')} ({h.date.strftime('%A')}): {h.name}" for h in upcoming])

        elif name == "get_attendance_summary":
            from apps.attendance.models import AttendanceRecord
            from datetime import date
            today = date.today()
            month_start = today.replace(day=1)
            records = AttendanceRecord.objects.filter(
                employee_id=inputs["employee_id"], tenant=tenant,
                date__gte=month_start, date__lte=today
            )
            present = records.filter(status="present").count()
            absent = records.filter(status="absent").count()
            wfh = records.filter(status="wfh").count()
            return f"This month: {present} present, {absent} absent, {wfh} WFH. Total records: {records.count()}"

        elif name == "apply_leave":
            from apps.leaves.models import LeaveRequest, LeaveType
            emp_id = inputs["employee_id"]
            leave_type = LeaveType.objects.filter(
                tenant=tenant, code=inputs["leave_type_code"].upper()
            ).first()
            if not leave_type:
                return f"Leave type '{inputs['leave_type_code']}' not found. Available types: " + ", ".join(
                    LeaveType.objects.filter(tenant=tenant).values_list("code", flat=True)
                )
            req = LeaveRequest.objects.create(
                employee_id=emp_id, tenant=tenant,
                leave_type=leave_type,
                from_date=inputs["from_date"],
                to_date=inputs["to_date"],
                reason=inputs.get("reason", ""),
                status="pending",
            )
            return f"✅ Leave application submitted (ID: {req.id}). Status: Pending approval. {inputs['from_date']} to {inputs['to_date']}."

        elif name == "get_payslip_summary":
            from apps.payroll.models import Payslip
            payslip = Payslip.objects.filter(
                employee_id=inputs["employee_id"], tenant=tenant
            ).order_by("-pay_period_end").first()
            if not payslip:
                return "No payslips found."
            return (f"Latest payslip: {payslip.pay_period_start} to {payslip.pay_period_end}\n"
                    f"Gross: ₹{payslip.gross_pay:,.0f} | Deductions: ₹{payslip.total_deductions:,.0f} | Net: ₹{payslip.net_pay:,.0f}")

        elif name == "get_team_summary":
            from apps.employees.models import Employee
            from apps.leaves.models import LeaveRequest
            today = date.today()
            team = Employee.objects.filter(tenant=tenant, reporting_manager_id=inputs["manager_id"], is_active=True)
            on_leave = LeaveRequest.objects.filter(
                tenant=tenant, employee__in=team, status="approved",
                from_date__lte=today, to_date__gte=today
            ).select_related("employee")
            on_leave_names = [r.employee.full_name for r in on_leave]
            return (f"Team size: {team.count()} employees\n"
                    f"On leave today: {len(on_leave_names)} ({', '.join(on_leave_names) or 'none'})")

        return f"Tool {name} executed (no result to show)."

    except Exception as e:
        logger.exception("Tool %s failed", name)
        return f"Error executing {name}: {e}"


def chat(message: str, tenant, user, history: list | None = None) -> dict:
    """Process one chat message. Returns {reply, actions_taken}."""
    try:
        import anthropic
        client = anthropic.Anthropic()
    except Exception as e:
        return {"reply": "AI assistant is not available. Please configure ANTHROPIC_API_KEY.", "actions_taken": []}

    from django.conf import settings
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"reply": "AI assistant is not configured (ANTHROPIC_API_KEY not set in settings).", "actions_taken": []}

    # Get employee record for the user
    from apps.employees.models import Employee
    employee = Employee.objects.filter(tenant=tenant, user=user).first()
    emp_id = employee.id if employee else None

    system = SYSTEM_PROMPT.format(
        today=date.today().isoformat(),
        user_name=getattr(user, "full_name", user.email) or user.email,
        user_role="Manager" if getattr(user, "is_hr_admin", False) else "Employee",
        tenant_name=tenant.name,
    )

    messages = list(history or [])
    messages.append({"role": "user", "content": message})

    actions_taken = []

    # Inject employee_id into context
    if emp_id:
        system += f"\nCurrent user's employee_id: {emp_id}"

    client = anthropic.Anthropic(api_key=api_key)

    # Agentic loop — keep going until no more tool calls
    for _ in range(5):  # max 5 rounds
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
            # Execute all tool calls
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = _execute_tool(block.name, block.input, tenant, user)
                    actions_taken.append({"tool": block.name, "result": result})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

            # Add assistant response + tool results to messages
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            break

    return {"reply": "I couldn't complete your request. Please try again.", "actions_taken": actions_taken}
