---
tags: [decision, communication, backend]
id: DEC-005
date: 2026-06-13
status: Closed
sprint: Backlog
audit-source: Audits/Audit-2026-06-13
action-plan: AP-007, AP-008
---

# DEC-005 — Test Coverage Strategy

## Status

**Closed** — 0% coverage accepted during Phase 1A scaffolding. Tests required as Phase B items before production release.

## Context

The codebase has 1 test: `AppController.getHello()` (NestJS scaffold default). No service, guard, controller, or DTO has a test. `test/jest-e2e.json` is configured but no `.e2e-spec.ts` files exist.

## Decision

**Accept 0% meaningful coverage during Phase 1A feature scaffolding.** Prioritise test coverage as Phase B work (before production, not before frontend).

**Rationale:** Writing tests during active scaffolding slows iteration and leads to tests that are immediately deleted or rewritten as interfaces stabilise. Phase 1A introduced rapid structural change. Now that the architecture is stable, tests on the final structure are valuable and will not be wasted.

**Risk accepted:** A bug in credential encryption or auth flows during the untested window is undetected unless caught manually. Mitigated by: (1) the service is not yet in production, (2) critical paths are tested manually before any deployment.

## Required test areas (Phase B)

**Unit tests (AP-007, L):**
- `AuthService` — register, login, token rotation, reuse detection, password reset
- `CryptoService` / `ProviderCredentialsService` — AES-256-GCM encrypt → decrypt round-trip; tampered ciphertext rejected
- `NotificationService.notifyEvent()` — routing, rendering, per-channel aggregation
- `GlobalAuthGuard` — public routes, expired tokens, valid API key

**E2E tests (AP-008, L):**
- Full notification delivery: company creation → SMTP credential setup → domain → event → `POST /notifications/event` → delivery confirmed in mock SMTP inbox

**Coverage target:** ≥ 80% on the four high-risk classes above.

## Links

- **Audit finding:** [[Audits/Audit-2026-06-13]] — CF-6 (zero test coverage)
- **Technical debt:** [[Technical Debt/Open/TD-014 No Unit Test Coverage]], [[Technical Debt/Open/TD-015 No E2E Tests]]
- **Action items:** AP-007, AP-008 in [[Backlog]]
