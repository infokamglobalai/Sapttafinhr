# Kuwait & GCC HRMS — Full Build Scope

**Status today (Jun 2026):** Core HR works for all jurisdictions. **India payroll is production-grade.** **GCC payroll is MVP/demo-ready** — jurisdiction engine, salary bootstrap, PIFSS/GOSI, indemnity/EOS accrual, bank/WPS export stubs, compliance fields, Arabic RTL layout, **bilingual payslips**, **manpower report**, **org chart**.

**Honest sell today (Kuwait/GCC):** Full HRMS + demo-ready GCC payroll. Bank file layouts and statutory filing integrations need validation with local consultants before go-live filing.

---

## Phase 0 — Foundation (all GCC countries) ✅ Shipped

| # | Module | Status |
|---|--------|--------|
| 1 | **Payroll jurisdiction** | ✅ `IN`, `KW`, `AE`, `SA`, `BH`, `OM`, `QA` |
| 2 | **Locale defaults** | ✅ Country → currency, timezone, jurisdiction |
| 3 | **Feature gating** | ✅ India-only nav hidden when jurisdiction ≠ IN |
| 4 | **Employee ID fields** | ✅ Civil ID, residency, passport, PIFSS, contract type |
| 5 | **Salary currency** | ✅ KWD 3 decimals; AED/SAR 2 |
| 6 | **Holiday calendar packs** | ✅ Kuwait + GCC fixed holidays seeded |
| 7 | **Leave policy packs** | ✅ Kuwait Labour Law defaults seeded |
| 8 | **Org chart** | ✅ Visual chart from reporting managers |
| 9 | **Manpower report** | ✅ Kuwaiti vs expat + nationality Excel |
| 10 | **GCC readiness banner** | ✅ Consultant validation reminder in UI |
| 11 | **Bilingual payslips** | ✅ EN/AR labels on GCC payslip PDF |

---

## Phase 1 — Kuwait MVP (priority)

### A. Employee master (Kuwait-specific) — ✅ Mostly done

| Field | Status |
|-------|--------|
| Civil ID, residency, passport, work permit | ✅ |
| Nationality, PIFSS, contract type | ✅ |
| Bank IBAN (KWD) | ✅ via bank accounts |

### B. Leave (Law No. 6/2010) — ✅ Seeded defaults

### C. Payroll engine — Kuwait — ✅ MVP

| Component | Status |
|-----------|--------|
| Basic + housing + allowances | ✅ |
| PIFSS (Kuwaiti nationals) | ✅ configurable rates |
| End-of-service indemnity accrual | ✅ |
| EOS settlement on exit | ✅ estimate |

### D. Statutory exports — Kuwait — ⚠️ Pre-validate in app + consultant sign-off

| Export | Status |
|--------|--------|
| Salary register | ✅ Excel |
| Bank transfer file | ✅ CSV with IBAN/SWIFT validation |
| PIFSS contribution report | ✅ Excel |
| WPS SIF | ✅ CSV with IBAN/SWIFT validation + readiness panel on payroll run |
| EOS liability snapshot | ✅ Excel |
| Manpower / establishment | ✅ Excel + UI report |

### E. Documents & compliance alerts — ✅ Shipped

| Item | Status |
|------|--------|
| Residency / passport / work permit / civil ID expiry | ✅ Daily alerts (30-day window) |
| Document upload expiry | ✅ |

### F. Reports — ✅ P0 shipped

- Headcount by nationality (Kuwaiti vs expat) — **Manpower report**
- Indemnity liability report — **EOS export**
- Visual org chart — **Org chart page**

---

## What works today (Kuwait demo)

| Module | Ready? |
|--------|--------|
| Employee directory, **org chart** | ✅ Yes |
| Web attendance punch | ✅ Yes |
| Leave apply / approve | ✅ Yes (Kuwait leave pack on provision) |
| Performance reviews | ✅ Yes |
| Recruitment + careers pages | ✅ Yes |
| Policies, letters, assets | ✅ Yes |
| **Kuwait payroll / PIFSS / indemnity** | ⚠️ MVP — validate before filing |
| **Residency expiry alerts** | ✅ Yes |
| **Manpower report** | ✅ Yes |
| **Bilingual payslips** | ✅ Yes |

---

## Suggested build order (remaining)

### Platform P1 — ✅ shipped (India + GCC)
- Payroll → Finance ledger journal sync on publish
- In-account billing (subscription + invoices in Settings)
- Mobile punch card + PWA install prompt
- WhatsApp payslip delivery (tenant currency)
- Expense category picker + OT summary on ESS
- Security & Trust settings tab

### Country statutory (consultant-validated)
1. **P1 Kuwait filing** — Validate bank WPS + PIFSS layouts with local consultant
2. **P2 UAE** — WPS SIF (validated) + gratuity + GPSSA
3. **P3 KSA** — GOSI + Mudad WPS + Saudization dashboard
4. **P4** — BH, OM, QA statutory formats

*Validate all rates and formulas with a Kuwait/GCC payroll consultant before go-live.*
