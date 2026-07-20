---
tags: [technical-debt, security]
id: TD-017
area: Security
priority: Low
status: Open
identified: 2026-06-13
action-plan: none-yet
---

# TD-017 — No Request Signing on Notification Endpoint

## Description

`POST /notifications/event` accepts any payload from any source authenticated with a valid JWT or the static `COMMUNICATION_API_KEY`. There is no per-tenant HMAC signature or request signing requirement. Any authenticated party can send notifications on behalf of any company they have access to.

## Impact

Low for the current internal-use model where all callers are trusted services. If external systems (webhooks, third-party integrations) are allowed to call the notification endpoint directly in the future, request signing will be needed to verify the caller's identity beyond the shared API key.

## Planned Resolution

No action item raised yet. This is acceptable for Phase 1. Add per-tenant HMAC signing as a backlog item when the first external integration is planned.
