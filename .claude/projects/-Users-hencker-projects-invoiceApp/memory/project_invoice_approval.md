---
name: project-invoice-approval
description: Invoice Approval page implemented 2026-07-24 — BI pending-groups endpoint, NestJS Invoice module, frontend page at /billing/invoice-approval
metadata:
  type: project
---

Invoice Approval page implemented 2026-07-24.

**Why:** Allow users to review BI-calculated pending invoices before creating a persisted Invoice record.

**What was built:**
- BI endpoint `GET /internal/invoices/pending-groups` (MongoDB-based, real-time, no ETL dependency)
- ETL bug fixed: overnight shift gross_hours was negative — `_calc_net_minutes` now adds 1440 when gross < 0
- `fact_shift` extended with `break_taken` (Boolean) and `end_date` (Date) — migration 007
- NestJS Invoice module: `POST /invoices/approve` — re-fetches BI, persists Invoice, marks Shifts invoiced, returns invoice number
- Analytics controller: `GET /analytics/invoices/pending-groups` proxy
- Frontend: `/billing/invoice-approval` page with DataTable, Review Drawer, Approve action
- RBAC: `/billing` added to business_owner, business_admin, accountant routes; Billing section in sidebar

**How to apply:** Invoice History page is NOT implemented yet — that reads the persisted Invoice collection.

[[project_phase_a]]
