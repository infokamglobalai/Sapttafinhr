# User access guide — who logs in, how, and what they see

## 1. After purchase / signup

| Step | What happens |
|------|----------------|
| 1 | Customer buys a plan on Saptta (Finance + HR bundle or HR add-on). |
| 2 | FIN provisions the tenant; HR workspace is created at `https://<subdomain>.workspace` (local: `http://hr.localhost:8080`). |
| 3 | The **first admin email** from signup becomes the **HR Administrator** with full access. |
| 4 | They log in at `/auth/login/` (or employee login URL for staff later). |
| 5 | Complete **Setup wizard** (`/setup/`) — company profile, departments, leave, payroll basics. |

---

## 2. Roles in Saptta HR

| Role | Who | Login URL | Assigned by |
|------|-----|-----------|-------------|
| **Platform super admin** | Saptta ops only | `/superadmin/` | Django superuser |
| **HR Administrator** | HR head, HR team | `/auth/login/` | Signup owner; extra HR via **People → Team Access** |
| **Manager** | Team lead, dept head, reporting manager | `/auth/employee-login/` | **Team Access** — check “Manager” on user |
| **Employee** | All staff | `/auth/employee-login/` | Auto on hire + **Create login** on profile |

**Team lead / department head** in your company maps to **Manager** (approves leave, expenses, requests for direct reports) plus optional **HR Admin** for full company view.

**Company head / CEO** — assign **HR Administrator** role (or use **Company Overview** under HR Operations for org-wide KPIs).

---

## 3. Creating an employee and giving them login

### HR steps

1. **People → Employees → Add employee** — fill official email (required for login).
2. Save employee record.
3. On employee profile → **Application access** → **Create login** (or use **Bulk provision logins**).
4. System generates a **one-time invite link** (valid 7 days). Copy or email it to the employee.
5. Employee opens invite → sets password → lands on dashboard.

### Employee steps

1. Open invite link: `/auth/invite/<token>/`
2. Set password → automatic sign-in.
3. Future logins: `/auth/employee-login/` with work email + password.
4. Use **My Space** in the sidebar: attendance, leave, payslips, assets, projects, help requests.

**No plaintext passwords** — invite link only. Reset: HR clicks **Reset login** on profile.

---

## 4. What each role sees in the sidebar

### HR Administrator

- **Dashboard** — org analytics
- **People** — Employees, Attrition, Team Access, Org structure (secondary panel always visible when selected)
- **Time & Leave** — Register, approvals, balances, corrections
- **Payroll** — Runs, review, loans, reimbursements
- **Performance** — Review cycles
- **HR Operations** — Company Overview, Projects, Onboarding, Hiring, Assets, Requests queue, etc.
- **Reports** — MIS exports
- **Setup & Config** — Master data

### Manager (not HR admin)

- **Dashboard** — team insights
- **My Space** — own attendance, leave, payslips (if employee profile linked)
- **My Team** — leave approvals, team reviews, request approvals, team attendance
- Must have **employee profile** linked for team-scoped data

### Employee

- **Dashboard** — punch, personal widgets
- **My Space** — profile, attendance, leave, timesheet, projects, payslips, assets, requests, policies

---

## 5. When an employee raises a request

| Request type | First approver | Then | Who gets notified |
|--------------|----------------|------|-------------------|
| Hardware / software | Reporting **manager** | HR / IT queue | Manager, HR admins, dept managers |
| IT / laptop issue | HR / IT queue | Resolved | HR admins, dept managers |
| HR / other | HR queue | Resolved | HR admins, dept managers |

- **Employee** tracks status under **Help & Requests**.
- **Manager** approves under **My Team → Request Approvals**.
- **HR** works queue under **HR Operations → Service Requests**.
- **Company head (HR admin)** sees all on **Company Overview** and dashboard.

---

## 6. Pin sidebar (optional)

Bottom of sidebar → **Your company** menu → **Pin sidebar open** — keeps module labels visible. Sub-links always appear in the **panel to the right** of the icon rail when you select a module (People, Time & Leave, etc.).

---

## 7. Common issues

| Problem | Fix |
|---------|-----|
| Employee can’t log in | HR: add official email → Create login → send new invite |
| Manager sees no team | HR: link manager user to employee record; set reporting manager on reports |
| People sub-menu empty | Hard refresh (`Ctrl+Shift+R`); ensure sidebar secondary panel is visible next to icons |
| Wrong role | **People → Team Access** — adjust Manager / HR Admin checkboxes |

## 8. Same design for every role

All users share one layout:

| Element | Behaviour |
|---------|-----------|
| **Left icon rail** | Dashboard + role-specific modules (same indigo style) |
| **Sub-panel** | Opens beside the rail when you pick a module — always visible, not hidden on hover |
| **Section title** | Shows module name + your role badge (HR Administrator, Manager, Employee) |
| **Page content** | Same cards, headers, and spacing (`hr-page-header`, KPI cards, white panels) |
| **Mobile** | Accordion menu with the same links as desktop |

**Employee** → Dashboard + **My Space**  
**Manager** → Dashboard + **My Space** + **My Team** (7 approval links)  
**HR Admin** → Full workspace + optional **My Space** if linked to an employee record

## 9. Visual design system (v3)

All pages share one design layer (`saptta-design-enhanced.css`):

| Element | Style |
|---------|--------|
| Background | Light slate `#F8FAFC` |
| Cards / tables | White, 14px radius, soft border |
| Primary actions | Indigo `#4F46E5` buttons |
| KPI strips | `.hr-kpi-strip` — same on admin & employee pages |
| Tables | Uppercase headers, row hover, semantic badges |
| Forms | 10px radius inputs, indigo focus ring |
| Empty states | Dashed panel + icon + CTA |
| Auth | Centered card on subtle indigo gradient |

Hard refresh after updates: **Ctrl+Shift+R**.

See also: [RBAC.md](RBAC.md) for the full permission matrix.
