---
tags: [business]
---

# MVP

## Scope

The MVP is the **Communication Service** — a fully functional multi-tenant API that enables businesses to send notifications and generate files. It is the foundation everything else is built on.

The MVP does **not** include a frontend UI, invoice management, or billing. It is an API-first service.

## MVP Features

| Feature | Priority | Status |
|---|---|---|
| User authentication (register, login, JWT, refresh) | P0 | In progress |
| Email verification + password reset | P0 | In progress |
| Company (tenant) management | P0 | In progress |
| Company theme + branding | P1 | In progress |
| Channel catalogue (email, SMS, storage) | P0 | In progress |
| Provider catalogue (Gmail, Twilio, S3, etc.) | P0 | In progress |
| Company ↔ provider assignment | P0 | In progress |
| Encrypted credential storage | P0 | In progress |
| Domain catalogue | P0 | In progress |
| Event catalogue | P0 | In progress |
| Notification delivery via queue | P0 | In progress |
| Email layout templates | P1 | In progress |
| PDF generation (Puppeteer) | P1 | In progress |
| XLSX / CSV generation | P2 | In progress |
| Media upload / S3 storage | P2 | In progress |
| Preview rendering | P2 | In progress |
| Swagger / OpenAPI documentation | P1 | In progress |
| Health check endpoint | P1 | In progress |

## Out of Scope for MVP

- Frontend application (web dashboard)
- Invoice creation and management
- Payment tracking
- Billing / subscription management
- API gateway
- Additional backend services (invoice service, etc.)
- CI/CD pipeline
- Infrastructure as code

## Success Criteria

- The Communication Service API is stable and documented
- A company can be onboarded, providers configured, and a notification event sent end-to-end
- Credentials are stored encrypted and never exposed in plaintext via API
- Files (PDF, XLSX) can be generated on demand

## Target Launch

Phase 1A — no date set yet (architecture complete as of 2026-06-13, feature implementation in progress).
