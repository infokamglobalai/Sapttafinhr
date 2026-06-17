# Saptta — HRMS & Finance SaaS Platform

Two SaaS products — **Saptta HR** (HRMS) and **fin-saptta** (Accounts & Finance) —
sold under one roof, behind one website, one login, and per-product subscriptions.
Targeted at the Indian market with built-in GST, PF, ESI, TDS compliance.

## Architecture — one front door, two backends

```
                         ┌──────────────────────────────┐
   browser ──────────────►  nginx front door  :8080      │  (deploy/nginx.conf)
                         └───────────────┬──────────────┘
        http://localhost:8080            │
        http://acme.localhost:8080       │
          (workspace = subdomain)        │
                                         │
        ┌────────────────────────────────┼───────────────────────────────┐
        ▼                                 ▼                                ▼
   web (SPA)                        fin-backend                      hr-backend
   apps/web  React+Vite+AntD        apps/finance/backend             apps/hr
   marketing + app shell            Django + DRF + JWT               Django (server-rendered)
   one login, product switcher      django-tenants (schema/tenant)   row-level tenancy
                                     /api/v1/* REST                   existing HR pages
```

Why two backends instead of one merged project: **FIN and HR use incompatible
multi-tenancy** (FIN = django-tenants schema-per-tenant + JWT; HR = row-level
tenant FK + session auth + server-rendered templates). Merging would mean
rewriting HR end-to-end. Instead, the **`apps/web` website is the single front
door**: it owns marketing, login, and the subscription/entitlement gating, then
routes users into FIN (via its REST API, rendered in the AntD dashboard) and HR
(its existing pages) — so customers experience one product.

| Product | In the app | Backend | How it's served |
|---------|-----------|---------|-----------------|
| **fin-saptta** | `/app/finance` | `apps/finance/backend` | SPA calls `/api/v1/*` (JWT) |
| **Saptta HR** | `/app/hrms` | `apps/hr` | existing HR pages, embedded |

Subscriptions live in FIN's `apps.saas` (`Plan`, `Subscription`,
`SubscriptionEntitlement` with `ProductCode.FIN`/`HR`). The SPA reads them to
unlock/lock each product in the switcher. See
[PRODUCT_SUBSCRIPTION_ACCESS.md](PRODUCT_SUBSCRIPTION_ACCESS.md).

## Run the whole stack (one command)

Requires Docker. From the repo root:

```bash
cp .env.example .env
# Fill in .env — generate real secrets (do NOT ship the examples):
python -c "import secrets; print('FIN_SECRET_KEY=' + secrets.token_urlsafe(48))"
python -c "import secrets; print('HR_SECRET_KEY=' + secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print('HR_FIELD_ENCRYPTION_KEY=' + Fernet.generate_key().decode())"

docker compose up --build
```

> **Hosts file (required on Windows; usually automatic on Linux/macOS).**
> The stack routes by subdomain, so `*.localhost` must resolve to 127.0.0.1.
> Most Linux/macOS resolve `*.localhost` automatically. On **Windows**, add to
> `C:\Windows\System32\drivers\etc\hosts`:
> ```
> 127.0.0.1 localhost acme.localhost hr.localhost
> ```
> Add one line per workspace subdomain you create.

Then:

| URL | What |
|-----|------|
| http://localhost:8080 | the website (marketing + login) |
| http://acme.localhost:8080 | the `acme` workspace app (after sign-in) |
| http://hr.localhost:8080 | HR backend pages |
| http://localhost:8080/admin/ | FIN Django admin |

FIN seeds a dev tenant automatically (`bootstrap_dev`): workspace **acme**,
login **admin@acme.test / admin12345** (FIN entitlement active).

Provision an HR workspace + admin:

```bash
docker compose exec hr-backend python manage.py seed_permissions
docker compose exec hr-backend python manage.py create_tenant \
  --name "Acme Pvt Ltd" --subdomain acme --email admin@acme.test --password admin12345
```

> `*.localhost` resolves to 127.0.0.1 automatically on most Linux/macOS. On
> Windows, add `127.0.0.1 acme.localhost hr.localhost` to
> `C:\Windows\System32\drivers\etc\hosts`.

### Front-end only (mock-free, against a running FIN backend)

```bash
cd apps/web
npm install
cp .env.example .env.local      # point VITE_*_API_BASE_URL at your backend
npm run dev                      # http://localhost:5173
```

The SPA talks to two API surfaces (see [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)):
- **platform** (`VITE_PLATFORM_API_BASE_URL`, bare host) — auth + saas (public schema)
- **tenant** (`VITE_TENANT_API_BASE_URL` with `{workspace}`) — business resources

## Repository layout

```
saptta/
├── docker-compose.yml          # the unified dev stack
├── deploy/nginx.conf           # the front door (host-based routing)
├── .env.example                # stack-wide env
└── apps/
    ├── web/                    # THE WEBSITE = the product (React+Vite+AntD)
    │   ├── src/lib/api.ts      #   real API client (JWT + refresh, 2 surfaces)
    │   ├── src/contexts/AuthContext.tsx   # real login/me/logout + entitlements→products
    │   ├── src/pages/          #   marketing, auth, /app switcher, dashboards
    │   └── Dockerfile
    ├── finance/                # FIN backend (Django + DRF + django-tenants)
    │   └── backend/apps/…      #   identity, saas, masters, ledger, billing, …
    └── hr/                     # HR backend (Django, server-rendered)
        └── apps/…              #   accounts, employees, attendance, payroll, …
```

## Status & known gaps

Done:
- Unified front door (nginx + docker compose), single git repo.
- Real SPA auth against FIN JWT (login + refresh), entitlement→product gating
  in the product switcher.
- **Self-serve signup** — `POST /api/v1/saas/signup/` provisions a workspace
  (tenant schema + owner user + subscription/entitlements + company/COA/FY) and
  signs the user straight in. Wired to the website Signup page.
- **HR embedded** — `/app/hrms/workspace` renders the live HR Django app inside
  the shell (iframe + "open in new tab"); HR sidebar has a "Live HR App" entry.
- **FIN live data path proven** — the Finance dashboard calls the real tenant
  API (`/masters/*`) and shows a live/demo connection banner.
- JWT now carries `email`/`full_name` and login returns a `user` object.

Remaining gaps for full production SaaS:
1. **HR SSO** — HR uses its own Django session login; there's no token handoff
   from the FIN identity yet, so users sign in to HR once inside the embed.
   Signup also provisions only the FIN side; an HR workspace is created via
   `create_tenant` (see above).
2. **No "my subscription" endpoint** and **no tenant claim in the JWT** — the
   SPA infers products from the subscription list as a stopgap, and the active
   workspace is tracked client-side.
3. **Most dashboard pages still use demo data** — only the Finance home is
   wired to live APIs; the per-module pages (Invoices, Ledger, …) are next.

## Subscription plans

| Plan | Products | Price (ex-GST) |
|------|----------|----------------|
| Saptta HRMS | Saptta HR (up to 30 employees) | ₹4,999 / mo · +₹111 per extra employee |
| Saptta Finance | fin-saptta (unlimited users) | ₹4,999 / mo |
| **Saptta Complete** | Both products + Portal + AI | ₹7,999 / mo (up to 30 employees · save ₹1,999/mo) |

HRMS and Complete include up to 30 employees in the base price; each additional employee
is ₹111/month. Finance is flat with unlimited users. **All prices are exclusive of 18%
GST**, which is added at checkout. All plans include a 14-day free trial.

## License

Proprietary — © Saptta Tech Solutions
