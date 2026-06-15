# Developer Guide — Saptta HR

For engineers continuing development on this codebase.

## Repository layout

```
apps/hr/
├── hrms/                    # Django project (settings, urls, celery)
├── apps/
│   ├── tenants/             # Multi-tenant middleware, dashboard, provisioning
│   ├── accounts/            # Auth, roles, SSO hooks
│   ├── employees/           # Employee master, org structure, attrition
│   ├── attendance/          # Punch, register, shifts, regularization
│   ├── leaves/              # Leave types, apply, comp-off
│   ├── payroll/             # Engine, runs, statutory, Form 16, exports
│   ├── reports/             # MIS reports + monthly PDF pack
│   ├── recruitment/         # ATS + AI recruitment tools
│   ├── performance/         # Review cycles + AI draft
│   └── hr_ops/              # Letters, onboarding, exits, AI chat, automation
├── utils/
│   ├── access.py            # RBAC decorators — use these on every new view
│   ├── pdf.py, excel.py
├── templates/               # Server-rendered HTML (DaisyUI/Tailwind)
├── static/                  # CSS, JS, images, manifest.json
└── docs/                    # This documentation package
```

## Local setup

```powershell
cd apps\hr
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
$env:DJANGO_SETTINGS_MODULE = "hrms.settings.development"
python manage.py migrate
python manage.py seed_dummy_login --subdomain sapttadev --email admin@saptta.local --password Saptta@12345
python manage.py runserver 127.0.0.1:8001
```

Login: http://sapttadev.localhost:8001/auth/login/

## Architecture decisions

| Topic | Choice |
|-------|--------|
| UI | Django templates + HTMX + Tailwind/DaisyUI (no separate React SPA for HR app) |
| Tenancy | Subdomain middleware sets `request.tenant`; models use `TenantManager` |
| Auth | Django session auth; roles via `UserRole` → `is_hr_admin`, `is_manager` |
| Payroll | Custom engine in `payroll/engine.py` — not third-party |
| PDF | WeasyPrint (Linux) / xhtml2pdf (Windows dev) |
| Async | Celery + Redis; beat schedule in `hrms/settings/base.py` |
| AI | Anthropic Claude via `anthropic` SDK; feature-flagged by `ANTHROPIC_API_KEY` |

## Adding a new feature

1. **Model** — add `tenant = ForeignKey(Tenant)` and use tenant-scoped queryset
2. **View** — pick decorator from `utils/access.py`:
   - HR-only → `@hr_admin_required`
   - Manager actions → `@manager_or_hr_required` + check `reporting_manager`
   - Employee ESS → `@employee_profile_required`
3. **URL** — register in app `urls.py`, include under `hrms/urls.py` prefix
4. **Template** — match `base.html` nav patterns; add link in correct role block
5. **Audit** — call `apps.hr_ops.services.audit_log()` for sensitive mutations
6. **Notify** — call `notify()` for user-facing events

## Key modules to read first

| Task | Start here |
|------|------------|
| Payroll calculation | `apps/payroll/engine.py` |
| Pre-payroll review | `apps/payroll/review_services.py` |
| RBAC | `utils/access.py` |
| Monthly automation | `apps/hr_ops/tasks.py`, `management/commands/run_monthly_automation.py` |
| AI chat tools | `apps/hr_ops/ai_chat.py` |
| Report pack ZIP | `apps/reports/report_pack.py` |
| Tenant resolution | `apps/tenants/middleware.py` |

## Environment variables (production)

See `.env.example`. Critical:

```
DATABASE_URL=
REDIS_URL=
SECRET_KEY=
FIELD_ENCRYPTION_KEY=
ALLOWED_HOSTS=
EMAIL_HOST / ANYMAIL_*
ANTHROPIC_API_KEY=
AWS_* (if using Spaces for media)
```

## Celery

```powershell
celery -A hrms worker -l info
celery -A hrms beat -l info
```

Beat entries (in `base.py`):
- `monthly_payroll_kickoff_task` — 1st 7:00
- `monthly_hr_report_pack_task` — 1st 7:30
- Payroll reminders — daily from 25th

## Testing

```powershell
python manage.py test
```

Current coverage is thin (`tenants/tests.py`). Add tests for:
- Payroll engine edge cases (LOP, statutory caps)
- RBAC decorators (403 for wrong role)
- Comp-off redeem on leave approval

## Common pitfalls

1. **Forgetting `@hr_admin_required`** on export views — exposes bank account numbers
2. **`role__in` on User** — use `user_roles__role__name__in`
3. **Windows PDF** — WeasyPrint may fail; xhtml2pdf fallback in `utils/pdf.py`
4. **Tenant context in Celery** — pass `tenant_id` into tasks explicitly
5. **Manager without profile** — views must handle `employee_profile is None`

## Deployment sketch

1. PostgreSQL + Redis on same VPC
2. Gunicorn: `gunicorn hrms.wsgi:application`
3. Nginx reverse proxy with TLS + subdomain wildcard
4. `collectstatic` + WhiteNoise or CDN
5. Celery worker + beat as separate systemd services
6. Run migrations per release: `python manage.py migrate`

## API / mobile future

CORS headers are configured (`django-cors-headers`). REST APIs are not fully exposed yet — most endpoints are server-rendered forms. For mobile API:
- Add DRF viewsets per app
- Reuse `utils/access.py` permission classes
- JWT or session token per tenant

## Contributing checklist

- [ ] RBAC decorator on new views
- [ ] Tenant filter on all querysets
- [ ] No secrets in git
- [ ] Migration if model changed
- [ ] Update `docs/FEATURES.md` and `docs/RBAC.md` if user-facing

## Contact / handoff

- Demo logins: `DEV_LOGIN.md`
- Go-live: `docs/GO_LIVE_CHECKLIST.md`
- Product story: `docs/WEBSITE_CONTENT.md`
