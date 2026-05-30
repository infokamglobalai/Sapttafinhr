"""
Management command: seed_permissions
Run once after first migration to populate the RBAC permission table.

Usage: python manage.py seed_permissions
"""
from django.core.management.base import BaseCommand
from apps.accounts.models import Permission

PERMISSIONS = [
    # Employees
    ("employees.view", "View employees", "employees"),
    ("employees.create", "Create employees", "employees"),
    ("employees.edit", "Edit employees", "employees"),
    ("employees.delete", "Delete employees", "employees"),
    ("employees.export", "Export employee data", "employees"),
    # Attendance
    ("attendance.view", "View attendance", "attendance"),
    ("attendance.regularize_own", "Regularize own attendance", "attendance"),
    ("attendance.regularize_others", "Regularize others attendance", "attendance"),
    ("attendance.export", "Export attendance data", "attendance"),
    # Leaves
    ("leaves.apply", "Apply for leave", "leaves"),
    ("leaves.approve_own_team", "Approve team leave requests", "leaves"),
    ("leaves.approve_all", "Approve all leave requests", "leaves"),
    ("leaves.configure", "Configure leave types and holidays", "leaves"),
    # Payroll
    ("payroll.view_own", "View own payslip", "payroll"),
    ("payroll.view_all", "View all payslips", "payroll"),
    ("payroll.run", "Run payroll", "payroll"),
    ("payroll.approve", "Approve payroll run", "payroll"),
    ("payroll.export", "Export payroll data", "payroll"),
    ("payroll.configure", "Configure salary structures", "payroll"),
    # HR Ops
    ("hr_ops.view_all_letters", "View all HR letters", "hr_ops"),
    ("hr_ops.generate_letters", "Generate HR letters", "hr_ops"),
    ("hr_ops.manage_assets", "Manage assets", "hr_ops"),
    ("hr_ops.manage_exits", "Manage exit requests", "hr_ops"),
    # Reports
    ("reports.view", "View reports", "reports"),
    ("reports.export", "Export reports", "reports"),
]


class Command(BaseCommand):
    help = "Seed RBAC permission definitions"

    def handle(self, *args, **options):
        created = 0
        for codename, name, module in PERMISSIONS:
            _, was_created = Permission.objects.get_or_create(
                codename=codename,
                defaults={"name": name, "module": module},
            )
            if was_created:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(f"Seeded {created} new permissions ({len(PERMISSIONS)} total).")
        )
