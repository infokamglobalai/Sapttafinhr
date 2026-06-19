# GCC & Kuwait — Languages for HRMS

## What customers expect

| Market | Official / business languages | Typical HRMS need |
|--------|------------------------------|-------------------|
| **Kuwait** | Arabic (official), English (business) | **Arabic + English** |
| **UAE** | Arabic (official), English (widely used) | **Arabic + English** |
| **Saudi Arabia** | Arabic (official) | **Arabic + English** (expat workforce) |
| **Bahrain** | Arabic | Arabic + English |
| **Oman** | Arabic | Arabic + English |
| **Qatar** | Arabic | Arabic + English |

## Recommended Saptta language pack (phased)

| Phase | Deliverable |
|-------|-------------|
| **Now (P0)** | English UI default; honest GCC copy; `country` / jurisdiction on tenant |
| **P1** | **Arabic (`ar`)** UI strings for core HR (nav, dashboard, leave, attendance) + **RTL layout** |
| **P2** | Bilingual payslips & letters (EN + AR); optional Hindi (`hi`) for India expats in GCC |
| **P3** | Employee-facing ESS in preferred language per user profile |

## Languages we can provide

| Code | Language | Priority | Notes |
|------|----------|----------|-------|
| `en` | English | **Shipped** | Default for all regions |
| `ar` | Modern Standard Arabic | **P1 — highest GCC value** | Requires RTL (`dir="rtl"`), Arabic numerals option |
| `hi` | Hindi | P2 optional | Large Indian expat population in Kuwait/UAE |
| `ur` | Urdu | P3 optional | Pakistan expats in GCC |
| `ml` | Malayalam | P3 optional | Kerala workforce in Gulf |
| `ta` | Tamil | P3 optional | South India expats |

French is **not** required for Kuwait/GCC HR (unlike North/West Africa).

## Technical approach (when building P1)

1. Django `LocaleMiddleware` + `LANGUAGES = [("en", "English"), ("ar", "Arabic")]`
2. Tenant or user preference: `ui_language` field (`en` default, `ar` for GCC)
3. RTL: `{% if ui_language == 'ar' %}dir="rtl"{% endif %}` on `<html>`
4. Translate: nav labels, dashboard KPIs, leave types, email templates
5. **Do not machine-translate statutory/legal text** — use consultant-reviewed Arabic for payslip labels

## Honest status today

- **English only** in HR UI
- GCC tenants get jurisdiction-aware copy (not full Arabic UI yet)
- Marketing site: English + INR/USD pricing footnotes
