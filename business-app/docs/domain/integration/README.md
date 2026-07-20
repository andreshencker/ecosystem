# Integration Hub Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Qué es el Integration Hub

El Integration Hub es el **único punto de contacto entre el ERP y el mundo exterior**. Es la Anti-Corruption Layer que separa los sistemas externos (Google, Stripe, Xero, bancos, webhooks) del dominio interno del ERP.

Sin Integration Hub:
- Calendar domain conoce los detalles de OAuth2 de Google
- Banking domain conoce el formato OFX de los bancos
- Accounting export domain conoce el API de Xero
- Cada dominio implementa su propio manejo de errores, retries, y rate limiting

Con Integration Hub:
- Google Calendar → Integration Hub → CalendarEventImported (Domain Event normalizado)
- OFX Bank Statement → Integration Hub → BankTransactionImported (Domain Event normalizado)
- Xero → Integration Hub → ExternalLedgerSynced (Domain Event normalizado)

---

## El principio fundamental

> **El Integration Hub no conoce el modelo de dominio del ERP. El ERP no conoce los protocolos de los sistemas externos.**

```
EXTERNO                    INTEGRATION HUB               INTERNO
─────────────────────────────────────────────────────────────────
Google Calendar API    →   OAuth + Rate Limiting    →   CalendarEventImported
OFX File               →   Parser + Normalizer      →   BankTransactionImported
Stripe Webhook         →   HMAC Verify + Mapper     →   PaymentConfirmed
Xero API               →   REST Client + Transformer →   ExternalLedgerSynced
Inbound Webhook        →   Auth + Dedup + Map       →   OrderCompleted
```

---

## Qué NO es Integration Hub

| Lo que NO es | Lo que ES en cambio |
|---|---|
| Un dominio de negocio | Una capa de adaptación e infraestructura |
| El responsable del significado de los datos | Solo traduce formatos, no interpreta |
| Un reemplazo del Event Bus interno | Solo produce Domain Events, no los consume |
| Un sustituto de Communications | Communications es outbound de negocio; Integration Hub es I/O de sistemas |

---

## Índice de documentos

| Documento | Descripción |
|---|---|
| [01-integration-domain.md](./01-integration-domain.md) | Conceptos: IntegrationConnection, Connector, SyncJob, WebhookEndpoint |
| [02-integration-patterns.md](./02-integration-patterns.md) | Patrones: Inbound, Outbound, Polling, Webhook, Streaming |
| [03-provider-catalog.md](./03-provider-catalog.md) | Catálogo de todos los proveedores soportados y futuros |
| [04-resilience.md](./04-resilience.md) | Circuit Breaker, Retry, Dead Letter, Rate Limiting, Health Checks |
