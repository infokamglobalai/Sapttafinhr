# User Manual — HR Admin

## Login

1. Open `https://<your-company>.<domain>/auth/login/`
2. Sign in with HR admin email and password
3. You land on the **Dashboard** with HR-wide KPIs and shortcuts

## Daily operations

### Employees
- **Employees → List** — search, filter, open profile
- **Add employee** — fill form, assign department/designation/manager
- **Provision login** — from employee profile → Create login → email credentials
- **Bulk import** — Employees → Import CSV (use `static/sample_employees.csv` as template)
- **Documents** — upload contracts, ID proofs; monitor **HR Ops → Expiring documents**

### Org setup
- **Departments / Designations / Locations** — under Employees menu
- Configure once; assign on employee records

### Attendance
- **Attendance → Register** — month view for all employees
- **Shifts** — define shift timings
- **Regularizations** — approve/reject correction requests
- **Anomaly scan** — rule-based flags (missing punch, etc.)

### Leaves
- **Leave types** — create types; use code **CO** for comp-off auto-redeem
- **Holidays** — annual calendar
- **Balances** — adjust opening balances if needed
- **Pending approvals** — approve/reject; HR can approve any request
- **Comp-off** — approve earned comp-off credits

### Payroll (month-end)

#### Before running
1. Lock attendance for the month
2. Open **Payroll → Monthly review** — fix blockers (missing bank, open regularizations)

#### Run
1. **Payroll → Runs → Create** — select year/month
2. Open run → **Recompute** (pulls attendance LOP, loans, expenses)
3. Open each employee **Record detail** — set LOP override, bonus, manual deduction, notes if needed → Save → Recompute run
4. **Approve** run (locks calculations)
5. **Publish** — generates payslips, emails employees, triggers HR report pack

#### Exports (from run detail)
- Salary register (Excel) — for CA
- Bank advice — for bulk transfer
- PF statement / PF ECR / ESI return / Statutory ZIP
- Tally XML — for accounts

#### Other payroll
- **Structures** — salary components
- **Statutory** — PF/ESI/PT rates per tenant
- **Loans** — create loan; EMI deducts automatically
- **Expenses** — approve claims; paid in next payroll
- **Tax declarations** — verify employee 80C declarations before TDS
- **Form 16** — generate for FY → Issue → emails PDF to employees

### Reports
- **Reports** hub — leave, attendance, headcount, payroll summary
- **Monthly pack** — download ZIP of PDFs

### Recruitment
- **Jobs** — create opening, pipeline stages
- **AI** — generate JD, parse resumes on applicant upload
- Move candidates: applied → screening → interview → offer → hired

### Performance
- **Cycles** — create annual/half-yearly cycle
- Managers fill reviews; HR monitors completion on cycle detail

### HR Operations
- **Letters** — templates + generate per employee (offer, experience, etc.)
- **Onboarding** — start checklist for new joiner
- **Exits** — initiate separation → finalize → revoke login
- **Assets** — assign laptop, etc.
- **Announcements** — company-wide posts
- **Policies** — upload policy PDFs; employees use Policy Q&A
- **Audit log** — who changed what

### Automation
Ensure Celery beat is running in production. Test manually:

```powershell
python manage.py run_monthly_automation --action all --tenant <subdomain>
```

## AI assistant

Click the chat bubble (bottom right). Ask:
- "How many leave days do I have?"
- "Who is on leave this week?" (managers)
- "Apply 2 days casual leave from Monday"

Requires `ANTHROPIC_API_KEY` on server.

## Troubleshooting

| Issue | Action |
|-------|--------|
| Employee can't login | Check employee has user + `employee` role; use Restore access |
| Manager sees no team | Set **Reporting manager** on employee records |
| Payroll net pay wrong | Check attendance LOP, loan EMI, expense deductions, tax declaration |
| Comp-off not deducting | Leave type code must be CO/COMP/COMPOFF |
