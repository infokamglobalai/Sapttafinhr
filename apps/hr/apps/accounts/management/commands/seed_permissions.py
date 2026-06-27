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
    ("hr_ops.generate_letters", "Generate HR letters (draft, submit, issue when no approval)", "hr_ops"),
    ("hr_ops.approve_letters", "Approve or reject HR letters before issue", "hr_ops"),
    ("hr_ops.manage_company_vault", "Manage company legal document vault", "hr_ops"),
    ("hr_ops.manage_assets", "Manage assets", "hr_ops"),
    ("hr_ops.manage_exits", "Manage exit requests", "hr_ops"),
    ("hr_ops.manage_requests", "Manage employee service requests", "hr_ops"),
    # Recruitment
    ("recruitment.manage", "Manage recruitment / ATS", "recruitment"),
    # Performance
    ("performance.manage", "Manage performance cycles", "performance"),
    ("performance.review_team", "Review direct reports", "performance"),
    # Projects
    ("projects.view", "View projects", "projects"),
    ("projects.manage", "Manage projects", "projects"),
    # Settings
    ("settings.manage", "Manage company settings", "settings"),
    # Reports
    ("reports.view", "View reports", "reports"),
    ("reports.export", "Export reports", "reports"),
]


class Command(BaseCommand):
    help = "Seed RBAC permission definitions and sync system roles"

    def handle(self, *args, **options):
        from apps.accounts.models import Permission, Role, RolePermission
        from apps.accounts.role_defaults import EMPLOYEE_PERMISSION_CODENAMES, MANAGER_PERMISSION_CODENAMES

        created = 0
        for codename, name, module in PERMISSIONS:
            _, was_created = Permission.objects.get_or_create(
                codename=codename,
                defaults={"name": name, "module": module},
            )
            if was_created:
                created += 1

        all_perms = {p.codename: p for p in Permission.objects.all()}
        admin_roles = Role.objects.filter(name__in=("super_admin", "hr_admin"))
        for role in admin_roles:
            for perm in all_perms.values():
                RolePermission.objects.get_or_create(role=role, permission=perm)

        for role in Role.objects.filter(name="manager"):
            for codename in MANAGER_PERMISSION_CODENAMES:
                perm = all_perms.get(codename)
                if perm:
                    RolePermission.objects.get_or_create(role=role, permission=perm)

        for role in Role.objects.filter(name="employee"):
            for codename in EMPLOYEE_PERMISSION_CODENAMES:
                perm = all_perms.get(codename)
                if perm:
                    RolePermission.objects.get_or_create(role=role, permission=perm)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created} new permissions ({len(PERMISSIONS)} total); synced system roles."
            )
        )
