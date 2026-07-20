---
tags: [architecture]
---

# Data Models

Platform-level domain model — entities and relationships. Full schema detail (field tables, types, indexes) is in each module's Database doc.

---

## Domain Entities

### Platform-level (not tenant-scoped)

- **User** — platform operator account (email, password, verification status)
- **RefreshToken** — persisted JWT refresh tokens for session management
- **Channel** — communication channel type definition (`email`, `sms`, `storage`) — seeded, not per-tenant
- **Provider** — third-party provider definition (`gmail`, `twilio`, `aws-s3`, etc.) — seeded, not per-tenant

### Tenant-scoped (company-scoped)

- **Company** — the tenant record: identity, contact, address, URLs, social, legal, branding, timezone
- **CompanyTheme** — visual brand configuration (colours, typography) per company
- **CompanyChannelProvider** — which provider a company uses for a given channel
- **ProviderCredentials** — encrypted credentials for a company + channel + provider assignment
- **DomainCatalogue** — a business domain grouping events and defining channel routing (e.g. `invoices`, `support`)
- **EventCatalogue** — an individual notification event definition within a domain (e.g. `invoice.created`)
- **LayoutTemplate** — HTML + CSS email/PDF template, scoped to a company theme

---

## Relationship Overview

```
companies
  ├── company_themes
  │     └── layout_templates
  ├── company_channel_providers
  │     ├── → channels  (platform-level)
  │     ├── → providers (platform-level)
  │     └── provider_credentials
  └── domain_catalogues
        └── event_catalogues

users
  └── refresh_tokens

channels  (platform seed data)
providers (platform seed data)
```

---

## Key Constraints

- `companyKey` is unique and immutable — the stable tenant identifier
- One `CompanyChannelProvider` is `isDefault` per (company + channel)
- One `ProviderCredentials` tag is unique per `CompanyChannelProvider`
- One `CompanyTheme` is `isDefault` per company
- One `LayoutTemplate` is `isDefault` per (theme + type)

---

## Schema Detail

Full field tables, types, and index definitions for the Communication Backend:

→ [[Modules/Communication/Backend/Database]]
