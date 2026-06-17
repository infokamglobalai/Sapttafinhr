> ⚠️ **SUPERSEDED.** Historical strategy notes only — do not use these numbers.
> **Current, live pricing (ex-GST): HRMS ₹4,999/mo (up to 30 employees, +₹111 each
> after) · Finance ₹4,999/mo (unlimited users) · Complete ₹7,999/mo (save ₹1,999/mo).
> 18% GST added at checkout.** Source of truth: the app + repository
> [README](../../../README.md#subscription-plans).

# Saptta Pricing Strategy — Business Guide (SUPERSEDED)

## Recommendation: **Band pricing + show per-employee** ✅

Your idea (₹4,999 for 1–50 + show per-user cost) is **good for Indian SMB market**.

| Approach | Verdict |
|----------|---------|
| Flat band at signup (₹4,999 for 1–50) | ✅ **Do this** — simple decision |
| Show "₹100/employee" on website | ✅ **Do this** — feels cheaper vs Keka/Zoho (~₹120–150) |
| True per-seat billing every month | ❌ Avoid for now — complex, scares small buyers |
| Custom / Enterprise for 500+ | ✅ **Do this** — protects margin on large deals |

**Bill flat. Display per-employee.** Industry standard for Indian HRMS.

---

## Pricing table (ex-GST, monthly)

### HRMS — by employee band

| Band | Monthly | Annual (≈2 mo free) | Per employee (at 50 max) | Your margin story |
|------|---------|---------------------|--------------------------|-------------------|
| **1 – 50** | **₹4,999** | ₹49,990 | **~₹100** | Entry anchor — your target price |
| 51 – 100 | ₹8,999 | ₹89,990 | ~₹90 | Volume discount |
| 101 – 200 | ₹14,999 | ₹1,49,990 | ~₹75 | Mid-market |
| 201 – 300 | ₹19,999 | ₹1,99,990 | ~₹67 | Growth |
| 301 – 500 | ₹27,999 | ₹2,79,990 | ~₹56 | Scale |
| 500+ | Custom | Custom | Talk to sales | Enterprise |

### Finance (Accounts) — per organisation

| Plan | Monthly | Notes |
|------|---------|-------|
| Saptta Accounts | **₹3,999** | Unlimited finance users; not per employee |

### Complete bundle (HRMS + Accounts)

| Band | Monthly | vs Separate | Savings |
|------|---------|---------------|---------|
| 1 – 50 | **₹7,999** | ₹8,998 | ~₹1,000/mo |
| 51 – 100 | ₹10,999 | ₹12,998 | ~₹2,000/mo |
| 101 – 200 | ₹16,999 | ₹18,998 | ~₹2,000/mo |
| 201 – 300 | ₹21,999 | ₹23,998 | ~₹2,000/mo |
| 301 – 500 | ₹29,999 | ₹31,998 | ~₹2,000/mo |

---

## Registration flow (customer journey)

```
saptta.com → Pricing → Sign up
    ↓
Step 1: Product — HRMS only | Accounts only | Complete (HR+Accounts)
    ↓
Step 2: Employee band — 1-50 | 51-100 | … (skip if Accounts only)
         Show: ₹4,999/mo · just ₹100/employee
    ↓
Step 3: Company + owner account
    ↓
14-day trial → Setup wizard → Invite HR admin / employees
```

---

## What access company gets after purchase

### Included in every plan
- 1 **Owner** login (signup email) — full admin
- Secure workspace (`company.saptta.com` style subdomain)
- 14-day trial then billing
- Email support

### HRMS band purchase adds
| Role | Count | Access |
|------|-------|--------|
| Owner | 1 | Everything + billing |
| HR Admin | Unlimited invites | Payroll, employees, reports |
| Manager | Unlimited invites | Approvals for team only |
| Employee ESS | Up to band limit | Punch, leave, payslips |

**Band limit = active employees in HR**, not login seats.

### Finance purchase adds
| Role | Count | Access |
|------|-------|--------|
| Owner | 1 | Full finance + billing |
| Finance Admin | Unlimited | Ledger, GST, settings |
| Accountant | Unlimited | Invoices, entries, reco |
| Viewer | Unlimited | Reports only |

### Complete = both entitlements on one login

---

## Market positioning (India 2026)

| Competitor style | Typical price | Saptta position |
|------------------|---------------|-----------------|
| Keka / greytHR | ₹99–150/employee/mo | "From ₹100/employee" at 1–50 band |
| Zoho People + Books | Separate products | "One platform, one login" |
| Tally + Excel HR | Cheap but manual | "Compliance + automation" |

**Show savings line on website:**
> "Market tools charge ~₹149/employee. At 50 employees, Saptta HRMS is ₹4,999 — **under ₹100/employee**."

---

## Enterprise / Customize

For 500+ or special needs:
- Custom band pricing
- SSO, API, biometric, multi-branch
- Dedicated onboarding
- Contact sales — do not list price

---

## Project changes when this goes live

1. **Website** — `pricing-data.ts`, updated Pricing + Signup pages ✅
2. **Backend** — Plan `features` JSON: `max_employees`, `band_id`, `products`
3. **Signup API** — store band on subscription
4. **HR middleware** — block adding employee N+1 over band
5. **Razorpay** — charge band price monthly/annual
6. **Billing page** — upgrade band when company grows

---

## Honest website copy (until payroll→ledger sync ships)

**Say:** "Export payroll to Tally XML; unified ledger sync on Complete roadmap"

**Don't say:** "Automatic journal posting" on Complete plan until built.
