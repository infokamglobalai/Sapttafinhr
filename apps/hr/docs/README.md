# Saptta HR — Documentation Index

Complete documentation for go-live, marketing, user manuals, and developer handoff.

| Document | Audience | Purpose |
|----------|----------|---------|
| [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) | DevOps / HR Admin | Production readiness checklist |
| [FEATURES.md](./FEATURES.md) | Sales / Product | Full feature list |
| [RBAC.md](./RBAC.md) | Security / HR | Role-based access matrix |
| [WEBSITE_CONTENT.md](./WEBSITE_CONTENT.md) | Marketing | Website copy, story, differentiators |
| [MANUAL_HR_ADMIN.md](./MANUAL_HR_ADMIN.md) | HR Admin | Day-to-day HR operations |
| [MANUAL_MANAGER.md](./MANUAL_MANAGER.md) | Line Manager | Approvals and team views |
| [MANUAL_EMPLOYEE.md](./MANUAL_EMPLOYEE.md) | Employee | Self-service (ESS) |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Developer | Architecture and how to continue |
| [website-assets/](./website-assets/) | Marketing | Hero images for website |

## Quick start (demo)

See [DEV_LOGIN.md](../DEV_LOGIN.md) for local credentials and server command.

## Go-live status (summary)

**Core HR workflows are complete and operable** for a single-tenant HRMS deployment: employees, attendance, leaves (incl. comp-off), payroll with India statutory exports, reports, recruitment ATS, performance reviews, HR ops (letters, onboarding, exits), and automation emails.

**Before public production**, complete the [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) — especially PostgreSQL, Redis/Celery, SMTP, `FIELD_ENCRYPTION_KEY`, and `ANTHROPIC_API_KEY` if AI is required.
