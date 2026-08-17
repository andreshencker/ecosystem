# Relay tenant identifier migration audit

Relay's canonical tenant identifier is `grapiflyOrganizationId`. The local
`companies._id` remains a temporary technical projection while operational
resources are migrated incrementally.

## Rules

- Grapifly owns organizations, memberships, roles, invitations and app access.
- Relay receives the active organization in the signed Grapifly session.
- New or updated migrated resources write `grapiflyOrganizationId`.
- During the compatibility window, reads may fall back to the bound local
  `companyId`; they must never accept a tenant identifier from request input.
- No legacy field or collection is removed until every dependent resource has
  passed migration and isolation tests.

## Inventory

| Resource                 | Current tenant field   | Phase           | Notes                                                    |
| ------------------------ | ---------------------- | --------------- | -------------------------------------------------------- |
| CompanyTheme             | ObjectId + Grapifly ID | Pilot migrated  | Canonical-first compatible reads; startup backfill       |
| RefreshToken             | string + Grapifly ID   | Already bridged | Session records intentionally retain both during refresh |
| EcosystemUser            | string + Grapifly ID   | Already bridged | Technical identity projection, not local auth            |
| CompanySmtp              | string                 | Pending         | Relay-owned operational credential configuration         |
| CompanyChannelProvider   | ObjectId + Grapifly ID | Migrated        | Canonical-first compatible reads; startup backfill       |
| ProviderCredentials      | Provider + Grapifly ID | Migrated        | Ownership copied without decrypting credential payloads  |
| CompanyIntegration       | ObjectId               | Pending         | Machine integrations and tokens                          |
| DomainCatalogue          | ObjectId               | Pending         | Notification catalogue dependency                        |
| NotificationExecutionLog | ObjectId               | Pending         | Historical/audit data; migrate after write paths         |
| DocumentDomainCatalogue  | ObjectId               | Pending         | File/document catalogue dependency                       |
| BankConnection           | string                 | Pending         | Accounting provider connection                           |
| XeroOrganisation         | ObjectId               | Pending         | Accounting organization mapping                          |
| WebhookDelivery          | ObjectId               | Pending         | Historical delivery records                              |
| WebhookEndpointSecret    | ObjectId               | Pending         | Encrypted operational secret                             |

## Recommended sequence

1. CompanyTheme pilot and verification.
2. Provider and credential resources. Completed.
3. Notification and document catalogues.
4. Calendar, payments and accounting resources.
5. Logs and historical webhook deliveries.
6. Remove compatibility reads and finally retire the local Company projection.
