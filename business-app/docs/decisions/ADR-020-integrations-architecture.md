---
id: ADR-020
title: Integrations Architecture — src/integrations as the canonical location for all external connections
status: Accepted
date: 2026-07-07
tags: [architecture, integrations, settings, external-systems, bounded-context, structure]
---

# ADR-020 — Integrations Architecture

## Status

Accepted — 2026-07-07

---

## Context

Business App connects with multiple external systems: Communications Platform, Business Intelligence, Google Calendar, Outlook, iCloud, cloud storage providers, payment gateways, accounting platforms, and others planned for future sprints.

Until this decision, external integration code has lived inside `src/settings/`:

```
src/settings/
  bi-client/
  communication-client/
  communication-connection/
```

This naming is technically functional but semantically wrong. As the system grows to include calendar sync, storage adapters, payment gateways, and accounting exports, placing them all under `settings/` produces confusion that compounds with each new integration:

- **"Settings" implies user preferences** — language, timezone, display options, notification toggles. None of those are in `src/settings/` today.
- **The actual content is integration infrastructure** — HTTP clients, connection state, token management, sync execution.
- **Discoverability breaks** — a developer looking for "how we connect to Google Calendar" will not look in `settings/`. They will look for something called `integrations/`, `adapters/`, or `clients/`.
- **The existing architecture documentation** (`docs/architecture/06-integration-architecture.md`, `docs/domain/integration/`) already uses the vocabulary of "Integration Layer", "Integration Hub", "Connector" — but without a corresponding code location, these concepts float without an anchor.

The decision documents and domain docs have been ahead of the code structure. This ADR catches the code structure up to the documented intent.

---

## Decision

`src/integrations/` is the **canonical and exclusive location** for all external integration code in Business App backend.

Every connection to an external system — whether it is a platform service (Communications, Business Intelligence), a calendar provider (Google, Outlook, Apple), a payment gateway (Stripe, Square), a storage service, or any future system — is implemented as an independent folder under `src/integrations/`.

No external integration code lives anywhere else in the codebase.

---

## What is an Integration

An **Integration** is a bounded adapter between Business App and one specific external system or service.

Its role is strictly technical: it manages the connection lifecycle, handles authentication, executes HTTP calls, and normalizes responses into the vocabulary of the internal system. It does not contain business rules. It does not decide what to do with imported data.

### An Integration is responsible for

| Responsibility | Description |
|---|---|
| **Authentication** | Managing tokens (OAuth2, API keys, integration tokens). Storing them encrypted. Refreshing before expiry. Revoking on disconnect. |
| **Connection state** | Tracking whether the connection is active, needs reauth, or has an error. Persisting connection configuration. |
| **HTTP client** | Constructing requests to the external system. Parsing responses. Handling timeouts. |
| **Sync execution** | Running polling jobs or processing incoming webhooks. Updating sync timestamps and status. |
| **Adapters** | Translating external data formats into internal domain vocabulary (normalizer). Translating internal domain events into external formats (outbound adapter). |
| **Error handling** | Retries, circuit breaker state, dead letter entries. Detecting transient vs permanent errors. |
| **Own models** | Schemas and DTOs specific to the connection (connection state, sync log, webhook delivery). |
| **Own documentation** | A `README.md` inside each integration folder explaining how to connect, what it produces, and what it requires. |

### An Integration is NOT responsible for

| Concern | Where it belongs |
|---|---|
| Business rules about imported data | Domain modules (`src/modules/`) |
| Deciding what a calendar event means | Calendar domain, Work domain |
| Invoice calculation or revenue rules | Revenue, Billing domain |
| Notification content or templates | Communications Platform |
| User authentication within Business App | Auth module |
| Domain entities (Customer, Invoice, User) | Their respective modules |
| Global configuration (env vars, database) | `src/infrastructure/` |
| Shared utilities (logging, crypto) | `src/infrastructure/` or `src/shared/` |

---

## Why not `settings/`

The word "settings" carries a specific, well-established meaning in software: user-configurable preferences that control the behavior of the application from the user's perspective. Examples: language selection, timezone, display density, notification toggles.

None of that is what the current `src/settings/` contains. It contains:

- An HTTP client to the Communications Platform
- A connection record with an encrypted integration token
- A service to validate, store, and retrieve that token
- A client to the Business Intelligence service

These are integration infrastructure components. Calling them "settings" mislabels them in a way that:

1. Makes the codebase harder to navigate.
2. Creates the expectation that real user settings live there (they don't and shouldn't).
3. Makes it impossible to discover existing integrations by reading the folder name.
4. Cannot scale: `settings/google-calendar/`, `settings/stripe/`, `settings/xero/` would be nonsensical names.

---

## Why `integrations/`

The name `integrations/` is accurate, self-describing, and consistent with the project's existing documentation vocabulary.

`docs/architecture/06-integration-architecture.md` has used the concepts "Integration Layer" and "Integration Hub" since 2026-07-05. `docs/domain/integration/` defines `IntegrationConnection`, `Connector`, `SyncJob`, and `WebhookEndpoint` as the domain entities of this bounded context. This ADR assigns `src/integrations/` as the code location that implements those documented concepts.

The name scales naturally:

```
src/integrations/
  communications/       ← clear
  business-intelligence/← clear
  google-calendar/      ← clear
  stripe/               ← clear
  xero/                 ← clear
  ato-stp/              ← clear
```

Every future developer — human or AI agent — who needs to understand how Business App connects to an external system has an unambiguous answer: look in `src/integrations/`.

---

## Structure

Each integration is a self-contained folder. All code related to one external system lives together.

### Top-level structure

```
src/integrations/
  communications/
  business-intelligence/
  google-calendar/
  outlook-calendar/
  icloud-calendar/
  google-drive/
  onedrive/
  dropbox/
  stripe/
  square/
  xero/
  myob/
  ato-stp/
  ...
```

### Standard internal structure per integration

```
src/integrations/<name>/
  <name>.module.ts          # NestJS module definition and exports
  <name>.service.ts         # Primary service: connection management, token resolution
  <name>.client.ts          # HTTP client for the external API (if separate)
  schemas/
    <name>-connection.schema.ts   # MongoDB schema for connection state
  dto/
    <name>-connection.dto.ts      # Request/response DTOs
  tests/
    <name>.service.spec.ts        # Unit tests
  README.md                 # Integration-specific documentation
```

Not every folder is mandatory. An integration that only provides an outbound HTTP client (no persisted connection state) may have fewer files. An integration with inbound webhooks will have more.

The principle is: **all code for one external system lives in one place**.

### Mandatory elements

Every integration, regardless of its complexity, must have:

- A NestJS module (`<name>.module.ts`) that declares what it exports
- A primary service
- A `README.md` explaining: what system it connects to, what it requires (env vars, token), what it provides to other modules, and how to test the connection

---

## Migration path

The existing `src/settings/` content maps to `src/integrations/` as follows:

| Current path | Target path |
|---|---|
| `src/settings/communication-connection/` | `src/integrations/communications/` |
| `src/settings/communication-client/` | `src/integrations/communications/` |
| `src/settings/bi-client/` | `src/integrations/business-intelligence/` |

The migration will be executed as a separate task. This ADR documents the target architecture. No code is moved as part of this decision.

---

## Scalability

This architecture scales without structural changes. Adding a new integration means:

1. Create `src/integrations/<new-integration>/`
2. Follow the standard internal structure
3. Register the module in `AppModule`
4. Write the integration-specific documentation

No existing integrations are touched. No architectural decisions need revision. The folder name communicates the intent unambiguously to any developer who opens the codebase.

---

## Relation to existing documentation

| Document | Relationship |
|---|---|
| `docs/architecture/06-integration-architecture.md` | Defines the architectural model (Integration Layer, patterns, providers). This ADR assigns the code location that implements it. |
| `docs/domain/integration/01-integration-domain.md` | Defines the domain entities (IntegrationConnection, Connector, SyncJob). These entities are implemented inside `src/integrations/`. |
| `docs/domain/integration/02-integration-patterns.md` | Defines the four patterns (Polling, Webhook, Streaming, Push/Sync). Each integration chooses which patterns it implements. |
| `docs/domain/integration/03-provider-catalog.md` | Catalogs all planned providers. Each provider maps to one folder under `src/integrations/`. |
| `docs/domain/integration/04-resilience.md` | Defines circuit breaker, retry, dead letter. These apply per integration, implemented inside each `<name>.service.ts`. |
| `docs/integrations/README.md` | Entry point for integration documentation. Created as part of this decision. |
| `ADR-019` | Seed Catalog. The Communications integration is the first consumer of this architecture. |

---

## Consequences

### Positive

- Every external connection is immediately discoverable by folder name.
- New integrations follow a consistent, documented pattern.
- No ambiguity between "settings" (user preferences) and "integrations" (external connections).
- The code structure matches the vocabulary already established in the architecture and domain documentation.
- Each integration is isolated: a failing calendar integration cannot affect the communications integration.
- Migrations, deprecations, and version upgrades of one external API are contained within one folder.

### Negative

- Existing code in `src/settings/` must be migrated. Import paths in modules that depend on `settings/` (auth, users, user-invitations) will need updating. This is a one-time cost.
- The migration must be planned to not break the running system (no moving files without updating all imports first).

### Neutral

- `src/settings/` will be empty and removed after migration. If future user preference settings are needed, a new `src/settings/` or `src/preferences/` can be created for that purpose, with the correct semantic meaning.
