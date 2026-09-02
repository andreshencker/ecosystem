---
tags: [technical-debt, testing]
id: TD-015
area: Testing
priority: High
status: Open
identified: 2026-06-13
action-plan: AP-008
---

# TD-015 — E2E Test Suite Is Empty

## Description

`test/jest-e2e.json` is configured. The `test/` directory contains no `.e2e-spec.ts` files. `npm run test:e2e` passes because `--passWithNoTests` is implied by the empty suite — it does not mean e2e tests pass.

## Impact

The notification delivery pipeline — the most critical path in the service — has never been tested end-to-end: company creation → credential setup → domain catalogue → event catalogue → `POST /notifications/event` → actual delivery. Any integration bug in this chain is undetected until production.

## Planned Resolution

**AP-008** — Write an E2E test covering the full notification delivery path against a test MongoDB instance and a mocked SMTP server (`mailhog` or `smtp-server` npm package). Run via `npm run test:e2e` in CI.
