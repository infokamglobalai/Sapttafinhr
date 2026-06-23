# Saptta HR — Complete Feature List

## Platform

- Multi-tenant workspaces (subdomain per company)
- Branded UI (Saptta blue theme, PWA manifest)
- Role-based navigation (HR / Manager / Employee)
- In-app notifications + email delivery
- Audit trail for sensitive actions
- HR AI assistant chat widget (Claude, tool-use)
- Encrypted sensitive fields (Aadhaar, bank accounts)

## Employees & org

- Employee master (personal, job, bank, documents)
- Departments, designations, office locations
- **Visual org chart** (reporting structure)
- **Company directory** (all staff search)
- Bulk CSV import
- Employee login provisioning + credential email
- Access revoke / restore on exit
- ID card PDF
- Document upload with expiry tracking
- Attrition risk scoring dashboard

## Attendance

- Web punch in/out with geo optional
- **Mobile punch card** (My Attendance / My Space) with GPS geo-fence
- **PWA install prompt** on mobile (add to home screen)
- Attendance register (HR)
- My attendance calendar (employee)
- Regularization requests + approval workflow
- Shift definitions and assignment
- Team attendance view (manager)
- **Overtime** tracking per shift rules + monthly OT summary (ESS)

## Leaves

- Leave types with accrual rules
- Apply / cancel leave (employee)
- Multi-level approval (manager → HR)
- Holiday calendar
- Leave balance admin adjustments
- Comp-off earn / request / approve / auto-redeem on approved CO leave

## Payroll (India-ready)

- Salary structures and components
- Employee salary assignment
- Statutory settings: PF, ESI, PT, LWF, TDS
- **Pre-payroll monthly review** — readiness checklist
- Payroll run: compute from attendance (LOP, paid days)
- Per-employee HR adjustments (LOP override, bonus, manual deduction, notes)
- Approve → Publish workflow
- Payslip PDF + branded email + **WhatsApp summary** (tenant currency) to employees
- Employee self-service payslips
- **Exports:** salary register, bank advice, PF statement/ECR, ESI return, Tally XML, statutory ZIP bundle
- **Gratuity:** monthly employer accrual on payslip + exit settlement estimate (Payment of Gratuity Act)
- Employee loans with EMI auto-deduction
- Expense claims with **category picker** + receipt upload + reimbursement in payroll
- Investment declaration (80C etc.) + HR verification
- **Payroll → Finance ledger sync** (journal auto-post on publish; India + GCC lines)
- **In-account billing** (subscription, invoices, renewal in Settings)
- **Security & Trust** settings tab (session, audit, data handling summary)

## Payroll (GCC / Kuwait — MVP)

- Jurisdiction-aware engine (KW, AE, SA, BH, OM, QA)
- PIFSS (Kuwaiti nationals), GOSI (Saudi), indemnity/EOS accrual
- **Bilingual EN/AR payslip PDF**
- WPS SIF, bank transfer CSV, PIFSS Excel, EOS liability exports
- GCC payroll readiness banner (consultant validation reminder)

## Reports

- Leave MIS (filter + Excel)
- Attendance MIS (filter + Excel)
- Headcount report (filter + Excel)
- **Manpower report (GCC)** — Kuwaiti vs expat, nationality mix, establishment Excel
- Payroll summary (filter + Excel)
- Monthly report pack (ZIP: PDFs for leave, attendance, payroll)

## Recruitment (ATS)

- Job openings pipeline
- **Public careers pages with online apply** (resume upload)
- **Hired → employee conversion** with onboarding auto-start
- Candidate applications (applied → hired/rejected)
- Add applicants manually
- AI job description generator
- AI resume parse + candidate ranking
- AI offer letter draft

## Performance

- Review cycles (annual / half-yearly)
- **Launch reviews** — bulk-create manager reviews for all active employees
- Manager reviews for direct reports
- AI-assisted review drafting from bullet notes
- Employee acknowledgement

## HR Operations

- Letter templates (offer, experience, relieving) + PDF generation
- Onboarding checklists (templates + per-employee)
- Exit / full-and-final workflow + login revoke
- Asset register and assignment
- Company announcements
- Policy library + AI policy Q&A
- People pulse / engagement snapshot
- Document expiry alerts

## Automation (Celery Beat)

| Schedule | Action |
|----------|--------|
| 1st of month 7:00 | HR payroll kickoff email |
| 1st of month 7:30 | Previous month report pack email to HR |
| Daily 9:00 (25th+) | Payroll reminder if month not published |
| Nightly | Attrition recompute |

Manual trigger: `python manage.py run_monthly_automation --action all --tenant <subdomain>`

## AI features (requires `ANTHROPIC_API_KEY`)

| Feature | Who | Fallback without key |
|---------|-----|----------------------|
| HR chat assistant | All logged-in | Polite “not configured” message |
| Policy Q&A | All | Static message |
| Performance review draft | Manager / HR | Error message |
| JD generator | HR | Template-based stub |
| Resume parse / rank | HR | Basic text extraction |
| Offer letter AI | HR | Manual template |

## What is not included (honest scope)

- Native iOS/Android apps (PWA + responsive web only)
- Biometric hardware integration (use web punch or import)
- Direct EPFO/ESIC portal API filing (exports provided; manual upload)
- Full accounting GL (Tally XML export provided)
- Extensive automated test suite (add before large-scale rollout)
