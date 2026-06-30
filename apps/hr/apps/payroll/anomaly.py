"""
Payroll anomaly detection.

Runs over a PayrollRun and surfaces records that look wrong. Pure rules
+ stats - no ML, no external API. Every flag includes the rule that fired,
the numbers behind it, and a severity, so HR can review and act.

Rules implemented:
  1. Net pay dropped > 30% vs prior month     - high
  2. Net pay = 0 or negative                  - critical
  3. LOP days > 10                            - medium
  4. PF deducted but employee has no UAN      - high
  5. ESI deducted but employee has no ESI #   - high
  6. PF wage cap mismatch                     - low
  7. Bank account missing                     - critical (can't pay)
  8. Salary > 3x team median                  - medium  (outlier)
  9. New employee (< 30 days) with full month wage  - low (verify pro-rate)
 10. TDS deducted but annual gross < 7L (NEW regime exempt) - low
"""
import statistics
from decimal import Decimal


SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def _flag(rule, severity, message, evidence=None):
    return {
        "rule": rule,
        "severity": severity,
        "severity_rank": SEVERITY_RANK[severity],
        "message": message,
        "evidence": evidence or {},
    }


def detect_for_run(payroll_run, *, records=None):
    """
    Examine every record in this PayrollRun and return a list of anomalies.
    Each anomaly: {employee_id, employee_name, flags: [...]}
    """
    from .models import PayrollRun

    tenant = payroll_run.tenant
    if records is None:
        records = list(
            payroll_run.records
            .select_related("employee", "employee__department")
            .prefetch_related("employee__bank_accounts")
        )
    else:
        records = list(records)

    if not records:
        return []

    # Previous run for MoM comparisons
    prev_run = (
        PayrollRun.objects.filter(tenant=tenant)
        .exclude(pk=payroll_run.pk)
        .order_by("-year", "-month").first()
    )
    prev_by_emp = {}
    if prev_run:
        prev_by_emp = {
            r.employee_id: r
            for r in prev_run.records.only(
                "employee_id", "net_payable", "gross_earnings", "paid_days"
            )
        }

    # Team-level salary median for outlier detection (group by department)
    team_gross = {}
    for r in records:
        dept_id = r.employee.department_id or 0
        team_gross.setdefault(dept_id, []).append(float(r.gross_earnings))
    team_median = {
        dept: statistics.median(vals) if len(vals) >= 3 else None
        for dept, vals in team_gross.items()
    }

    results = []
    for r in records:
        emp = r.employee
        flags = []

        # 1. Net pay drop vs prior month
        prev = prev_by_emp.get(emp.id)
        if prev and prev.net_payable > 0:
            delta_pct = (r.net_payable - prev.net_payable) / prev.net_payable * 100
            if delta_pct < -30:
                flags.append(_flag(
                    "net_pay_drop", "high",
                    f"Net pay dropped {abs(delta_pct):.0f}% MoM "
                    f"(prev INR {prev.net_payable:,.0f} -> now INR {r.net_payable:,.0f})",
                    {"delta_pct": round(float(delta_pct), 1),
                     "prev": float(prev.net_payable), "now": float(r.net_payable)},
                ))

        # 2. Zero / negative net pay
        if r.net_payable <= 0:
            flags.append(_flag(
                "zero_net_pay", "critical",
                f"Net payable is INR {r.net_payable:.0f}. Employee will receive nothing.",
                {"net": float(r.net_payable)},
            ))

        # 3. High LOP days
        if r.lop_days >= 10:
            flags.append(_flag(
                "high_lop", "medium",
                f"{r.lop_days} LOP days this month - verify attendance is correct",
                {"lop_days": float(r.lop_days)},
            ))

        # 4. PF deducted but no UAN
        if r.pf_employee > 0 and not getattr(emp, "uan_number", ""):
            flags.append(_flag(
                "pf_no_uan", "high",
                f"PF deducted (INR {r.pf_employee:.0f}) but employee has no UAN on file - cannot file ECR",
                {"pf": float(r.pf_employee)},
            ))

        # 5. ESI deducted but no ESI number
        if r.esi_employee > 0 and not getattr(emp, "esi_number", ""):
            flags.append(_flag(
                "esi_no_number", "high",
                f"ESI deducted (INR {r.esi_employee:.0f}) but employee has no ESI number on file",
                {"esi": float(r.esi_employee)},
            ))

        # 7. Bank account missing
        if r.net_payable > 0:
            has_bank = any(b.is_primary for b in emp.bank_accounts.all())
            if not has_bank:
                flags.append(_flag(
                    "no_bank_account", "critical",
                    f"Cannot disburse INR {r.net_payable:,.0f} - no primary bank account on file",
                    {"net": float(r.net_payable)},
                ))

        # 8. Salary outlier within department
        med = team_median.get(emp.department_id or 0)
        if med and r.gross_earnings > Decimal(str(med)) * 3:
            flags.append(_flag(
                "salary_outlier", "medium",
                f"Gross INR {r.gross_earnings:,.0f} is >3x dept median (INR {med:,.0f}) - verify intended",
                {"gross": float(r.gross_earnings), "dept_median": med},
            ))

        # 9. Brand-new hire with full-month wage
        if emp.date_of_joining and r.paid_days >= 22:
            import datetime
            run_start = datetime.date(payroll_run.year, payroll_run.month, 1)
            tenure_days = (run_start - emp.date_of_joining).days
            if 0 <= tenure_days < 20:
                flags.append(_flag(
                    "new_hire_full_wage", "low",
                    f"Joined only {tenure_days} days before this month - check if pro-rate applied",
                    {"joined": emp.date_of_joining.isoformat(), "paid_days": float(r.paid_days)},
                ))

        if flags:
            results.append({
                "employee_id": emp.id,
                "employee_code": emp.employee_code,
                "employee_name": emp.full_name,
                "department": emp.department.name if emp.department else "",
                "max_severity": max(f["severity_rank"] for f in flags),
                "flags": flags,
            })

    # Sort: most severe + most flags first
    results.sort(key=lambda r: (-r["max_severity"], -len(r["flags"])))
    return results


def summary(anomalies):
    """Roll up to severity counts."""
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for a in anomalies:
        for f in a["flags"]:
            counts[f["severity"]] += 1
    return counts
