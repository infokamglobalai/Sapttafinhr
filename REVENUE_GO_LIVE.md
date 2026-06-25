# Platform Revenue Go-Live Checklist

Steps to charge customers after HR product is demo-ready.

## What was fixed in code

| Fix | Detail |
|-----|--------|
| **Razorpay order notes** | Orders now include `schema` / `workspace` so webhooks can activate the right tenant |
| **POST /saas/billing/confirm/** | SPA verifies payment immediately after checkout (no webhook wait) |
| **Billing page** | Always uses Razorpay checkout (test keys locally, live keys in production) |
| **Docker env** | `HR_INTERNAL_BASE_URL`, Razorpay vars passed to `fin-backend` |
| **`.env.example`** | Documents Razorpay + SMTP settings |

## Local verification (Docker required)

```powershell
# Start Docker Desktop, then:
cd c:\Users\ADMIN\Desktop\projects\sapttafinhr
docker compose up --build -d

# HR smoke test
docker compose exec hr-backend python manage.py verify_all_features

# FIN billing tests
docker compose exec fin-backend pytest apps/saas/tests/test_billing.py apps/saas/tests/test_webhook_replay.py -q
```

## Production setup

### 1. Razorpay
- Create merchant account + complete KYC
- **Local `.env`:** Razorpay dashboard → **Test mode** → generate keys (`rzp_test_…`)
- **Production server:** switch to **Live mode** → generate keys (`rzp_live_…`)
- Add to `.env`:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
- Webhook URL: `https://your-domain/api/v1/saas/billing/webhook/`
- Events: `payment.captured`, `order.paid`

### 2. Email (SES or SMTP)
```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=email-smtp.ap-south-1.amazonaws.com
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
DEFAULT_FROM_EMAIL=Saptta <no-reply@saptta.in>
```
Test: password reset, payslip email, dunning (`expire_overdue_subscriptions`).

### 3. Celery (subscription lifecycle)
- `fin-worker` must run with beat schedule
- Daily task `expire_overdue_subscriptions` moves lapsed ACTIVE → PAST_DUE → CANCELLED

### 4. HR provisioning on signup
- `SSO_SHARED_SECRET` identical on FIN + HR
- `HR_INTERNAL_BASE_URL` points to HR service (e.g. `http://hr-backend:8000`)
- Signup with HR plan calls `/internal/provision/` on HR backend

### 5. End-to-end payment test
1. Sign up → subscription PENDING (production `DEBUG=False`)
2. `/app/billing` → choose plan → Razorpay test card
3. Confirm activates subscription → FIN + HR entitlements ACTIVE
4. Product switcher opens both products

## Test card (Razorpay sandbox)

Use Razorpay test mode keys and their documented test card numbers.

## Still manual / ops

- [ ] Terms, Privacy, Refund pages live (already in SPA)
- [ ] GST invoices to your customers (SaaS invoice generation exists post-payment)
- [ ] DB backups (`backup_db` management command + scheduled job)
- [ ] Sentry DSN for error monitoring
- [ ] `DEBUG=False` + prod settings on FIN and HR
