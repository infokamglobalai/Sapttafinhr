# Kuwait & GCC HRMS — Full Build Scope

**Status today (Jun 2026):** Core HR works for all jurisdictions. **India payroll is production-grade.** **GCC payroll is MVP/demo-ready** — jurisdiction engine, salary bootstrap, PIFSS/GOSI, indemnity/EOS accrual, bank/WPS export stubs, compliance fields, Arabic RTL layout.

**Honest sell today (Kuwait/GCC):** Full HRMS + demo-ready GCC payroll. Bank file layouts and statutory filing integrations need validation with local consultants before go-live filing.

---

## Phase 0 — Foundation (all GCC countries)

| # | Module | What to create |
|---|--------|----------------|
| 1 | **Payroll jurisdiction** | `Tenant.payroll_jurisdiction` enum: `IN`, `KW`, `AE`, `SA`, `BH`, `OM`, `QA` — drives engine, UI, exports |
| 2 | **Locale defaults** | On signup: `country=KW` → `currency=KWD`, `timezone=Asia/Kuwait`, jurisdiction=KW |
| 3 | **Feature gating** | Hide India-only nav (PF, ESI, Form 16, Tally) when jurisdiction ≠ IN |
| 4 | **Employee ID fields** | Replace PAN/Aadhaar/UAN with jurisdiction profile: Civil ID, residency, passport, work permit, sponsorship |
| 5 | **Salary currency** | KWD 3 decimals; AED 2; SAR 2 — payroll amounts stored in tenant currency |
| 6 | **Holiday calendar packs** | Seed Kuwait + optional GCC public holidays per country |
| 7 | **Leave policy packs** | Kuwait Labour Law defaults (annual 30d, sick, maternity) — configurable |
| 8 | **Billing copy** | Website: “Core HR today · GCC payroll on roadmap” |

---

## Phase 1 — Kuwait MVP (priority)

### A. Employee master (Kuwait-specific)

| Field | Purpose |
|-------|---------|
| Civil ID (12-digit) | PACI / identity |
| Residency (iqama-style) number | Work authorization |
| Passport number + expiry | Travel / compliance |
| Work permit / article number | Manpower ministry |
| Nationality | Kuwaiti vs expat (affects PIFSS) |
| Sponsor / company file number | Establishment linkage |
| Contract type | Limited vs unlimited (indemnity rules) |
| Contract start / end | EOS calculation |
| Bank IBAN (KWD) | Salary transfer |
| PIFSS registration number | Kuwaiti nationals only |

### B. Leave (Law No. 6/2010)

| Leave type | Rule (default seed) |
|------------|---------------------|
| Annual | 30 days / year after 1 year service |
| Sick | Per labour law tiers |
| Maternity | 70 days |
| Hajj | Once during service (if Muslim, 2+ years) |
| Unpaid | Admin-configurable |

### C. Payroll engine — Kuwait

| Component | Notes |
|-----------|--------|
| Basic salary | Fixed monthly KWD |
| Housing allowance | Common split for indemnity base |
| Transport / other allowances | Tax-free in Kuwait (no income tax) |
| **PIFSS** (employer + employee) | Kuwaiti nationals in private sector — rates configurable |
| **No TDS** | Kuwait has no personal income tax on employment |
| **End-of-service indemnity accrual** | Monthly employer accrual on payslip |
| **EOS settlement** | On exit: 15 days/year first 5 years; 1 month/year after (limited contract rules) |
| Pro-rata | Join/exit mid-month |
| LOP | From attendance |

### D. Statutory exports — Kuwait

| Export | Format |
|--------|--------|
| Salary register | Excel/PDF in KWD |
| Bank transfer file | Local bank format (KIB/NBK/etc. templates) |
| PIFSS contribution report | Per PIFSS filing layout (when integrated) |
| EOS settlement statement | PDF for exit workflow |
| Manpower / establishment report | Headcount + nationality mix (MVP: CSV) |

### E. Documents & compliance alerts

| Item | Alert |
|------|-------|
| Residency expiry | 30 / 60 / 90 days |
| Passport expiry | Same |
| Work permit renewal | Same |
| Civil ID expiry | Same |

### F. Reports

- Headcount by nationality (Kuwaiti vs expat)
- Indemnity liability report
- PIFSS summary
- WPS-style salary payment audit (when bank file spec confirmed)

---

## Phase 2 — UAE add-on

| Item | Notes |
|------|--------|
| MOHRE contract types | Limited / unlimited |
| **Gratuity (EOS)** | 21 days/year years 1–5; 30 days/year after |
| **WPS SIF file** | Salary Information File for banks |
| GPSSA | UAE nationals pension |
| ILAE / work permit fields | Establishment card, labour card |

---

## Phase 3 — Saudi Arabia add-on

| Item | Notes |
|------|--------|
| **GOSI** | Social insurance contributions |
| **WPS (Mudad / Qiwa)** | Wage protection file |
| EOS gratuity | Saudi labour law formula |
| Iqama / Muqeem fields | Residency |
| Nitaqat / Saudization | Headcount ratio dashboard (reporting) |

---

## Phase 4 — Bahrain, Oman, Qatar

| Country | Key statutory |
|---------|----------------|
| **Bahrain** | SIO (Social Insurance), LMRA work permits |
| **Oman** | PASI, Ministry of Labour filings |
| **Qatar** | MOL, WPS, QID, end-of-service gratuity |

---

## Shared platform (all phases)

| Area | Deliverables |
|------|--------------|
| **Setup wizard** | Country picker → jurisdiction + currency + holiday/leave packs |
| **Payslip** | Bilingual EN/AR template (optional Phase 1.5) |
| **Exit workflow** | EOS/indemnity estimate → settlement letter → login revoke |
| **Finance sync** | Payroll journal export (Complete plan) — jurisdiction-aware |
| **Tests** | `verify_all_features` GCC branch; Kuwait payroll lifecycle test module |
| **Marketing** | `/pricing` GCC tab: core HR today, payroll roadmap |

---

## What works today without building (Kuwait demo)

| Module | Ready? |
|--------|--------|
| Employee directory, org chart | Yes |
| Web attendance punch | Yes |
| Leave apply / approve | Yes (generic rules — not Kuwait law defaults) |
| Performance reviews | Yes |
| Recruitment + careers pages | Yes |
| Policies, letters, assets | Yes |
| **Kuwait payroll / PIFSS / indemnity** | **No** |
| **Residency expiry alerts** | **No** (generic doc expiry only) |

---

## Suggested build order

1. **P0** (1 week) — Jurisdiction flag, feature gating, KWD defaults, honest marketing
2. **P1 Kuwait** (4–6 weeks) — Employee GCC fields, leave pack, indemnity engine, bank file, exports
3. **P2 UAE** — WPS + gratuity
4. **P3 KSA** — GOSI + WPS
5. **P4** — BH, OM, QA

---

## Effort summary

| Phase | New models/migrations | Engine | Exports | Tests |
|-------|----------------------|--------|---------|-------|
| P0 | 1 tenant field | — | — | 5 |
| P1 KW | ~15 employee fields, indemnity models | Kuwait engine | 4 files | 20+ |
| P2 AE | MOHRE fields | UAE engine | WPS SIF | 15+ |
| P3 SA | GOSI fields | KSA engine | WPS | 15+ |

*Validate all rates and formulas with a Kuwait/GCC payroll consultant before go-live.*
