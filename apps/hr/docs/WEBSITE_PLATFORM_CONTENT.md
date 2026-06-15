# Website Content — HRMS + Accounts + AI (Full Platform)

Use this guide for `apps/web` marketing pages. Images are in `apps/web/public/images/` and registered in `apps/web/src/data/marketing-images.ts`.

---

## Your business story (use honestly)

From your About page and project history:

| Year | Milestone | What to say on website |
|------|-----------|-------------------------|
| **2024** | Saptta founded | "Built to replace fragmented payroll and bookkeeping for Indian SMBs" |
| **2025** | Compliance automation | "PF, ESI, TDS, and GST checks before you file" |
| **2026** | Unified HR + Finance | "Payroll posts to your ledger — people and books in one flow" |

**Do not claim "10+ years in business"** unless you have a prior company brand — your product story is **young, fast-moving, India-focused**. That is a strength: modern stack, not legacy ERP baggage.

**Best trust angles for your stage:**
- "Built for Indian compliance from day one"
- "HRMS 79% · Finance 91% feature-complete" (internal metric — soften for public: "production-ready core modules")
- "One login, two products, subscribe to either or both"
- "AI scoped to *your* data — not generic ChatGPT"

**Image:** `saptta-trust-timeline-india.png` → About page + homepage trust strip

---

## Recommended homepage structure

### 1. Hero (replace or augment current hero)

**Headline:** Run your people and your books — on one Indian-ready platform.

**Subhead:** Saptta HRMS for payroll, attendance, and compliance. Saptta Accounts for GST, ledger, and reconciliation. Add AI assistants that answer from your live data.

**CTAs:** Start free trial · Book demo

**Image key:** `unifiedPlatform` (`saptta-unified-platform-hrms-accounts.png`)

**Where in code:** `apps/web/src/pages/Home.tsx` — hero `MarketingImageFrame` → use `imageKey="unifiedPlatform"`

---

### 2. Two-product cards (already exists — improve copy)

Keep the 3-card layout: **HRMS | Complete (featured) | Finance**

| Card | Headline | Bullet upgrade |
|------|----------|----------------|
| HRMS | People ops & payroll | PF · ESI · TDS · Form 16 · AI policy Q&A |
| Finance | Books & GST | GSTR · Ledger · Bank reco · AI invoice queries |
| Complete | Best value | Payroll → ledger sync · One SSO · Unified reports |

**Images:** `modularHrms`, `modularAccounts`, `modularComplete` — optionally replace locals with generated HR/Accounts heroes.

---

### 3. NEW section — "Payroll to books, automatic"

**Why:** This is your **#1 differentiator** vs standalone HR or accounting tools.

**Headline:** When HR runs payroll, finance updates itself.

**Body:** Salary journals, PF/ESI splits, and reimbursements post to Saptta Accounts with correct debit/credit entries. No CSV bridge. No duplicate entry.

**Steps:** Payroll run → Journal posted → Bank matched → GSTR-ready

**Image key:** `payrollToLedgerSync`

**Where to add:** New `ScrollReveal` section in `Home.tsx` after product cards, or on `/about` unified flow section.

---

### 4. NEW section — "AI for HR and AI for Finance"

**Headline:** Three assistants. Each knows its lane.

| Assistant | Product | Example questions |
|-----------|---------|-----------------|
| **HR Assistant** | Saptta HR | "My leave balance?", "Who is on leave Monday?", "Apply casual leave tomorrow" |
| **Finance Assistant** | Saptta Accounts | "Outstanding invoices?", "P&L this month?", "GST liability for March?" |
| **Saptta Guide** | Marketing site / login | "What's in Finance Pro?", "How does payroll sync work?" |

**Important messaging:** AI reads **your tenant data only** — refuses legal/tax advice and cross-module queries with a handoff ("use Finance AI for that").

**Image key:** `dualAiAssistants`

**Where to add:** `Home.tsx` or `/features` page; also good on `/hrms` and `/accounts` accordions.

---

### 5. Product deep-link strips

**HRMS strip** — link `/hrms`
- Image: existing `saptta-hr-hero-dashboard.png` (copy to `public/images/hrms-hero.png`)
- Copy from `docs/WEBSITE_CONTENT.md`

**Accounts strip** — link `/accounts`
- Image key: `accountsFinanceDashboard`
- Headline: GST billing & finance that stays reconciled

---

### 6. Social proof (when you have customers)

Until real logos exist, use:
- Milestone timeline (2024–2026)
- Compliance badges: PF, ESI, GST, TDS, Form 16, GSTR-1/3B
- "Built for 10–500 employee Indian SMBs"

**Image:** `trustTimelineIndia`

---

## Page-by-page content

### `/` Home
| Section | Image key | Message |
|---------|-----------|---------|
| Hero | `unifiedPlatform` | Both products + one login |
| Products | `modularHrms`, `modularComplete`, `modularAccounts` | Pick HR, Finance, or bundle |
| Payroll→Ledger | `payrollToLedgerSync` | Unique connector |
| AI | `dualAiAssistants` | Scoped assistants |
| Automation strip | `automationHire` … `automationGst` | Hire → GST flow |
| Trust | `trustTimelineIndia` | Founded 2024, evolving fast |

### `/hrms`
- Hero image: `productHrms` or `saptta-hr-hero-dashboard.png`
- Accordion item: Policy Hub + HR AI
- Stats: 70% faster payroll, 100% PF/ESI, 24/7 attendance sync (already in `product-pages-data.ts`)

### `/accounts`
- Hero image: `accountsFinanceDashboard`
- Highlight card: "Payroll posts to your ledger" (already exists)
- Compliance badges: GSTR-1, GSTR-3B, E-Invoice, Tally export

### `/products`
- Hero: `productSuite` or `unifiedPlatform`
- Three cards from `productsOverview.productCards`

### `/about`
- Hero: `aboutOffice`
- Unified flow: `aboutUnified` or `payrollToLedgerSync`
- Milestones: use real 2024/2025/2026 timeline (already in About.tsx)
- Trust banner: `trustTimelineIndia`

### `/pricing`
- Three plans: HRMS Starter, Finance Starter, Saptta Complete
- Complete plan CTA: "Payroll-to-ledger sync included"

### `/features`
- Compare table HR vs Finance vs Complete
- AI row: HR Assistant, Finance Assistant, Guide

---

## Copy blocks (ready to paste)

### Elevator pitch (30 sec)
> Saptta gives Indian SMBs HRMS and accounting on one platform. Run attendance and statutory payroll in HR. Run GST invoices and bank reconciliation in Accounts. When you subscribe to both, payroll journals post to your ledger automatically — and AI assistants answer questions from your real data, not the internet.

### HRMS one-liner
> From hire to Form 16 — attendance, leave, PF/ESI payroll, and an HR AI that knows your policies.

### Accounts one-liner
> GST invoices, double-entry ledger, bank reconciliation, and a Finance AI that knows your outstanding and your P&L.

### Complete bundle one-liner
> One login. People and books connected. Payroll syncs to finance. Best value for growing Indian companies.

### AI trust line
> Our AI assistants are embedded in your workspace — they can read leave balances and invoice totals, but they won't give legal advice or leak data across companies.

---

## Image inventory

### New (platform + dual product)
| File | Use |
|------|-----|
| `saptta-unified-platform-hrms-accounts.png` | Homepage hero, /products |
| `saptta-dual-ai-assistants.png` | AI section, /features |
| `saptta-accounts-finance-dashboard.png` | /accounts hero, Finance card |
| `saptta-payroll-to-ledger-sync.png` | Homepage, /about, Complete plan |
| `saptta-trust-timeline-india.png` | /about, homepage trust |

### Earlier HR-focused (still use)
| File | Use |
|------|-----|
| `saptta-hr-hero-dashboard.png` | /hrms |
| `saptta-payroll-flow.png` | HR payroll section |
| `saptta-employee-ess-mobile.png` | Mobile / ESS |
| `saptta-compliance-ai.png` | HR compliance |
| `saptta-logo.png` | Favicon, navbar |

---

## How to wire images in code (developer)

1. Files live in `apps/web/public/images/`
2. Register in `marketing-images.ts` (done for new keys)
3. Use in pages:

```tsx
<MarketingImageFrame imageKey="unifiedPlatform" />
```

4. Rebuild web: `cd apps/web && npm run build`

---

## What converts best for your business stage

| Priority | Why |
|----------|-----|
| **Lead with "HR + Accounts"** | Most competitors sell only one; your bundle is the story |
| **Show payroll→ledger** | Proves "unified" is real, not marketing |
| **AI as helper, not gimmick** | "Ask your leave balance" beats "powered by AI" badges |
| **India compliance badges** | PF, ESI, GST, GSTR — instant credibility for Indian buyers |
| **Honest timeline** | 2024–2026 roadmap builds trust vs fake "since 1999" |
| **Complete plan as hero** | Anchors higher ARPU; HR-only and Finance-only as entry |

---

## Next website tasks (optional)

1. Update `Home.tsx` hero to `imageKey="unifiedPlatform"`
2. Add Payroll→Ledger and AI sections to homepage
3. Set `productHrms` local to `saptta-hr-hero-dashboard.png`
4. Set `productAccounts` local to `saptta-accounts-finance-dashboard.png`
5. Add customer logos to `TrustedBySection` when available
