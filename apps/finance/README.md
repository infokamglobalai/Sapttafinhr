# fin-saptta — Accounts & Finance SaaS

Multi-tenant cloud accounting platform for the Indian market. Handles GST (CGST/SGST/IGST), e-invoicing (IRN), e-way bills, TDS/TCS, multi-company consolidation, and full double-entry bookkeeping — all from a single codebase.

**Stack:** Django 5.0 + DRF · React 18 PWA · PostgreSQL 16 (schema-per-tenant via `django-tenants`) · Redis · Celery · Docker Compose

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Quick Start (Local)](#quick-start-local-no-docker)
4. [Architecture Overview](#architecture-overview)
5. [Project Structure](#project-structure)
6. [Backend Modules](#backend-modules)
7. [Frontend Features](#frontend-features)
8. [API Reference](#api-reference)
9. [Database & Multi-Tenancy](#database--multi-tenancy)
10. [Core Invariant: Double-Entry Engine](#core-invariant-double-entry-engine)
11. [Background Jobs (Celery Beat)](#background-jobs-celery-beat)
12. [Reports & Downloads](#reports--downloads)
13. [Environment Variables](#environment-variables)
14. [Running Tests](#running-tests)
15. [Deployment](#deployment)

---

## Prerequisites

- **Docker Desktop** (recommended) — https://www.docker.com/products/docker-desktop/
- OR a local install of:
  - Python 3.11+
  - PostgreSQL 14+ (required — `django-tenants` does not support SQLite)
  - Redis 6+
  - Node 20+

### Windows hosts file

The dev tenant uses `acme.localhost`. Most systems resolve `*.localhost` to `127.0.0.1` automatically. If not, add to `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1   acme.localhost
```

---

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

| Service     | URL                                     |
|-------------|-----------------------------------------|
| Frontend    | http://localhost:5173                    |
| Backend API | http://acme.localhost:8000/api/v1/       |
| Admin Panel | http://acme.localhost:8000/admin/        |
| Swagger     | http://acme.localhost:8000/api/docs/     |
| OpenAPI     | http://acme.localhost:8000/api/schema/   |

Dev seed (auto-created by `bootstrap_dev`):
- **Tenant domain:** `acme.localhost:8000`
- **Superuser:** `admin@acme.test` / `admin12345`
- **Company:** Acme Pvt Ltd (Indian COA template, demo HSN codes, items, parties)
- **Fiscal Year:** FY26-27

---

## Quick Start (Local, no Docker)

```bash
# 1. PostgreSQL: create db + user matching .env
createdb finsaptta
createuser finsaptta -P    # password: finsaptta

# 2. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate           # Windows
# source .venv/bin/activate      # macOS/Linux
pip install -r requirements.txt -r requirements-dev.txt
python manage.py migrate_schemas --shared
python manage.py bootstrap_dev
python manage.py runserver

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    React 18 PWA                      │
│         (Vite · TailwindCSS · React Query)           │
└──────────────────────┬───────────────────────────────┘
                       │ REST / JSON (JWT Bearer)
┌──────────────────────▼───────────────────────────────┐
│              Django 5.0 + DRF                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Identity │ │ Masters  │ │ Billing  │  ...15 apps  │
│  └──────────┘ └──────────┘ └──────────┘             │
│                      │                               │
│         ┌────────────▼────────────┐                  │
│         │    Posting Engine       │                  │
│         │  Σ debit == Σ credit    │                  │
│         └────────────┬────────────┘                  │
│                      │                               │
│         ┌────────────▼────────────┐                  │
│         │  JournalEntry + Lines   │                  │
│         └─────────────────────────┘                  │
└──────────────────────┬───────────────────────────────┘
                       │
          ┌────────────▼─────────────┐
          │   PostgreSQL 16          │
          │   (schema-per-tenant)    │
          │   public │ acme │ ...    │
          └──────────────────────────┘
                       │
          ┌────────────▼─────────────┐
          │ Redis 7 + Celery Worker  │
          │ (beat scheduler)         │
          └──────────────────────────┘
```

---

## Project Structure

```
fin-saptta/
├── backend/
│   ├── config/                   Django project settings, URLs, WSGI, Celery
│   │   ├── settings/
│   │   │   ├── base.py           All shared settings (DRF, JWT, CORS, Celery Beat)
│   │   │   ├── dev.py            DEBUG = True
│   │   │   └── prod.py           Production overrides
│   │   ├── urls.py               Tenant-schema URLs (full API surface)
│   │   ├── urls_public.py        Public-schema URLs (auth + SaaS signup)
│   │   └── celery.py             Celery app configuration
│   ├── apps/
│   │   ├── core/                 Tenant model, Domain, TimeStampedModel, IdempotencyKey
│   │   ├── identity/             User (email-based), Role, JWT endpoints
│   │   ├── saas/                 Plan, Subscription, SaasInvoice (platform billing)
│   │   ├── masters/              Company, Branch, FiscalYear, Account (COA), Party, Item, HSNCode, CostCenter, Project
│   │   ├── ledger/               JournalEntry, JournalLine (the double-entry spine)
│   │   ├── billing/              Invoice, InvoiceLine, Quotation, SalesOrder, CreditNote, RecurringInvoiceTemplate
│   │   ├── payments/             Receipt, ReceiptAllocation
│   │   ├── procurement/          PurchaseOrder, GRN, VendorBill, VendorPayment (3-way match)
│   │   ├── banking/              BankAccount, BankStatement, Reconciliation, PDC, Advance, FXRate
│   │   ├── inventory/            Warehouse, Bin, Batch, SerialNumber, StockMovement, StockLevel
│   │   ├── assets/               FixedAsset, DepreciationEntry (SLM + WDV methods)
│   │   ├── expenses/             ExpenseClaim, PettyCashFloat, Budget
│   │   ├── taxation/             EInvoiceIRN, EWayBill, GSTR2BLine (ITC reconciliation)
│   │   ├── reports/              Dashboard KPIs, P&L, Balance Sheet, Aging, Day Book, etc.
│   │   ├── publicapi/            APIKey, WebhookSubscription, WebhookDelivery
│   │   ├── notifications/        In-app Notification, OutboundMessage (email/WhatsApp/SMS log)
│   │   └── portal/               PortalAccess (customer/vendor self-service tokens)
│   ├── requirements.txt          Production Python deps
│   ├── requirements-dev.txt      Dev/test deps (pytest, etc.)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                  AppShell (sidebar + routing + Quick Create menu)
│   │   ├── features/
│   │   │   ├── auth/             Login page + auth API
│   │   │   ├── masters/          Parties, Items CRUD pages
│   │   │   ├── billing/          Invoices, Quotations, Sales Orders, Credit Notes, Recurring
│   │   │   ├── payments/         Customer Receipts
│   │   │   ├── procurement/      POs, Vendor Bills, Vendor Payments
│   │   │   ├── banking/          Bank Accounts, PDCs, Reconciliation
│   │   │   ├── inventory/        Warehouses, Stock Movements, Stock Summary
│   │   │   ├── assets/           Fixed Assets register
│   │   │   ├── expenses/         Expense Claims
│   │   │   ├── ledger/           Manual JE, Trial Balance
│   │   │   ├── reports/          13 report pages + PDF/CSV download
│   │   │   └── settings/         Company Profile, Cost Centers, Projects, API Keys, Webhooks
│   │   ├── components/           PageHeader, SimpleTable, Modal, Toaster, ConfirmDialog, etc.
│   │   ├── hooks/                useActiveCompany
│   │   ├── store/                Zustand auth store
│   │   └── lib/                  Axios API client, money formatting (INR), decimal.js utils
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── Dockerfile
├── docker-compose.yml            5 services: db, redis, backend, worker, frontend
├── .env.example
└── README.md
```

---

## Backend Modules

### Core (`apps.core`)
- **Tenant** — `django-tenants` `TenantMixin`; each customer organization gets its own PostgreSQL schema.
- **Domain** — maps a hostname (e.g., `acme.localhost`) to a tenant.
- **TimeStampedModel** — abstract base with `created_at` / `updated_at` on every record.
- **IdempotencyKey** — prevents duplicate money-creating POST requests.
- **Custom exception handler** — catches `ProtectedError`/`RestrictedError` globally, returning `409 Conflict` with details about blocking records.

### Identity (`apps.identity`)
- **User** — email-based auth (`AbstractBaseUser`), lives in the public/shared schema.
- **Role** — named permission bundle (Owner, Accountant, Manager, Viewer).
- JWT auth via `djangorestframework-simplejwt` (15-min access, 7-day refresh, rotating).

### SaaS (`apps.saas`)
- **Plan** — feature-gated pricing tiers with JSON feature flags.
- **Subscription** — links a Tenant to a Plan (trial → active → past_due → cancelled).
- **SaasInvoice** — platform invoices to tenants.

### Masters (`apps.masters`)
- **Company** — legal entity with GSTIN, PAN, state code, base currency, books-closed-until date.
- **Branch** — physical locations per company.
- **FiscalYear** — date range, active/closed flags.
- **Account** — Chart of Accounts (tree structure). Types: Asset, Liability, Equity, Income, Expense. Only leaf accounts (`is_postable=True`) accept journal lines.
- **Party** — unified Customer / Vendor / Both model with GSTIN, bank details, credit limit.
- **Item** — products and services with SKU, HSN code, sale/purchase price, GST rate.
- **HSNCode** — Harmonized System of Nomenclature codes (Indian GST) with default tax rates.
- **CostCenter** / **Project** — dimensions for cost allocation on journal lines.

### Ledger (`apps.ledger`)
- **JournalEntry** — the spine of the system. Statuses: Draft → Posted → Reversed. Polymorphic `source` link to any business document.
- **JournalLine** — debit or credit against a postable account, with optional cost center, project, and party dimensions.
- Period lock enforcement: entries cannot be created/modified if `date <= company.books_closed_until`.
- See [Core Invariant](#core-invariant-double-entry-engine) below.

### Billing (`apps.billing`)
- **Invoice** — GST Tax Invoice with CGST/SGST/IGST split, auto-posts a JournalEntry.
- **InvoiceLine** — per-line item, quantity, discount, tax computation.
- **Quotation** → **SalesOrder** → **Invoice** conversion pipeline.
- **CreditNote** — reverses a posted invoice with mirror journal entry.
- **RecurringInvoiceTemplate** — Celery Beat materializes invoices on a weekly/monthly/quarterly/yearly schedule.

### Payments (`apps.payments`)
- **Receipt** — money received from customers (Cash, Bank, UPI, Cheque).
- **ReceiptAllocation** — links receipt amount to specific invoices; over-allocation creates advance.

### Procurement (`apps.procurement`)
- **PurchaseOrder** → **GRN** (Goods Receipt Note) → **VendorBill** — 3-way match pipeline.
- **VendorBill** — Dr Expense/Inventory + Dr GST Input, Cr AP. Supports TDS deduction per line.
- **VendorPayment** — with allocation against open bills.

### Banking (`apps.banking`)
- **BankAccount** — linked to a GL account for automatic posting.
- **BankStatement** / **BankStatementLine** — CSV/MT940 import + reconciliation (match to journal lines).
- **PostDatedCheque** — tracks issued/received PDCs through their lifecycle (Pending → Deposited → Cleared/Bounced).
- **Advance** — advance receipts/payments sitting on AR/AP until adjusted.
- **FXRate** — daily foreign exchange rates per currency.

### Inventory (`apps.inventory`)
- **Warehouse** → **Bin** — storage locations.
- **Batch** — batch tracking with expiry (FMCG/pharma).
- **SerialNumber** — individual unit tracking (electronics/machinery).
- **StockMovement** — append-only ledger (+ve = in, -ve = out). Kinds: Opening, Purchase, Sale, Transfer, Adjustment, Scrap, Returns.
- **StockLevel** — denormalized on-hand qty per item×warehouse with reorder level and average cost.

### Assets (`apps.assets`)
- **FixedAsset** — register with SLM (Straight Line) and WDV (Written Down Value) depreciation methods.
- **DepreciationEntry** — monthly depreciation run linked to journal entries.

### Expenses (`apps.expenses`)
- **ExpenseClaim** — employee expense submission (Draft → Submitted → Approved → Reimbursed/Rejected).
- **PettyCashFloat** / **PettyCashTransaction** — petty cash fund management.
- **Budget** — per-account budget for a period (monthly/quarterly/annual), compared against actuals in reports.

### Taxation (`apps.taxation`)
- **EInvoiceIRN** — caches IRN + signed QR from NIC IRP (e-invoice).
- **EWayBill** — e-way bill tracking with transporter details.
- **GSTR2BLine** — ITC reconciliation: matches portal GSTR-2B data against locally booked vendor bills.
- HSN summary and GSTR-1/3B JSON export endpoints.

### Reports (`apps.reports`)
- All reports are read-only queries derived from `JournalLine` and business documents — no separate recomputation.
- 12 backend endpoints: Dashboard KPIs, P&L, Balance Sheet, Party Ledger, AR Aging, Sales Register, Cash Flow, Day Book, Cost Center P&L, Consolidation (multi-company), Budget vs Actual, Audit Log.

### Public API (`apps.publicapi`)
- **APIKey** — bearer tokens with read/write scopes for programmatic access.
- **WebhookSubscription** — push events (invoice.created, receipt.posted, etc.) to external URLs with HMAC signing.
- **WebhookDelivery** — delivery log with response tracking.

### Notifications (`apps.notifications`)
- **Notification** — in-app notifications (info/warning/error) per user.
- **OutboundMessage** — log of every email, WhatsApp, and SMS sent (queued → sent → delivered/failed).

### Portal (`apps.portal`)
- **PortalAccess** — token-based self-service access for customers/vendors to view their statements and invoices.

---

## Frontend Features

The frontend is a single-page React 18 PWA with hash-based routing, organized into feature modules.

### Navigation Structure

| Section      | Pages                                                              |
|--------------|--------------------------------------------------------------------|
| **Home**     | Dashboard (KPIs, recent invoices/receipts, overdue alerts)         |
| **Masters**  | Customers & Vendors, Items, Cost Centers, Projects                 |
| **Sales**    | Quotations, Sales Orders, Tax Invoices, Credit Notes, Receipts, Recurring Invoices |
| **Purchase** | Purchase Orders, Vendor Bills, Vendor Payments                     |
| **Banking**  | Bank Accounts, Post-Dated Cheques, Reconciliation                  |
| **Inventory**| Warehouses, Stock Movements, Stock on Hand                         |
| **Assets**   | Fixed Assets register                                              |
| **Expenses** | Expense Claims                                                     |
| **Ledger**   | Manual Journal Entry, Trial Balance                                |
| **Reports**  | P&L, Balance Sheet, Cash Flow, Day Book, Party Ledger, AR Aging, Sales Register, HSN Summary, Cost Center P&L, Budget vs Actual, Consolidation, Audit Log, GSTR Export |
| **Settings** | Company Profile, Cost Centers, Projects, API Keys, Webhooks, Books Closing |

### Key Libraries

| Library              | Purpose                                     |
|----------------------|---------------------------------------------|
| React 18             | UI framework                                |
| TanStack React Query | Server state management + caching           |
| Zustand              | Client state (auth store)                   |
| React Hook Form      | Form handling                               |
| Zod                  | Schema validation                           |
| Recharts             | Charts (P&L bar chart, dashboard)           |
| Tailwind CSS 3       | Utility-first styling                       |
| Lucide React         | Icon library                                |
| jsPDF + autoTable    | Client-side PDF generation for reports      |
| Decimal.js           | Precise decimal arithmetic (28-digit precision) |
| Vite 5 + PWA plugin  | Build tool + offline-capable PWA            |

### Report Downloads

Every report page has a **Download** button supporting:
- **PDF** — styled table with headers, totals row, and footer (via jsPDF + autoTable)
- **CSV** — standard comma-delimited format for Excel/Sheets

---

## API Reference

All tenant-scoped endpoints are under `/api/v1/`. Authentication: JWT Bearer token.

### Auth
| Method | Endpoint               | Description             |
|--------|------------------------|-------------------------|
| POST   | `/auth/login/`         | Obtain JWT token pair   |
| POST   | `/auth/refresh/`       | Refresh access token    |
| GET    | `/auth/me/`            | Current user profile    |

### Masters
| Method    | Endpoint                    | Description                |
|-----------|-----------------------------|----------------------------|
| CRUD      | `/masters/companies/`       | Companies                  |
| CRUD      | `/masters/branches/`        | Branches                   |
| CRUD      | `/masters/fiscal-years/`    | Fiscal years               |
| CRUD      | `/masters/accounts/`        | Chart of Accounts          |
| CRUD      | `/masters/parties/`         | Customers & Vendors        |
| CRUD      | `/masters/items/`           | Products & Services        |
| CRUD      | `/masters/hsn-codes/`       | HSN/SAC codes              |
| CRUD      | `/masters/cost-centers/`    | Cost centers               |
| CRUD      | `/masters/projects/`        | Projects                   |

### Ledger
| Method    | Endpoint                    | Description                |
|-----------|-----------------------------|----------------------------|
| CRUD      | `/ledger/journal-entries/`  | Journal entries            |
| GET       | `/ledger/trial-balance/`    | Live trial balance         |

### Billing
| Method    | Endpoint                    | Description                |
|-----------|-----------------------------|----------------------------|
| CRUD      | `/billing/invoices/`        | Tax Invoices               |
| CRUD      | `/billing/quotations/`      | Quotations                 |
| CRUD      | `/billing/sales-orders/`    | Sales Orders               |
| CRUD      | `/billing/credit-notes/`    | Credit Notes               |
| CRUD      | `/billing/recurring/`       | Recurring Invoice Templates|

### Payments
| Method    | Endpoint                    | Description                |
|-----------|-----------------------------|----------------------------|
| CRUD      | `/payments/receipts/`       | Customer Receipts          |

### Procurement
| Method    | Endpoint                       | Description             |
|-----------|--------------------------------|-------------------------|
| CRUD      | `/procurement/purchase-orders/`| Purchase Orders         |
| CRUD      | `/procurement/grns/`           | Goods Receipt Notes     |
| CRUD      | `/procurement/vendor-bills/`   | Vendor Bills            |
| CRUD      | `/procurement/vendor-payments/`| Vendor Payments         |

### Banking
| Method    | Endpoint                    | Description                |
|-----------|-----------------------------|----------------------------|
| CRUD      | `/banking/bank-accounts/`   | Bank Accounts              |
| CRUD      | `/banking/pdcs/`            | Post-Dated Cheques         |
| CRUD      | `/banking/advances/`        | Advances                   |

### Inventory
| Method    | Endpoint                    | Description                |
|-----------|-----------------------------|----------------------------|
| CRUD      | `/inventory/warehouses/`    | Warehouses                 |
| CRUD      | `/inventory/movements/`     | Stock Movements            |
| GET       | `/inventory/stock-levels/`  | On-hand stock summary      |

### Assets
| Method    | Endpoint                    | Description                |
|-----------|-----------------------------|----------------------------|
| CRUD      | `/assets/fixed-assets/`     | Fixed Asset Register       |

### Expenses
| Method    | Endpoint                    | Description                |
|-----------|-----------------------------|----------------------------|
| CRUD      | `/expenses/claims/`         | Expense Claims             |
| CRUD      | `/expenses/budgets/`        | Budgets                    |

### Reports (all GET)
| Endpoint                         | Description                          |
|----------------------------------|--------------------------------------|
| `/reports/dashboard/`            | Dashboard KPIs                       |
| `/reports/pnl/`                  | Profit & Loss                        |
| `/reports/balance-sheet/`        | Balance Sheet                        |
| `/reports/party-ledger/`         | Party Statement of Account           |
| `/reports/ar-aging/`             | Receivables Aging (0-30, 31-60, etc.)|
| `/reports/sales-register/`       | GST Sales Register                   |
| `/reports/cash-flow/`            | Cash Flow (opening/closing/net)      |
| `/reports/day-book/`             | All entries on a single day          |
| `/reports/cost-center-pnl/`      | P&L by Cost Center                   |
| `/reports/consolidation/`        | Multi-company P&L                    |
| `/reports/budget-vs-actual/`     | Budget variance analysis             |
| `/reports/audit-log/`            | Financial record edit history         |

### Taxation
| Endpoint                         | Description                          |
|----------------------------------|--------------------------------------|
| `/taxation/hsn-summary/`         | HSN-wise outward supply summary      |
| `/taxation/gstr1/`               | GSTR-1 JSON export                   |
| `/taxation/gstr3b/`              | GSTR-3B JSON export                  |

### OpenAPI / Swagger
| Endpoint            | Description                |
|---------------------|----------------------------|
| `/api/schema/`      | OpenAPI 3.0 JSON schema    |
| `/api/docs/`        | Swagger UI                 |

---

## Database & Multi-Tenancy

The application uses **`django-tenants`** with a **schema-per-tenant** isolation model on PostgreSQL:

- **Public schema** — shared tables: `Tenant`, `Domain`, `User`, `Plan`, `Subscription`
- **Tenant schemas** (e.g., `acme`) — all business data: Companies, Accounts, Invoices, Journal Entries, etc.

Tenant routing is done via subdomain: `acme.localhost:8000` → resolves to the `acme` schema.

### Key design choices
- `PROTECT` on all financial foreign keys — deleting master data that's referenced by transactions returns `409 Conflict` with details.
- `simple_history` on all financial models — every change is tracked.
- Idempotency keys on money-creating endpoints to prevent duplicates.

---

## Core Invariant: Double-Entry Engine

Every business document ultimately produces a `JournalEntry` through the **Posting Engine**:

```
Invoice.post()    → JournalEntry (Dr AR, Cr Income, Cr GST Output)
Receipt.post()    → JournalEntry (Dr Cash/Bank, Cr AR)
VendorBill.post() → JournalEntry (Dr Expense + Dr GST Input, Cr AP)
VendorPayment     → JournalEntry (Dr AP, Cr Cash/Bank)
Depreciation      → JournalEntry (Dr Depreciation Expense, Cr Accumulated Depreciation)
```

**Enforced invariants:**
1. `Σ(lines.debit) == Σ(lines.credit)` — validated on every save/post.
2. Every line must have either debit > 0 OR credit > 0, never both, never zero.
3. Only `is_postable=True` (leaf) accounts can receive journal lines.
4. Posted entries cannot be deleted — they must be reversed.
5. Period lock: if `entry.date <= company.books_closed_until`, the entry cannot be created, modified, or deleted.

This makes Trial Balance, P&L, and Balance Sheet derivable from `JournalLine` aggregation rather than hand-computed.

---

## Background Jobs (Celery Beat)

The `worker` service runs Celery with beat scheduling. All times are in Asia/Kolkata:

| Job                       | Schedule       | Description                                     |
|---------------------------|----------------|-------------------------------------------------|
| `recurring-invoices-daily`| Daily 6:00 AM  | Materialize recurring invoice templates          |
| `overdue-reminders-daily` | Daily 9:00 AM  | Send overdue invoice reminders (escalates by age)|
| `vendor-bill-due-alerts`  | Daily 9:30 AM  | AP alerts: bills due in 3 days + overdue         |
| `stock-reorder-check`     | Daily 8:00 AM  | Stock reorder level alerts                       |
| `pdc-presentation-check`  | Daily 7:00 AM  | PDC presentation date alerts                     |
| `books-closing-reminder`  | 5th of month   | Remind to close prior month's books              |
| `monthly-depreciation`    | End of month   | Run depreciation on all fixed assets             |
| `fiscal-year-rollover`    | April 1        | Auto-create the next fiscal year                 |

---

## Reports & Downloads

### Available Reports

| Report               | Backend Endpoint              | Frontend Page | PDF/CSV Download |
|----------------------|-------------------------------|---------------|------------------|
| Dashboard            | `/reports/dashboard/`         | Yes           | —                |
| Profit & Loss        | `/reports/pnl/`               | Yes           | Yes              |
| Balance Sheet        | `/reports/balance-sheet/`     | Yes           | Yes              |
| Party Ledger         | `/reports/party-ledger/`      | Yes           | Yes              |
| AR Aging             | `/reports/ar-aging/`          | Yes           | Yes              |
| Sales Register       | `/reports/sales-register/`    | Yes           | Yes              |
| Cash Flow            | `/reports/cash-flow/`         | Yes           | Yes              |
| Day Book             | `/reports/day-book/`          | Yes           | Yes              |
| HSN Summary          | `/taxation/hsn-summary/`      | Yes           | Yes              |
| Cost Center P&L      | `/reports/cost-center-pnl/`   | Yes           | Yes              |
| Budget vs Actual     | `/reports/budget-vs-actual/`  | Yes           | Yes              |
| Consolidation        | `/reports/consolidation/`     | Yes           | Yes              |
| Audit Log            | `/reports/audit-log/`         | Yes           | Yes              |
| GSTR-1 / 3B Export   | `/taxation/gstr1/`, `gstr3b/` | Yes           | JSON download    |

Downloads are generated client-side using **jsPDF + autoTable** (PDF) and native CSV generation.

---

## Environment Variables

All config is in `.env` (see `.env.example`):

| Variable                  | Default                  | Description                        |
|---------------------------|--------------------------|------------------------------------|
| `DJANGO_SETTINGS_MODULE`  | `config.settings.dev`    | Django settings module             |
| `DJANGO_SECRET_KEY`       | —                        | Change in production!              |
| `DJANGO_DEBUG`            | `True`                   | Debug mode                         |
| `DJANGO_ALLOWED_HOSTS`    | `localhost,...`           | Allowed hostnames                  |
| `POSTGRES_DB`             | `finsaptta`              | Database name                      |
| `POSTGRES_USER`           | `finsaptta`              | Database user                      |
| `POSTGRES_PASSWORD`       | `finsaptta`              | Database password                  |
| `POSTGRES_HOST`           | `db`                     | Database host (`db` in Docker)     |
| `POSTGRES_PORT`           | `5432`                   | Database port                      |
| `REDIS_URL`               | `redis://redis:6379/0`   | Redis URL for Celery               |
| `JWT_ACCESS_LIFETIME_MIN` | `15`                     | JWT access token lifetime (min)    |
| `JWT_REFRESH_LIFETIME_DAYS`| `7`                     | JWT refresh token lifetime (days)  |
| `CORS_ALLOWED_ORIGINS`    | `http://localhost:5173`  | CORS origins                       |
| `VITE_API_BASE_URL`       | `http://acme.localhost:8000/api/v1` | Frontend API base URL  |

---

## Running Tests

```bash
# Backend (inside Docker)
docker compose exec backend python -m pytest

# Backend (local)
cd backend
python -m pytest

# Frontend type-check
cd frontend
npx tsc --noEmit
```

---

## Deployment

### Production checklist

1. Set `DJANGO_DEBUG=False` and `DJANGO_SETTINGS_MODULE=config.settings.prod`
2. Generate a strong `DJANGO_SECRET_KEY`
3. Set `DJANGO_ALLOWED_HOSTS` to your actual domain(s)
4. Use a managed PostgreSQL and Redis
5. Run `python manage.py collectstatic` for whitenoise
6. Run `python manage.py migrate_schemas --shared` before starting
7. Use `gunicorn` (already in requirements) instead of `runserver`
8. Build the frontend: `npm run build` and serve via CDN or reverse proxy
9. Set up HTTPS via a reverse proxy (nginx, Caddy, or cloud LB)

### Docker Compose services

| Service    | Image                | Ports | Notes                                |
|------------|----------------------|-------|--------------------------------------|
| `db`       | `postgres:16-alpine` | 5432  | Persistent volume `pgdata`           |
| `redis`    | `redis:7-alpine`     | 6379  | Broker + result backend              |
| `backend`  | Custom (Python 3.11) | 8000  | Runs migrations + `runserver`        |
| `worker`   | Same as backend      | —     | Celery worker + beat scheduler       |
| `frontend` | Custom (Node 20)     | 5173  | Vite dev server                      |
