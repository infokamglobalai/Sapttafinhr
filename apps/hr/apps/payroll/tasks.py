"""
Celery tasks for payroll processing.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def run_payroll_for_tenant(self, tenant_id, payroll_run_id):
    """
    Process payroll for all active employees in a payroll run.
    Called from the HR admin after creating a PayrollRun in 'draft' status.
    """
    from apps.tenants.models import Tenant
    from apps.employees.models import Employee
    from apps.payroll.models import PayrollRun
    from apps.payroll.engine import compute_payroll_record

    try:
        tenant = Tenant.objects.get(id=tenant_id)
        payroll_run = PayrollRun.objects.get(id=payroll_run_id, tenant=tenant)
        payroll_run.status = "processing"
        payroll_run.run_at = timezone.now()
        payroll_run.save(update_fields=["status", "run_at"])

        employees = Employee.objects.filter(
            tenant=tenant,
            is_active=True,
            employment_status__in=["active", "notice_period"],
        )

        total_gross = 0
        total_deductions = 0
        total_net = 0
        total_employer_cost = 0
        count = 0

        for emp in employees:
            try:
                record = compute_payroll_record(
                    tenant, emp, payroll_run, payroll_run.year, payroll_run.month
                )
                total_gross += float(record.gross_earnings)
                total_deductions += float(record.total_deductions)
                total_net += float(record.net_payable)
                total_employer_cost += float(record.pf_employer + record.esi_employer + record.lwf_employer)
                count += 1
            except Exception as exc:
                logger.error("Payroll failed for %s: %s", emp, exc)

        payroll_run.total_employees = count
        payroll_run.total_gross = total_gross
        payroll_run.total_deductions = total_deductions
        payroll_run.total_net = total_net
        payroll_run.total_employer_cost = total_employer_cost
        payroll_run.status = "review"
        payroll_run.save()

        return {"run_id": payroll_run_id, "employees": count, "net": total_net}

    except Exception as exc:
        logger.error("Payroll run %s failed: %s", payroll_run_id, exc, exc_info=True)
        raise self.retry(exc=exc)


@shared_task
def generate_payslips_for_run(payroll_run_id):
    """Generate PDF payslips for all records in an approved run."""
    from apps.payroll.models import PayrollRun, PayrollRecord, Payslip
    from utils.pdf import render_pdf
    from django.core.files.base import ContentFile

    payroll_run = PayrollRun.objects.get(id=payroll_run_id)
    records = PayrollRecord.objects.filter(payroll_run=payroll_run).select_related(
        "employee", "employee__tenant", "employee__department", "employee__designation"
    )

    for record in records:
        context = {
            "record": record,
            "employee": record.employee,
            "tenant": record.tenant,
            "run": payroll_run,
        }
        pdf_bytes = render_pdf("payroll/payslip_pdf.html", context)
        filename = f"payslip_{record.employee.employee_code}_{payroll_run.year}_{payroll_run.month:02d}.pdf"

        payslip, _ = Payslip.objects.get_or_create(
            tenant=payroll_run.tenant,
            payroll_record=record,
            employee=record.employee,
            year=payroll_run.year,
            month=payroll_run.month,
        )
        payslip.pdf.save(filename, ContentFile(pdf_bytes), save=False)
        payslip.generated_at = timezone.now()
        payslip.save()

    logger.info("Generated %d payslips for run %s", records.count(), payroll_run_id)
