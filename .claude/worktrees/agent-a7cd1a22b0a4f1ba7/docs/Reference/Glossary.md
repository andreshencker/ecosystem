---
tags: [reference]
---

# Glossary

Domain terms and definitions used across the platform. All terms are derived from the codebase.

| Term | Definition |
|---|---|
| **Company** | A tenant of the platform. Every business entity is scoped to a company. Identified by a unique `companyKey` slug. |
| **Company Key** | The stable, URL-safe slug that uniquely identifies a company (e.g. `acme-corp`). Used in routing and lookups. Must not change after creation. |
| **Channel** | A delivery medium for communications. Currently: `email`, `sms`, `storage`. Defined at the platform level, not per-company. |
| **Provider** | A third-party service that implements a channel (e.g. Gmail, Twilio, AWS S3). Defined at the platform level with a `providerKey`. |
| **Company Channel Provider** | The link between a company, a channel, and the provider the company uses for that channel. A company can have multiple providers per channel; one is `isDefault`. |
| **Provider Credentials** | The encrypted secrets (API keys, passwords, tokens) for a specific company + provider assignment. Namespaced by a `tag` to allow multiple credential sets per provider. Encrypted with AES-256-GCM. |
| **Credential Tag** | A label on a set of provider credentials that distinguishes multiple credential sets for the same provider (e.g. `"marketing"`, `"transactional"`). |
| **Domain Catalogue** | A named group of notification events belonging to a business domain (e.g. `invoices`, `support`). Defines which channel(s) and credential set(s) to use for routing. Company-scoped. |
| **Event Catalogue** | An individual notification event definition within a domain (e.g. `invoice.created`). Specifies the event type, channel content, and template variables. |
| **Event Key** | The unique identifier for a notification event within a domain (e.g. `invoice.overdue`). Used at send time to look up the full event definition. |
| **Event Type** | The classification of a notification event: `notification` (informational), `alert` (time-sensitive), or `request` (action required). |
| **Layout Template** | An HTML + CSS wrapper that defines the visual structure of an email or PDF. Scoped to a company theme. Declares required and optional template variables. |
| **Company Theme** | A named visual brand configuration for a company (colours, typography). Layout templates are attached to themes. One theme per company can be `isDefault`. |
| **Notification Queue** | The BullMQ job queue (`NOTIFICATION_QUEUE`) that processes outbound email and SMS notifications asynchronously. |
| **File Generation Queue** | The BullMQ job queue (`FILE_GENERATION_QUEUE`) that processes PDF, XLSX, and CSV generation requests asynchronously. |
| **Platform Mail** | The platform operator's own SMTP, used only for internal platform emails (user verification, password reset). Separate from any tenant's email provider. |
| **Source of Truth (SOT)** | The internal abstraction layer that isolates the notification engine from direct database queries. Allows the data source to change without modifying the notification logic. |
| **COMMUNICATION_API_KEY** | A static shared secret used for service-to-service authentication. Passed in the `x-api-key` HTTP header. Not the same as a user-facing API key. |
| **Access Token** | A short-lived JWT (default 15 min) used to authenticate user API requests. Stateless — verified against `JWT_ACCESS_SECRET`. |
| **Refresh Token** | A longer-lived JWT (default 7 days) persisted in the `refresh_tokens` collection. Used to obtain new access tokens without re-logging in. Revoked on logout and password reset. |
