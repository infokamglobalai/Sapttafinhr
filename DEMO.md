# Saptta HR + Finance — Demo Runbook

Local stack via Docker on **http://localhost:8080** (nginx front door).

## Pre-flight

```powershell
docker compose up -d --build
# Wait ~60s for HR seed (migrate → seed_dummy_login → seed_demo_data)
.\scripts\test-all.ps1 -IncludeSmokeLogins
```

Fresh `docker compose up` auto-seeds the **acme** workspace with ~22 employees, attendance, leave queues, recruitment, and **last month's published payslips** for ESS.

Manual re-seed (idempotent):

```powershell
docker compose exec hr-backend python manage.py seed_demo_data --subdomain acme
docker compose exec fin-backend python manage.py bootstrap_dev
```

## Credentials

| Role | URL | Email | Password |
|------|-----|-------|----------|
| Platform owner / HR admin | http://localhost:8080/login | `demo@saptta.com` | `Demo@1234` |
| Super admin | http://localhost:8080/login | `sp@saptta.com` | `Saptta@2026` |
| Finance admin | http://localhost:8080/login | `admin@acme.test` | `admin12345` |
| HR manager | http://hr.localhost:8080/auth/employee-login/ | `manager@saptta.com` | `Demo@1234` |
| HR employee (ESS) | http://hr.localhost:8080/auth/employee-login/ | `manju@saptta.com` | `Employee@1234` |

Unified login: Finance login page falls back to HR SSO when the user exists only in HR.

## 45-minute demo script

### 1. Platform & product switcher (5 min)

1. Open http://localhost:8080/login → sign in as `demo@saptta.com`.
2. Land on product switcher — show HR + Finance tiles.
3. Open HR → confirm dashboard shows employee count, attendance, pending leave (no setup wizard).

### 2. HR admin — core ops (15 min)

1. **Employees** — browse directory (~22), open a profile (PAN, bank, manager).
2. **Attendance** — show 14-day punch data; open regularization queue (1 pending).
3. **Leave** — manager queue: 2 pending requests; calendar shows someone on leave today.
4. **Recruitment** — 2 published jobs with candidates in screening.
5. **Payroll** — open last month's run (status **paid**); drill into a record; show WPS/export stubs if GCC tenant.

### 3. Manager view (10 min)

1. Log out → employee login as `manager@saptta.com`.
2. Approve a pending leave request.
3. View team attendance / leave calendar.

### 4. Employee self-service (10 min)

1. Log in as `manju@saptta.com`.
2. **My payslips** — last month published slip with PDF download.
3. Apply leave; view attendance history.

### 5. Finance cross-sell (5 min)

1. Platform login → switch to Finance.
2. Show invoicing / ledger dashboard (`admin@acme.test` workspace).

## GCC / Kuwait variant

Provision or switch tenant jurisdiction to **KW** in admin, then:

```powershell
docker compose exec hr-backend python manage.py shell -c "
from apps.tenants.models import Tenant
from apps.payroll.bootstrap import bootstrap_gcc_payroll_defaults
t = Tenant.objects.get(subdomain='acme')
t.payroll_jurisdiction = 'KW'
t.currency = 'KWD'
t.save()
bootstrap_gcc_payroll_defaults(t)
"
```

Re-run payroll seed for payslip demo:

```powershell
docker compose exec hr-backend python manage.py seed_demo_data --subdomain acme
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 502 on login | `docker compose restart nginx` (stale upstream) |
| Empty HR dashboard / setup wizard | `docker compose exec hr-backend python manage.py seed_demo_data --subdomain acme` |
| FIN login 404 on HR SSO | `docker compose restart fin-backend` |
| CSRF on employee login | Ensure `http://hr.localhost` in `CSRF_TRUSTED_ORIGINS` (dev settings) |
| Invite email missing | SMTP not configured — copy invite link from admin UI |
| Payslip PDF fails | xhtml2pdf fallback runs on Windows; WeasyPrint in Linux container |

## Smoke verification

```powershell
docker compose exec hr-backend python manage.py verify_all_features
docker compose exec hr-backend python manage.py verify_all_features --jurisdiction KW
python scripts/smoke_logins.py
```
