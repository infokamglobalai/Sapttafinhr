# RBAC — Role-Based Access Control

## Roles

| Role | Code | Description |
|------|------|-------------|
| **Super Admin** | Platform Django admin | Cross-tenant platform ops (`/superadmin/`) |
| **HR Admin** | `hr_admin` | Full HRMS for one tenant |
| **Manager** | `manager` | Direct reports: leave, attendance, expenses, reviews |
| **Employee** | `employee` | Self-service only |

Roles are assigned via `UserRole` on the tenant user. Nav and decorators use `user.is_hr_admin`, `user.is_manager`, and `user.employee_profile`.

## Access matrix

| Feature | HR Admin | Manager | Employee |
|---------|:--------:|:-------:|:--------:|
| Dashboard | ✓ | ✓ | ✓ |
| Employee directory & CRUD | ✓ | — | — |
| Bulk import / credentials | ✓ | — | — |
| Departments / designations / locations | ✓ | — | — |
| Attrition dashboard | ✓ | — | — |
| Attendance register (all) | ✓ | — | — |
| Punch in/out | ✓* | ✓* | ✓* |
| My attendance | ✓* | ✓* | ✓ |
| Team attendance | ✓ | ✓ (reports) | — |
| Regularization approve | ✓ | ✓ (reports) | — |
| Shifts admin | ✓ | — | — |
| Apply leave | ✓* | ✓* | ✓ |
| Approve leave | ✓ (all) | ✓ (reports) | — |
| Leave types / holidays / balances | ✓ | — | — |
| Comp-off request / approve | ✓ | ✓ (approve reports) | ✓ (request) |
| Payroll runs / review / publish | ✓ | — | — |
| Salary structures / statutory | ✓ | — | — |
| Payslip (own) | ✓* | ✓* | ✓ |
| Bank advice / salary register / PF / ESI / Tally | ✓ | — | — |
| Loans admin | ✓ | — | — |
| My loans | ✓* | ✓* | ✓ |
| Expenses approve (all) | ✓ | — | — |
| Team expenses | ✓ | ✓ | — |
| Submit expense | ✓* | ✓* | ✓ |
| Tax declaration verify | ✓ | — | — |
| My tax declaration | ✓* | ✓* | ✓ |
| Form 16 admin / issue | ✓ | — | — |
| My Form 16 | ✓* | ✓* | ✓ |
| Reports (leave, attendance, headcount, payroll) | ✓ | — | — |
| Monthly report pack ZIP | ✓ | — | — |
| Recruitment / ATS | ✓ | — | — |
| Recruitment AI (JD, resume) | ✓ | — | — |
| Performance cycles (admin) | ✓ | — | — |
| Team performance reviews | ✓ | ✓ (reports) | — |
| My performance reviews | ✓* | ✓* | ✓ |
| HR letters / onboarding / exits / assets | ✓ | — | — |
| Policies admin | ✓ | — | — |
| Policy Q&A (AI) | ✓ | ✓ | ✓ |
| HR AI chat widget | ✓ | ✓ | ✓ |
| Announcements | ✓ (create) | ✓ (read) | ✓ (read) |
| Notifications | ✓ | ✓ | ✓ |
| Audit log | ✓ | — | — |

\*If the user has a linked `employee_profile`.

## Permission decorators

Defined in `utils/access.py`:

- `@hr_admin_required` — tenant login + `is_hr_admin`
- `@manager_or_hr_required` — manager or HR admin
- `@employee_profile_required` — linked employee record
- `@perm_required("codename")` — granular (used in reports)

## Manager without employee profile

Managers who log in without an `employee_profile` see a dashboard warning. HR can still approve on their behalf. Managers with a profile get team-scoped data via `reporting_manager` on `Employee`.

## AI data boundaries

- HR chat uses tool calls scoped to tenant + user role
- Employees cannot see other employees' PII via AI
- Recruitment AI is HR-admin only
- Performance AI draft: manager (direct reports) or HR admin
