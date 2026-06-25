# Go-Live Checklist — Saptta HR

Use this checklist before pointing a customer domain at production.

## Infrastructure

- [ ] **PostgreSQL** — set `DATABASE_URL` (not SQLite)
- [ ] **Redis** — set `REDIS_URL` for Celery and caching
- [ ] **Celery worker + beat** — `docker compose -f docker-compose.prod.yml up -d hr-worker` (payslip delivery, payroll reminders, monthly report pack)
- [ ] **Static files** — `python manage.py collectstatic` + WhiteNoise or CDN
- [ ] **Media storage** — S3/Spaces via `django-storages` for documents and payslips
- [ ] **HTTPS** — TLS certificate on reverse proxy (nginx/Caddy)
- [ ] **ALLOWED_HOSTS** — customer subdomain + apex domain
- [ ] **SECRET_KEY** — unique per environment
- [ ] **FIELD_ENCRYPTION_KEY** — for Aadhaar/bank field encryption (`cryptography`)

## Email & notifications

- [ ] **SMTP** — configure `EMAIL_*` or Anymail provider
- [ ] Test payslip publish email
- [ ] Test Form 16 issue email
- [ ] Test monthly HR report pack email (1st of month automation)
- [ ] Test payroll kickoff email (1st of month)

## AI (optional but marketed)

- [ ] `ANTHROPIC_API_KEY` in `.env`
- [ ] `ANTHROPIC_MODEL` (default: `claude-sonnet-4-6`)
- [ ] Verify HR chat widget, policy Q&A, recruitment JD, resume parse, performance draft

## Security & RBAC

- [x] HR admin gates on employee CRUD, payroll exports, recruitment, performance cycles
- [ ] Review tenant provisioning and super-admin access
- [ ] Rotate demo passwords (`seed_dummy_login` is dev-only)
- [ ] Enable audit log review (`/hr/audit/`)

## Data setup (per tenant)

- [ ] Create tenant / workspace subdomain
- [ ] HR admin user with `hr_admin` role
- [ ] Departments, designations, locations
- [ ] Leave types (incl. **CO** for comp-off if used)
- [ ] Holiday calendar
- [ ] Salary structures + employee salaries
- [ ] Statutory settings (PF, ESI, PT, LWF, TDS)
- [ ] Shifts (if using punch attendance)
- [ ] Letter templates + company settings

## Payroll month-end smoke test

1. Attendance locked for month
2. `/payroll/review/` — pre-payroll readiness
3. Create payroll run → recompute
4. Per-employee review (LOP override, bonus, deductions)
5. Approve → Publish
6. Employee sees payslip; bank advice + salary register export
7. PF ECR / ESI / Tally XML if needed

## Automation smoke test

```powershell
python manage.py run_monthly_automation --action all --tenant <subdomain>
python manage.py check_go_live_readiness --strict
```

## Post go-live

- [ ] Backup schedule (DB + media)
- [ ] Error monitoring (Sentry or similar)
- [ ] Support contact on login page
- [ ] User manuals shared with customer (see `docs/MANUAL_*.md`)
