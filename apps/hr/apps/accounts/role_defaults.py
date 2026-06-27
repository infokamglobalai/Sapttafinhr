"""Default permission codenames for system roles (tenant provisioning)."""

MANAGER_PERMISSION_CODENAMES = (
    "employees.view",
    "attendance.view",
    "attendance.regularize_others",
    "leaves.approve_own_team",
    "payroll.view_own",
    "performance.review_team",
    "projects.view",
)

EMPLOYEE_PERMISSION_CODENAMES = (
    "attendance.regularize_own",
    "leaves.apply",
    "payroll.view_own",
    "projects.view",
)
