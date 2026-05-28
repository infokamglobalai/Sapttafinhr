# Saptta — HRMS & Finance SaaS Platform

Two separate SaaS products built on a shared platform — **Saptta HR** (HRMS) and **fin-saptta** (Accounts & Finance) — targeting the Indian market with built-in GST, PF, ESI, TDS compliance.

## Products

| Product | Path | Description |
|---------|------|-------------|
| **Saptta HR** | `/app/hrms` | Employee management, attendance, leave, payroll, recruitment, performance |
| **fin-saptta** | `/app/finance` | GST invoicing, ledger, banking, vendor bills, reports |

Customers can subscribe to either product or both. If both are owned, a product switcher at `/app` lets users jump between them.

## Tech Stack

- **Frontend:** React 18 + Vite 5 + TypeScript + Ant Design 5
- **Routing:** React Router v6
- **State:** React Context (Auth, Notifications)
- **Backend (planned):** Django 5 + DRF + PostgreSQL 16 (django-tenants schema-per-tenant) + Redis 7 + Celery

## Getting Started

```bash
cd sappta
npm install
npm run dev
```

Open http://localhost:5173 and sign in (any email/password works in mock mode).

## Project Structure

```
sappta/
├── src/
│   ├── pages/
│   │   ├── Home.tsx, About.tsx, Pricing.tsx, ...    # Public marketing
│   │   ├── Login.tsx, Signup.tsx, Setup.tsx         # Onboarding
│   │   ├── app/
│   │   │   ├── ProductSwitcher.tsx                  # /app — choose product
│   │   │   ├── hrms/
│   │   │   │   ├── HrmsLayout.tsx                   # HRMS sidebar (orange)
│   │   │   │   └── HrmsHome.tsx                     # HRMS dashboard
│   │   │   └── finance/
│   │   │       ├── FinanceLayout.tsx                # Finance sidebar (green)
│   │   │       └── FinanceHome.tsx                  # Finance dashboard
│   │   └── dashboard/                               # Shared module pages
│   │       ├── Employees.tsx, Attendance.tsx, ...   # HRMS modules
│   │       └── Invoices.tsx, Ledger.tsx, ...        # Finance modules
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── NotificationContext.tsx
│   ├── data/
│   │   ├── hrms-mock.ts                             # HR mock data
│   │   └── finance-mock.ts                          # Finance mock data
│   └── types/index.ts                               # Plans, Users, Setup types
```

## Features

### Saptta HR (HRMS)
- Employee Management — CRUD with detail drawer
- Attendance — geofenced punch tracking with status summary
- Leave Management — approve/reject workflow + balances
- Payroll — process runs, generate payslips with PF/ESI/PT/TDS
- Recruitment — ATS with applicant pipeline
- Performance — reviews with star ratings, OKRs with progress
- Expense Claims — submit, approve, reimburse with journal sync

### fin-saptta (Accounts & Finance)
- GST Invoicing — CGST/SGST/IGST with HSN codes
- Customer Receipts — multi-mode (cash/bank/UPI/cheque) with invoice allocation
- Purchase — PO → GRN → Vendor Bill with 3-way match
- Banking — multi-account with statement reconciliation
- Ledger — double-entry journal entries + trial balance
- Reports — P&L, Balance Sheet, AR Aging, GSTR-1/3B exports
- Portal — Customer/vendor self-service access management

### Shared
- AI Audit Assistant (Claude-powered)
- Notification center with module tags
- Team & Role-Based Access Control
- Settings — Company profile, API keys, integrations

## Subscription Plans

| Plan | Products | Price |
|------|----------|-------|
| HRMS Starter | Saptta HR (up to 50 emp) | ₹2,999/mo |
| HRMS Pro | Saptta HR (unlimited) | ₹7,999/mo |
| Finance Starter | fin-saptta basic | ₹3,499/mo |
| Finance Pro | fin-saptta full | ₹8,999/mo |
| **Saptta Complete** | Both products + Portal + AI | ₹14,999/mo |

All plans include 14-day free trial. Annual billing saves 17%.

## License

Proprietary — © Saptta Tech Solutions
