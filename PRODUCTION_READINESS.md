# Saptta — Production Readiness Roadmap

What's missing to take this from "runs locally, demoable" to "a SaaS you can
charge customers for." Findings are from inspecting the code on 2026-05-30 and
running the full stack via `docker compose`. Ordered by what blocks revenue and
trust first.

Status legend: 🔴 blocker · 🟠 important · 🟡 polish · ✅ done

> **Phase 1 (Production Safety) — IMPLEMENTED & verified 2026-05-31.** Password
> reset, email verification, configurable email backend, login/signup rate
> limiting (verified 429 after 10), gunicorn prod runtime
> (`docker-compose.prod.yml`), and TLS/HSTS/secure-cookies
> (`deploy/nginx.prod.conf` + `config.settings.prod`). See
> [SECURITY.md](SECURITY.md). Findings #3, #4, #5, #6, #8 are now done; remaining
> work is Phases 2–4 (billing, HR SSO, ops).

---

## 0. What already works (verified by running it)
- ✅ Unified front door (nginx) — one origin, host-based routing to SPA / FIN API / HR
- ✅ Real login → JWT (email/full_name claims), `/auth/me`, token refresh
- ✅ Multi-tenant data isolation (django-tenants schema-per-tenant; `acme.localhost` → Acme's data)
- ✅ Per-product entitlement gating (FIN/HR) enforced in middleware
- ✅ Self-serve signup provisions a FIN workspace (schema + user + subscription + company/COA/FY)
- ✅ CORS correct for SPA→tenant calls; strong JWT secret; HR iframe embeddable

---

## 1. 🔴 Revenue path — you cannot charge anyone yet
**Finding:** no payment integration anywhere in `apps/saas` (the SaaS billing layer).
`Subscription`/`SubscriptionEntitlement` models exist, but nothing collects money.

Needed:
- **Checkout** — Razorpay (India-first; `razorpay` SDK already used in `apps/banking`)
  or Stripe. "Subscribe"/"Upgrade" button → hosted checkout.
- **Webhooks** — on payment success, flip `Subscription.status` → `ACTIVE` and set
  `current_period_end`; on failure/chargeback → `PAST_DUE`.
- **Plan ↔ price mapping** — `Plan.monthly_price`/`annual_price` already exist;
  wire them to real processor price IDs.
- **Idempotency** — `apps.core.IdempotencyKey` already exists; use it on webhook handlers.

## 2. 🔴 Subscription lifecycle automation — trials never expire
**Finding:** `trial_ends_at` / `PAST_DUE` are defined on the model but **nothing
sets them**. A trial tenant stays usable forever; a non-payer is never suspended.

Needed (Celery is already wired — `fin-worker` runs beat):
- Daily job: `trial_ends_at < today` and unpaid → `PAST_DUE` → (grace) → suspend.
- The entitlement middleware already blocks suspended tenants — just needs the
  status transitions to actually happen.
- Dunning emails before suspension.

## 3. 🔴 Account recovery — no password reset or email verification
**Finding:** FIN `identity` app has **no** password-reset or email-verification flow.
A customer who forgets their password is locked out permanently.

Needed:
- `POST /auth/password/reset/` + reset-confirm (DRF + signed token).
- Email verification on signup (currently anyone can register any email).
- Frontend `/forgot-password` + `/reset-password` pages (don't exist).

## 4. 🔴 Transactional email — nothing can actually send mail
**Finding:** FIN has **no `EMAIL_BACKEND`** set → defaults to console (prints to
logs). HR has anymail/SES configured but FIN doesn't. Password reset, dunning,
invoices, signup verification all depend on this.

Needed: real backend (AWS SES via `django-anymail`, or SMTP) in FIN settings;
`DEFAULT_FROM_EMAIL`; verified sending domain (SPF/DKIM).

## 5. 🔴 HTTPS / TLS — everything is plaintext HTTP
**Finding:** `deploy/nginx.conf` listens on port 80 only; no `ssl_certificate`,
no 443. JWTs and passwords would cross the wire unencrypted in production.

Needed: TLS termination at nginx (Let's Encrypt/Caddy, or a cloud LB),
HTTP→HTTPS redirect, `SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE` (FIN `prod.py`
already sets these — just needs the prod settings module actually used).

## 6. 🔴 Production runtime — running Django's dev server
**Finding:** `docker-compose.yml` runs both backends with `manage.py runserver`
and `DEBUG=True`. The dev server is single-threaded, leaks stack traces, and is
explicitly "do not use in production."

Needed: gunicorn (HR Dockerfile already has the CMD; compose overrides it),
`DEBUG=False`, `DJANGO_SETTINGS_MODULE=config.settings.prod`, real
`ALLOWED_HOSTS`. Split dev vs prod compose files.

---

## 7. 🟠 HR is not actually integrated (the "one product" illusion breaks)
Three linked gaps:
- **No HR SSO** — embedded HR shows its *own* Django login; FIN session isn't
  handed off. User logs in twice.
- **HR not auto-seeded** — FIN seeds `acme`; HR doesn't, so the embed 404s until
  `create_tenant` is run manually.
- **Signup is FIN-only** — a "Saptta Complete" purchase provisions FIN but no HR
  workspace.

Needed: a signed handoff endpoint on HR that trusts the front door and starts a
Django session for the matching user; HR bootstrap command in compose; extend
`signup_views.py` to provision the HR side when the plan includes HR.

## 8. 🟠 Login brute-force protection — none
**Finding:** no throttling/rate-limiting (no `django-axes`, no DRF throttle
classes). Login is open to credential stuffing.

Needed: DRF `DEFAULT_THROTTLE_RATES` on auth endpoints, or `django-axes` for
lockout; rate-limit signup too (it provisions a DB schema per call — abuse =
resource exhaustion).

## 9. 🟠 Setup wizard doesn't persist
**Finding:** `apps/web/src/pages/Setup.tsx` makes **no API calls** — the
onboarding wizard collects company profile / departments / COA choices into local
state and throws them away. Signup already seeds a default company, so this is
purely cosmetic right now.

Needed: wire the wizard to real endpoints (company profile PATCH, HR departments,
COA template selection) or remove it to avoid a false impression.

## 10. 🟠 SaaS operator tooling — only raw Django admin
**Finding:** no workflows to suspend a tenant, cancel/refund a subscription, or
impersonate a user for support. Only model-level CRUD in Django admin.

Needed: a minimal internal ops surface (even Django admin actions): suspend/
reactivate tenant, view subscription state, support impersonation (audited).

## 11. 🟠 No backups / disaster recovery
**Finding:** compose has healthchecks for db/redis but **no backup job** and no
app-container healthchecks. Postgres holds every tenant's schema — losing it
loses all customers.

Needed: automated `pg_dump` (per-schema or full) to off-box storage; restore
runbook; healthchecks on backend containers.

---

## 12. 🟡 Legal & compliance (required before processors will onboard you)
- **No Terms of Service / Privacy Policy / Refund pages** — Razorpay/Stripe
  require these live before activating a merchant account. SPA has no such routes.
- **PII handling** — HR stores Aadhaar/PAN/bank (Fernet-encrypted ✅), but no
  documented data-retention/deletion policy (India DPDP Act).
- **GST on your own SaaS invoices** — you'll need to raise GST-compliant invoices
  *to your customers* for the subscription (ironic given the product does exactly
  this — could dogfood `apps/billing`).

## 13. 🟡 Observability
- FIN has JSON logging + Sentry hooks; HR has Sentry. Neither is wired to a real
  DSN. No uptime monitoring, no error alerting, no request metrics.

## 14. 🟡 Tests & CI
- FIN has `pytest` config and a `ledger/tests` dir; coverage is thin and there's
  no CI pipeline (GitHub Actions) running tests/migrations-check on push.

## 15. 🟡 Frontend polish
- Most dashboard module pages still render **mock data** (only Finance home +
  Invoices are live). Receipts, Ledger, Banking, Reports, all HR module pages.
- 1.5 MB JS bundle, no code-splitting (Vite warns on build).

---

## Suggested sequencing
1. **Make it safe for real users** (even hand-provisioned): #3 password reset,
   #4 email, #5 HTTPS, #6 prod runtime, #8 rate-limit.
2. **Make it sellable**: #1 billing + #2 lifecycle + #12 legal pages.
3. **Make it feel finished**: #7 HR SSO/seed, #9 setup wizard, #15 live pages.
4. **Make it operable**: #10 ops tooling, #11 backups, #13 observability, #14 CI.

> None of this contradicts the architecture — it's the operational layer a SaaS
> needs on top of working features. The product logic (HRMS + Finance) is the
> hard part and it's largely built; this list is mostly "the business around it."
