# Saptta — Security Checklist

Status of Phase 1 (Production Safety) controls + the operational security
checklist for deployment. ✅ done · 🟠 partial · 🔴 todo

## Authentication & accounts
- ✅ JWT auth (SimpleJWT) with `email`/`full_name`/`is_verified` claims; access + refresh.
- ✅ Strong signing secret enforced — `config.settings.prod` refuses to boot with
  the dev default; no more `InsecureKeyLengthWarning`.
- ✅ **Password reset** — request + confirm endpoints, Django `default_token_generator`
  (single-use, invalidated on password/last-login change), enumeration-safe.
  Verified: confirm 200 → new login 200, old password 401, token reuse 400.
- ✅ **Email verification** — signed, self-expiring tokens (`signing.dumps`);
  `is_verified` flag; optional login gate (`REQUIRE_EMAIL_VERIFICATION=True`);
  verification email sent on signup.
- ✅ **Brute-force protection** — DRF `ScopedRateThrottle`: login 10/min, signup
  5/h, password-reset 5/h, email-verify 5/h (env-tunable). Verified: 429 after 10.
- ✅ Password validators (length/common/numeric/similarity) on set + reset.
- 🔴 MFA/2FA — not implemented.
- 🟠 Refresh-token rotation is on; blacklist-on-logout is off.

## Transport & headers
- ✅ Prod nginx (`deploy/nginx.prod.conf`): TLS 1.2/1.3, HTTP→HTTPS redirect, HSTS
  (1y, preload), ACME challenge passthrough.
- ✅ `config.settings.prod`: `SECURE_SSL_REDIRECT`, HSTS, `SESSION/CSRF_COOKIE_SECURE`,
  `SESSION_COOKIE_HTTPONLY`, `SECURE_CONTENT_TYPE_NOSNIFF`, `X_FRAME_OPTIONS=DENY`,
  `CSRF_TRUSTED_ORIGINS`, `SECURE_PROXY_SSL_HEADER`.
- ✅ App host sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- ✅ HR iframe embedding scoped via `frame-ancestors` CSP (not blanket DENY).
- 🔴 Full Content-Security-Policy for the SPA (script-src etc.).

## Tenant isolation & data
- ✅ Schema-per-tenant (django-tenants); tenant resolved by subdomain.
- ✅ Per-product entitlement middleware blocks tenants without an active sub.
- ✅ PII at rest: HR encrypts Aadhaar/PAN/bank via Fernet.
- 🟠 Secrets via env (`.env*` gitignored; `.env.prod.example` documents the vars).
  Move to a secrets manager (SSM/Vault) for real prod.

## Runtime
- ✅ Prod runs **gunicorn** (4 workers), `DEBUG=False`, `config.settings.prod`;
  no source bind-mounts; `restart: always`.
- ✅ Email backend configurable (SMTP/SES); dev = console.
- 🔴 WAF / IP allowlisting on admin.

## Operational (tracked in PRODUCTION_READINESS.md)
- 🔴 Automated DB backups + restore runbook.
- 🔴 Sentry DSN wired + uptime monitoring + alerting.
- 🔴 Audit logging of admin/support actions.
- 🔴 Dependency scanning + CI security checks.

## Pre-launch checklist
- [ ] Replace all `CHANGE-ME` in `.env.prod`; rotate dev keys.
- [ ] Real domain in `nginx.prod.conf` + DNS for `app`, `*`, `hr` subdomains.
- [ ] Valid TLS cert mounted at `/etc/nginx/certs` (certbot/Let's Encrypt).
- [ ] `REQUIRE_EMAIL_VERIFICATION=True`; verified sending domain (SPF/DKIM/DMARC).
- [ ] `python manage.py check --deploy` clean on both backends.
- [ ] Backups scheduled + a test restore performed.
- [ ] Sentry + uptime monitor live.
