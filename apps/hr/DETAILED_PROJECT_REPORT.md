# HRMS Platform Detailed Project Report

Prepared for: Department Head  
Prepared by: Project Team  
Date: 25 May 2026

---

## 1) Executive Summary

This project is a multi-tenant Human Resource Management System (HRMS) built on Django 5. It supports end-to-end HR operations for organizations, including employee lifecycle, attendance, leave, payroll, performance reviews, and HR operations workflows such as onboarding, assets, letters, exits, and notifications.

The platform is architected to support tenant isolation by subdomain, role-based access control, asynchronous processing for heavy jobs, and production observability through Sentry. It includes both employee self-service and HR/admin workflows.

Current status: Feature-rich and operationally close to production readiness, with strong domain coverage. The key remaining gaps are broader automated test coverage across all modules and stronger documentation alignment between setup and runtime configuration.

---

## 2) Business Problem and Objectives

Organizations need a unified HR platform that:
- Reduces manual HR work across attendance, leave, payroll, and documentation.
- Provides manager and employee self-service workflows.
- Ensures statutory payroll outputs and auditable actions.
- Scales to multiple companies in one codebase with secure data isolation.

Project objectives achieved:
- Multi-tenant architecture with tenant-aware routing and data partitioning.
- Domain modules for core HR functions and payroll operations.
- Automated attendance and payroll task flows.
- In-app notifications, audit logs, and compliance-oriented records.
- Deployment model for local and cloud environments.

---

## 3) System Scope and Functional Coverage

### 3.1 Platform Scope
- Multi-tenant SaaS HRMS for SMEs and mid-size organizations.
- Tenant onboarding and account provisioning.
- HR admin, manager, and employee role experiences.
- End-to-end payroll with exports and document generation.

### 3.2 Module Coverage Matrix

1. Tenant and Platform Core
- Tenant signup and trial provisioning.
- Subdomain-based tenant resolution.
- Tenant settings and plan-aware context.

2. Authentication and Access Control
- Custom user model with tenant linkage.
- Tenant-aware authentication backend.
- Role and permission model for HR admin, manager, employee.
- Login security controls including rate-limit lockout behavior.

3. Employee Management
- Employee master, profile updates, org structure.
- Department, designation, location management.
- Bulk employee import with salary and bank details support.
- Employee documents and ID card PDF generation.
- Attrition scoring and recompute operations.

4. Attendance
- Punch in and punch out logging.
- Shift configuration and shift assignment.
- Daily attendance record processing.
- Regularization request and approval workflow.
- Monthly attendance summary computation.

5. Leave Management
- Leave apply, cancel, and history.
- Pending approvals for managers and HR.
- Leave types, holiday calendar, leave balances.
- Comp-off support in data model.

6. Payroll
- Payroll run creation, processing, review, approval, publish lifecycle.
- Salary structures and statutory settings.
- Payroll record computation including LOP, PF, ESI, PT, LWF, TDS, loans, reimbursements.
- Payslip PDF generation and employee payslip portal.
- Loans and advances tracking.
- Expense reimbursement claims.
- Tax declaration workflow and Form 16 generation.
- Exports: salary register, bank advice, PF statement, tally XML, PF ECR, ESI return.

7. Performance Management
- Review cycle management.
- Manager-written reviews for team.
- Employee self review visibility and acknowledgement.
- AI-assisted review drafting with bias-term checks.

8. HR Operations
- Letter templates and letter generation.
- Asset inventory and assignment lifecycle.
- Onboarding templates, task execution, and completion tracking.
- Exit request handling.
- Announcements and in-app notifications.
- Audit log and document expiry alerts.
- People pulse reporting.

9. Recruitment (Data Layer Present)
- Job openings, candidates, and applications models are implemented.
- No active URL routing in core application menu, indicating partial or future activation.

---

## 4) Technical Architecture

### 4.1 Architecture Style
- Monolithic Django application with modular domain apps.
- Tenant-aware request handling through middleware and host resolution.
- Server-rendered templates enhanced with HTMX and Alpine for interactive workflows.

### 4.2 Core Stack
- Backend: Django 5.1.4
- Database: PostgreSQL in base/production, SQLite in development configuration
- Cache and broker: Redis (production pattern), local memory cache in development
- Async processing: Celery with django-celery-beat and django-celery-results
- Web server (prod): Gunicorn behind Nginx
- Static serving: WhiteNoise
- Object storage: DigitalOcean Spaces via S3-compatible storage backend
- Observability: Sentry SDK integrations (Django, Celery, Redis)

### 4.3 Tenant Isolation Model
- Tenant resolved from subdomain and attached to request context.
- Tenant object cached to reduce database hits.
- Superadmin domain path remains outside tenant context.
- Core business models include tenant foreign keys for data separation.

### 4.4 Data Model Depth
- Approximate model count: 56 Django models across functional apps.
- Representative entity groups:
  - Identity and RBAC: User, Role, Permission, UserRole.
  - Core HR: Employee, documents, addresses, contacts, org hierarchy.
  - Time and leave: attendance logs and records, leave requests, balances.
  - Payroll: structures, runs, records, payslips, loans, tax declarations, Form 16.
  - Operations: onboarding, assets, letters, notifications, audit logs.

---

## 5) Security, Privacy, and Compliance Controls

Implemented controls:
- Tenant-aware authentication and user scoping.
- Role-based access checks and role utilities for admin and manager capabilities.
- Login attempt throttling and lockout pattern.
- Security middleware and secure cookie settings in production.
- CSRF handling integrated for HTMX requests.
- Encryption support for PII fields through Fernet key configuration.
- Audit logging service available for traceability.
- Sentry configuration excludes noisy/non-actionable events and avoids default PII collection.

Compliance-oriented payroll support:
- PF, ESI, PT, LWF structures.
- Statutory export formats and payroll records.
- Form 16 and tax declaration process.

Important legal note observed in engine:
- The payroll engine marks simplified TDS logic as a version-1 legal caution and recommends CA verification for statutory filing scenarios.

---

## 6) Performance and Scalability Design

Current design choices:
- Tenant cache for host to tenant lookup.
- Celery task processing for attendance and payroll workflows.
- Batch processing patterns for daily and monthly attendance tasks.
- Payroll run processing and payslip generation as asynchronous jobs.
- WhiteNoise compressed static handling for deployment efficiency.

Scalability expectation:
- Suitable for initial SaaS growth with horizontal worker scaling (Gunicorn workers and Celery concurrency).
- Managed PostgreSQL and Redis architecture supports production-grade load for small to medium tenant populations.

---

## 7) DevOps and Deployment Readiness

### 7.1 Runtime Modes
- Development settings:
  - SQLite database file for local simplicity.
  - In-memory cache and DB sessions.
  - Celery eager mode (tasks execute synchronously).
- Production settings:
  - Hardened security flags.
  - Sentry integrations enabled when DSN exists.
  - External services expected for database, cache, and email.

### 7.2 Containerization and Infrastructure
- Dockerfile present and configured with system dependencies for WeasyPrint and PostgreSQL driver support.
- Nginx configuration exists in repository.
- Setup documentation includes DigitalOcean deployment checklist and service topology.

### 7.3 Operational Checklist Availability
- Existing setup guide includes migration, seeding, tenant creation, worker startup, and post-launch checks.
- Periodic task schedules are documented for attendance workflows.

---

## 8) Testing and Quality Status

What exists:
- Strong smoke-flow test suite in tenant app covering signup, login, dashboard access, password reset, notification service, rate limiting, and audit logging behavior.
- Two utility validation scripts for route audit and bulk import verification.

Current quality gap:
- Automated tests are concentrated in one module; broader domain coverage (payroll, attendance, leaves, HR ops, performance) is not yet represented proportionally.

Impact:
- Production confidence is moderate for covered onboarding/auth flows, but lower for regression detection in payroll and operations workflows without additional test expansion.

---

## 9) Key Strengths

- Comprehensive domain coverage across HR lifecycle, not just payroll or attendance.
- Clear tenant-aware architecture and role-driven UI segmentation.
- Practical operational components: notifications, audit logs, exports, PDF generation.
- AI feature integrated with safeguards (manual review requirement, bias flagging).
- Cloud deployment path already documented with realistic infrastructure planning.

---

## 10) Risks and Gaps

1. Documentation mismatch risk
- Setup guide emphasizes local PostgreSQL and Redis, while active development settings are SQLite plus eager Celery.
- Recommendation: publish one canonical local setup path and one production path with explicit differences.

2. Test coverage concentration
- Most formal tests are in tenant/auth flow.
- Recommendation: add targeted integration tests for payroll run lifecycle, leave approvals, attendance regularization, and export generation.

3. Recruitment module activation gap
- Recruitment models exist but module is not wired in main URL routing.
- Recommendation: classify as phase-2 feature or complete activation to avoid stakeholder ambiguity.

4. Legal payroll dependency
- TDS logic includes a simplified path warning.
- Recommendation: maintain documented CA validation process and prioritize full regime-compliant TDS enhancements.

5. Operational hardening tasks
- Need formalized runbooks for incident response, backup restores, and data retention policy confirmations.

---

## 11) Recommended Action Plan

### Immediate (0-2 weeks)
- Align setup documentation with actual development settings.
- Create release checklist for migration, seed, and first-tenant provisioning.
- Add automated tests for payroll run create-process-approve-publish flow.

### Short Term (2-6 weeks)
- Add module-level integration tests for attendance, leaves, and HR Ops.
- Add role-based access tests for manager and employee scopes.
- Formalize backup and restore drill documentation.

### Medium Term (6-12 weeks)
- Upgrade TDS/statutory calculation logic for complete compliance depth.
- Complete recruitment module activation or defer with clear roadmap communication.
- Add KPI dashboards for SLA monitoring and operational metrics.

---

## 12) Final Status for Leadership Submission

Overall assessment: Strong and extensible HRMS platform with high functional completeness and practical operational readiness.

Readiness verdict:
- Internal pilot: Ready
- Controlled production rollout: Ready with documented safeguards
- Large-scale rollout: Recommended after broader test coverage and statutory enhancement tasks

Suggested management message:
- The system is functionally robust and close to production maturity.
- Priority now shifts from feature build-out to quality hardening, compliance depth, and operational standardization.

---

## 13) Appendix A - Primary Repository Components

Top-level key artifacts:
- Django project configuration and environment-specific settings.
- Domain apps for accounts, tenants, employees, attendance, leaves, payroll, hr_ops, performance, recruitment.
- Templates, static assets, media folders.
- Deployment files (Dockerfile, Nginx config).
- Setup documentation and utility scripts.

---

## 14) Appendix B - Leadership-Friendly KPI Tracking Suggestions

For monthly reporting to leadership, track:
- Tenant activation metrics (signups to active conversion).
- HR operations metrics (onboarding completion SLA, document expiry closure rate).
- Payroll metrics (run duration, error rate, payslip publication success).
- Attendance metrics (regularization volume and approval latency).
- Leave metrics (approval turnaround and rejection reasons).
- Platform reliability (incident count, mean time to resolve, backup restore success).

These KPIs will convert technical progress into management-visible outcomes.
