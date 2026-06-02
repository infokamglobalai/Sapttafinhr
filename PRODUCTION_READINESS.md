# Saptta — Production Readiness Roadmap

What's left to take Saptta from "runs and trials in dev" to "a SaaS you can
charge customers for in production." Rewritten **2026-06-02** after the pivot to
real standalone products (see below). Ordered by what blocks revenue/trust first.

Status legend: 🔴 blocker · 🟠 important · 🟡 polish · ✅ done

---

## Architecture (current, post-pivot)

Three apps under `apps/`, two of them the **real products**:

| App | Role | Stack |
|-----|------|-------|
| `apps/web` | Marketing + auth + pricing + signup + **product switcher** + billing page only | React/Vite/AntD |
| `apps/finance/frontend` | **The real Finance product** (20+ live pages) | React/Vite + react-query + axios |
| `apps/finance/backend` | Finance API (shared by both) | Django + DRF + django-tenants |
| `apps/hr` | **The real HR product** | Django (server-rendered) |

Dev flow (verified in-browser): signup → switcher → **hands off** into the real
Finance app at `{workspace}.localhost:8080` (JWT via `?handoff=`), or the real HR
app at `hr.localhost:8080` (SSO). The old mock dashboards in `apps/web` were
**deleted**. nginx (`deploy/nginx.conf`) routes: bare `localhost`=marketing,
`{ws}.localhost`=Finance app + tenant API, `hr.localhost`=HR.

---

## ✅ Done & verified (don't redo)
- Auth: JWT login/refresh, `/auth/me`, **password reset**, **email verification**,
  login/signup **rate limiting**, **workspace claim** in JWT (resolves the user's tenant).
- Self-serve **signup** provisions FIN tenant (schema+COA+FY) and, for HR plans,
  the HR workspace too (internal provision endpoint).
- **HR SSO** handoff (FIN JWT → HR session) + **Finance JWT handoff** (verified E2E).
- **Trial opens the real products** with the user's own empty workspace (no dummy data).
- Billing: **my-subscription** endpoint + customer **billing portal**; **GST-compliant
  SaaS invoices** (CGST/SGST/IGST split); trial **lifecycle** Celery jobs (expire→PAST_DUE→cancel).
- Ops: nightly **DB backups** (pg_dump), **Sentry** wiring (env-gated), **admin
  suspend/reactivate + audit log**, **CI** (for apps/web + backends).
- Security: prod settings (HSTS, secure cookies, SSL redirect), TLS nginx for the
  marketing/back ends. See [SECURITY.md](SECURITY.md).

---

## 🔴 Blockers — the pivot only works in DEV right now

### 1. Finance product not deployable in production
`finance-web` exists only in `docker-compose.yml` (dev). It is **absent from
`docker-compose.prod.yml`** and **`deploy/nginx.prod.conf`** has no tenant-host /
Finance routing. → In prod a trial has nowhere to hand off to.
**Do:** add a `finance-web` prod service + tenant-host server block in prod nginx.

### 2. Finance frontend has no production build
`apps/finance/frontend/Dockerfile` runs `npm run dev` (Vite dev server). Prod must
**build static assets and serve via nginx** (mirror `deploy/Dockerfile.frontdoor`).
**Do:** multi-stage build (vite build → nginx) baking `VITE_API_BASE_URL=/api/v1`.

### 3. CI doesn't build the Finance product
`.github/workflows/ci.yml` builds `apps/web` and checks the backends but **never
builds `apps/finance/frontend`** — the app you actually ship. Breakage goes uncaught.
**Do:** add a CI job: install + `tsc -b` + `vite build` for `apps/finance/frontend`.

---

## 🟠 Important — trial/revenue completeness

### 4. HR trial workspace is empty (inconsistent first impression)
Finance has a "get started in 4 steps" onboarding; a freshly provisioned HR tenant
has **zero seed data**, so HR opens blank. **Do:** seed a few demo employees /
leave types on HR provision, or add an HR empty-state onboarding.

### 5. Email still goes to the console
`EMAIL_BACKEND` defaults to console in all settings. Verification + password-reset
+ dunning emails **never reach the user**. **Do:** set a real SMTP/SES backend in
prod (vars already plumbed in `.env.prod.example`) and verify a send.

### 6. Payments not live (no conversion path)
No `RAZORPAY_*` keys → checkout returns 503. Trials work but **nobody can pay**.
**Do:** add real keys, test order→checkout→webhook→`activate_subscription` E2E,
confirm a GST invoice is issued.

### 7. Subscription gating not enforced at the product edge
Entitlement middleware exists, but confirm a **PAST_DUE/cancelled** tenant is
actually blocked from the real Finance app + tenant API (not just the marketing
switcher). **Do:** verify the lifecycle → middleware → real-product path end-to-end.

---

## 🟡 Quality / hardening

### 8. Thin automated tests on critical paths
Only ~2 backend test files. **Nothing** covers signup provisioning, JWT workspace
resolution, the SSO/JWT handoffs, my-subscription, or the Finance frontend.
**Do:** add backend tests for signup + handoff token; a smoke/e2e (Playwright) for
trial → real product.

### 9. Docs lag the architecture
README only lightly reflects the marketing-shell→real-products model; older
progress notes describe the deleted mock era. **Do:** refresh README +
SAPTTA_PROGRESS_REPORT to the current architecture.

### 10. Operability leftovers
- No DB **restore** runbook (backups exist; restore untested).
- Sentry/email/Razorpay are env-gated but **no real DSN/keys** wired.
- HR dev `ALLOWED_HOSTS` ignores the compose env (hardcoded) — fine in dev, but a
  prod footgun; the FIN→HR proxy works around it with `Host: localhost`.
- 1.5 MB JS bundles, no code-splitting (both React apps).

### 11. Legal/compliance (needed before a payment processor approves you)
Terms/Privacy/Security/Status pages exist in `apps/web` ✅ — confirm they're
linked from signup/checkout and that a real refund policy + GST-on-own-SaaS
invoicing to customers are in place.

---

## Suggested order
1. **#1–#3** — make the Finance product prod-deployable + CI'd (without this the
   whole pivot is dev-only).
2. **#5, #6** — email + payments (turn on trust + revenue).
3. **#4, #7** — HR trial seed + verify gating at the product edge.
4. **#8–#11** — tests, docs, operability, legal polish.

> Reality check: the hard product + integration work is done and verified in dev.
> The remaining blockers are mostly **"productionize the new architecture"** —
> packaging the real Finance app for prod, then turning on email/payments.
