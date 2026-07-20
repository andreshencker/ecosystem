# 06 — Implementation Roadmap

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Principios del roadmap

1. **Fundación antes que funcionalidad:** Los dominios base (Platform, Security, Customer) se construyen primero porque todo lo demás depende de ellos.
2. **Flujo completo antes que amplitud:** Se construye el flujo Shift Work completo de punta a punta antes de agregar nuevos Revenue Sources.
3. **Backend antes que frontend:** El backend define los contratos de API. El frontend los consume.
4. **Paralelismo donde hay independencia:** Calendar puede construirse mientras se construye Revenue. Document Platform puede prepararse mientras se construye Billing.

---

## Declaración por sprint — cómo leer el roadmap

Cada sprint declara explícitamente qué componentes son requeridos:

| Campo | Valores posibles |
|---|---|
| **Backend** | Requerido / No aplica |
| **Frontend** | Requerido / Opcional (puede avanzar en paralelo) / No aplica |
| **Analytics operativo** (BC-10, MongoDB) | Requerido / No aplica |
| **Business Intelligence** (BC-13, Neon) | Requerido / No aplica |
| **Eventos/contratos** | Lista de Domain Events que deben publicarse con payload correcto |
| **QA** | Siempre requerido salvo que se indique lo contrario |
| **Docs** | Siempre requerido |

**Regla de eventos para BI:** Los sprints 1-10 no requieren BI completo, pero **deben publicar los Domain Events correctos** porque esos eventos son la fuente de datos que BI consumirá en el futuro. Payload incompleto ahora = datos faltantes en el Data Warehouse después.

---

---

## Estado actual (pre-roadmap)

| Componente | Estado actual |
|---|---|
| `src/platform/auth` | ✅ Implementado (Sprint 1 parcial) |
| `src/platform/users` | ✅ Implementado (Sprint 1 parcial) |
| `src/platform/company` | ✅ Implementado (Sprint 1 parcial) |
| `src/infrastructure/` | ✅ Implementado (Sprint 0 parcial) |
| `src/settings/` | 🔄 Parcial |
| Todo lo demás | ⏳ Pendiente |

---

## Sprint 0 — Engineering Platform

**Duración:** 1-2 semanas
**Objetivo:** Base técnica sólida sobre la que todos los sprints posteriores corren.
**Agentes:** `InfrastructureAgent`

| Componente | Requerido |
|---|---|
| Backend | ✅ (infraestructura, no dominio) |
| Frontend | — |
| Analytics BC-10 | — |
| BI BC-13 | — (el servicio existe y es funcional, pero no ingesta datos aún) |
| Domain Events | — (ningún dominio implementado aún) |
| QA | ✅ (smoke tests de infra) |
| Docs | ✅ |

**Entregables:**
- Docker Compose completo para desarrollo local (MongoDB, Redis, BullMQ, API, Frontend)
- CI/CD pipeline: GitHub Actions con steps de lint, test, build
- MongoDB configurado con replica set (para transacciones)
- Redis configurado para cache y sessions
- BullMQ configurado para jobs asíncronos
- Estructura base del NestJS monorepo / módulos
- Structured logging con correlation IDs
- Health check endpoints
- Variables de entorno documentadas (`.env.example`)

**No incluye:** ningún módulo de dominio

---

## Sprint 1 — Platform Foundation

**Duración:** 2-3 semanas
**Objetivo:** Identity, Business, Security, y Provisioning completamente operativos.
**Agentes:** `PlatformAgent`, `ProvisioningAgent`, `QAAgent`
**Dependencias:** Sprint 0

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | ✅ (páginas de login, register, company settings) |
| Analytics BC-10 | — |
| BI BC-13 | — (no requiere ingesta aún) |
| Domain Events | ✅ `UserRegistered`, `EmailVerified`, `UserInvited`, `UserActivated`, `BusinessCreated`, `FiscalProfileConfigured` — payload completo requerido para futura ingesta en BI |
| QA | ✅ |
| Docs | ✅ |

**Nota BI:** Los eventos `BusinessCreated` y `UserRegistered` alimentarán `dim_business` y `dim_user` en BI cuando la ingesta esté activa. El payload debe incluir todos los campos que BI necesita (businessId, businessName, jurisdiction, currency, timezone).

**Entregables:**

*Identity & Auth:*
- `POST /auth/register` — registro + creación de Business
- `POST /auth/login` — login con JWT + refresh token
- `POST /auth/refresh` — renovación de token
- `POST /auth/forgot-password` + `POST /auth/reset-password`
- `POST /auth/verify-email`
- Rate limiting en endpoints de auth (15 req/min)

*Users & Invitations:*
- `GET/PATCH /users/me` — perfil propio
- `POST /users/change-password`
- `GET /users` — listar users del Business
- `POST /users/invite` — enviar invitación
- `GET/PATCH/DELETE /users/:id` — gestión de users
- `POST /users/:id/deactivate` + `POST /users/:id/reactivate`
- `POST /auth/accept-invitation`

*Business:*
- `GET/PATCH /company` — perfil del Business
- `GET/PATCH /company/fiscal-profile` — FiscalProfile
- `GET/PATCH /company/smtp` — configuración SMTP

*RBAC:*
- Guards para roles: business_owner, business_admin, accountant, staff, viewer
- Permission guards granulares por recurso

*Provisioning:*
- Flujo completo de provisioning al crear Business
- ChartOfAccounts por defecto (jurisdicción AU)
- Default DocumentPackages instalados
- CommunicationConnection default

**Estado:** Parcialmente implementado. Revisar contra la spec y completar.

---

## Sprint 2 — Customer & MDM

**Duración:** 1-2 semanas
**Objetivo:** Dominio Customer completo. Master Data Management base.
**Agentes:** `PlatformAgent` (Customer puede pertenecer aquí) o agente dedicado, `FrontendAgent`, `QAAgent`
**Dependencias:** Sprint 1

| Componente | Requerido |
|---|---|
| Backend | ✅ (Customer CRUD + Contacts + MDM base) |
| Frontend | ✅ (Customer list, create, edit, contacts — desktop DataGrid + mobile cards) |
| Analytics BC-10 | — (no se construye analytics de Customer hasta Sprint 11) |
| BI BC-13 | — (no requiere ingesta aún) |
| Domain Events | ✅ `CustomerCreated`, `CustomerUpdated`, `CustomerDeactivated`, `ContactAdded`, `ContactUpdated` — payload completo con `businessId`, `customerId`, `displayName`, `customerType`, `createdAt`, `updatedAt` |
| QA | ✅ (backend + frontend + gateway validation) |
| Docs | ✅ |

**Nota BI:** `CustomerCreated` alimentará `dim_customer` en el futuro. El payload debe incluir: `businessId`, `customerId`, `displayName`, `customerType`, `abn`, `email`, `isActive`, `createdAt`, `updatedAt`. Nunca marcar este sprint como DONE si los eventos no tienen estos campos.

**Nota gateway:** El frontend accede a customers via `GET /customers` (business-app/backend). Nunca via BI directo.

**Entregables:**

*Customer:*
- `POST /customers` — crear Customer (company o individual)
- `GET /customers` — listar con filtros (nombre, ABN, estado)
- `GET /customers/:id` — detalle
- `PATCH /customers/:id` — actualizar
- `POST /customers/:id/deactivate`
- `POST /customers/:id/contacts` — agregar Contact
- `GET /customers/:id/contacts`
- `PATCH /customers/:id/contacts/:contactId`
- `DELETE /customers/:id/contacts/:contactId`

*MDM (Master Data):*
- Catálogo de monedas
- Catálogo de tax rates por jurisdicción
- Catálogo de Invoice statuses
- Catálogo de Payment methods
- Catálogo de BillingCycle types

---

## Sprint 3 — Calendar Domain

**Duración:** 2 semanas
**Objetivo:** Calendar completamente funcional como dominio transversal.
**Agentes:** `CalendarAgent`, `IntegrationAgent`, `QAAgent`
**Dependencias:** Sprint 1 (para scope de businessId)
**Paralelo con:** Sprint 2

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | Opcional (UI básica de conexión de calendario) |
| Analytics BC-10 | — |
| BI BC-13 | — |
| Domain Events | ✅ `CalendarEventImported` (con campos completos para futura correlación con WorkEvents en BI) |
| QA | ✅ |
| Docs | ✅ |

**Entregables:**

*Calendar Sources:*
- `POST /calendar/sources` — conectar Google Calendar o iCal URL
- `GET /calendar/sources` — listar conexiones
- `DELETE /calendar/sources/:id` — desconectar
- OAuth2 flow completo con Google Calendar
- iCal URL import (polling)

*Calendar Sync:*
- Sync job periódico (cada 15 minutos)
- Deduplicación por `externalEventId`
- Publicación de `CalendarEventImported`
- Publicación de `CalendarEventUpdated` (para eventos modificados)
- Publicación de `CalendarEventCancelled`

*ScheduledEvents:*
- Creación de ScheduledEvents para Tax deadlines (jurisdicción AU)
- Job diario que publica `ScheduledEventDue` para events que llegan a su trigger date

---

## Sprint 4 — Work Domain + Rate Engine

**Duración:** 3 semanas
**Objetivo:** El dominio Work del flujo Shift Work completamente operativo.
**Agentes:** `WorkAgent`, `RateEngineAgent`, `QAAgent`
**Dependencias:** Sprint 2 (Customer), Sprint 3 (Calendar)

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | Opcional (WorkEvent UI puede avanzar en paralelo) |
| Analytics BC-10 | — |
| BI BC-13 | — |
| Domain Events | ✅ `WorkEventConfirmed` con `businessId`, `workEventId`, `customerId`, `userId`, `startTime`, `endTime`, `durationMinutes`, `durationHours`, `calculatedAmount`, `currency`, `rateType`, `billable`, `contractId`, `source` — estos campos llenan `fact_work_event` en BI |
| QA | ✅ |
| Docs | ✅ |

**Nota BI crítica:** `WorkEventConfirmed` es el evento más importante para `fact_work_event`. El payload debe ser completo y correcto. Si falta `calculatedAmount` o `rateType`, el fact quedará incompleto para siempre en el DW.

**Entregables:**

*Contracts:*
- `POST /contracts` — crear Contract con Customer
- `GET /contracts` — listar (filtros: customer, status, billingCycle)
- `GET /contracts/:id`
- `PATCH /contracts/:id`
- `POST /contracts/:id/activate`
- `POST /contracts/:id/complete`

*Rates:*
- `POST /contracts/:id/rates` — agregar Rate
- `GET /contracts/:id/rates`
- `PATCH /contracts/:id/rates/:rateId`
- `POST /contracts/:id/rates/:rateId/set-default`

*WorkEvents:*
- `POST /work-events` — crear manual
- `GET /work-events` — listar (filtros: date range, contract, status)
- `GET /work-events/:id`
- `PATCH /work-events/:id` — editar draft
- `POST /work-events/:id/confirm` — confirmar + calcular con Rate Engine
- `POST /work-events/:id/void` — anular
- Handler `CalendarEventImported` → crear WorkEvent draft
- Handler `InvoiceVoided` → revertir WorkEvent a confirmed

*Rate Engine:*
- Cálculo de RateResult para un WorkEvent
- Segmentación: standard, overtime, weekend, holiday, night
- RateCalculation snapshot inmutable

---

## Sprint 5 — Revenue Domain

**Duración:** 2 semanas
**Objetivo:** Revenue Domain completo — acumulación de ingreso y gestión de BillingPeriods.
**Agentes:** `RevenueAgent`, `QAAgent`
**Dependencias:** Sprint 4

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | Opcional |
| Analytics BC-10 | — |
| BI BC-13 | — |
| Domain Events | ✅ `BillingPeriodClosed` (con RevenueDraft completo) |
| QA | ✅ |
| Docs | ✅ |

**Entregables:**

*Revenue Domain:*
- Handler `WorkEventConfirmed` → crear/actualizar RevenueDraft
- BillingPeriod auto-creation cuando llega el primer WorkEvent sin período activo
- `GET /revenue/drafts` — listar RevenueDrafts activos del Business
- `GET /revenue/drafts/:id` — detalle con RevenueLines
- `POST /revenue/billing-periods/:id/close` — cierre manual
- Job diario de cierre automático de BillingPeriods por Cut-Off
- Publicación de `BillingPeriodClosed` con RevenueDraft completo
- `POST /revenue/billing-periods/:id/reopen` — reapertura (con condiciones)

*ShiftWork Flow Policies:*
- `GET/PATCH /company/shift-work-config` — configuración del flujo (billingCycle, cutOff, autoGenerate, etc.)

---

## Sprint 6 — Billing Domain

**Duración:** 3 semanas
**Objetivo:** Dominio Billing completo — Invoice lifecycle y Payments.
**Agentes:** `BillingAgent`, `QAAgent`
**Dependencias:** Sprint 5

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | Opcional (Invoice management UI) |
| Analytics BC-10 | — |
| BI BC-13 | — |
| Domain Events | ✅ `InvoiceGenerated`, `InvoiceSent`, `InvoiceOverdue`, `InvoicePaid`, `InvoiceVoided`, `PaymentRecorded`, `PaymentReversed` — estos eventos llenan `fact_invoice` y `fact_payment` en BI |
| QA | ✅ |
| Docs | ✅ |

**Nota BI crítica:** `InvoiceSent` debe incluir `businessId`, `invoiceId`, `customerId`, `subtotal`, `taxAmount`, `grossAmount`, `currency`, `issueDate`, `dueDate`. `PaymentRecorded` debe incluir `businessId`, `paymentId`, `invoiceId`, `customerId`, `amount`, `currency`, `paymentMethod`, `paymentDate`. Estos campos son invariantes del Data Warehouse.

**Entregables:**

*Invoice:*
- Handler `BillingPeriodClosed` → crear Invoice Draft
- `GET /invoices` — listar (filtros: status, customer, date range)
- `GET /invoices/:id` — detalle con InvoiceItems
- `POST /invoices/:id/approve` — aprobar
- `POST /invoices/:id/send` — enviar al Customer (trigger Document Platform)
- `POST /invoices/:id/void` — anular
- `POST /invoices` — crear Invoice libre (sin RevenueDraft)
- `POST /invoices/:id/items` — agregar InvoiceItem manual
- Job diario: detección de Invoices overdue → publicar `InvoiceOverdue`

*Financial Policies application:*
- Cálculo de dueDate según PaymentTerms
- `GET/PATCH /company/financial-policies` — configuración de Payment Terms, Reminder, Overdue

*Payments:*
- `POST /invoices/:id/payments` — registrar Payment
- `GET /invoices/:id/payments` — listar Payments de una Invoice
- `POST /invoices/:id/payments/:paymentId/reverse` — revertir Payment

---

## Sprint 7 — Financial Engine

**Duración:** 2 semanas
**Objetivo:** Financial Engine operativo — FinancialTransactions desde eventos de Billing.
**Agentes:** `FinancialAgent`, `QAAgent`
**Dependencias:** Sprint 6
**Paralelo con:** Sprint 8 (Accounting Engine puede preparar estructura)

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | — |
| Analytics BC-10 | — |
| BI BC-13 | — |
| Domain Events | ✅ `FinancialTransactionCreated` |
| QA | ✅ |
| Docs | ✅ |

**Entregables:**

*Financial Engine:*
- Handler `InvoiceSent` → crear FinancialTransaction INVOICE_ISSUED
- Handler `PaymentRecorded` → crear FinancialTransaction PAYMENT_RECEIVED
- Handler `InvoiceVoided` → crear FinancialTransaction INVOICE_VOIDED
- Handler `PaymentReversed` → crear FinancialTransaction PAYMENT_REVERSED
- Recognition Policy: INVOICE_BASIS por defecto
- `GET /financial/transactions` — listar FinancialTransactions del Business

---

## Sprint 8 — Accounting Engine

**Duración:** 2 semanas
**Objetivo:** Accounting Engine con Journal, General Ledger, y reporting básico.
**Agentes:** `AccountingAgent`, `QAAgent`
**Dependencias:** Sprint 7

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | — |
| Analytics BC-10 | — |
| BI BC-13 | — |
| Domain Events | ✅ `JournalEntryPosted`, `FiscalPeriodClosed`, `FiscalPeriodLocked` |
| QA | ✅ |
| Docs | ✅ |

**Entregables:**

*Accounting Engine:*
- Handler `FinancialTransactionCreated` → crear JournalEntry aplicando PostingRules
- `GET /accounting/journal` — Journal Entries (con filtros)
- `GET /accounting/general-ledger` — saldos por cuenta
- FiscalPeriod management: `GET /accounting/periods`, `POST /accounting/periods/:id/close`, `POST /accounting/periods/:id/lock`
- `GET /accounting/trial-balance` — Trial Balance en una fecha
- `GET /accounting/reports/pl` — P&L para un período
- `GET /accounting/reports/balance-sheet` — Balance Sheet en una fecha
- `GET /accounting/reports/bas` — BAS pre-filling para Australia

*Chart of Accounts:*
- `GET /accounting/chart-of-accounts` — ver CoA del Business
- `POST /accounting/chart-of-accounts/accounts` — agregar cuenta custom
- `PATCH /accounting/chart-of-accounts/accounts/:id`

---

## Sprint 9 — Document Platform

**Duración:** 3 semanas
**Objetivo:** Document Platform funcional con generación efímera de PDFs para Invoices.
**Agentes:** `DocumentAgent`, `AnalyticsAgent` (para datasets), `QAAgent`
**Dependencias:** Sprint 6 (Billing genera el trigger). Analytics debe poder proveer datasets básicos.
**Paralelo con:** Sprint 8 (Accounting puede continuar en paralelo)

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | — |
| Analytics BC-10 | ✅ (subconjunto mínimo: BusinessDataset, CustomerDataset, InvoiceDatasets) |
| BI BC-13 | — |
| Domain Events | ✅ `DocumentRendered`, `DocumentStored` |
| QA | ✅ |
| Docs | ✅ |

**Entregables:**

*Analytics — Dataset API (mínimo para Document Platform):*
- BusinessDataset (datos del Business para el PDF)
- CustomerDataset (datos del Customer para el PDF)
- InvoiceMetadataDataset, InvoiceItemsDataset, InvoiceTotalsDataset, PaymentDetailsDataset

*Document Platform:*
- DocumentPackage: Invoice Package v1.0 (Classic template)
- DocumentContract: InvoiceContract (qué datasets necesita)
- DocumentBlocks: business-header, customer-header, invoice-header, line-items, totals, payment-details, footer
- PDF Renderer: Puppeteer o equivalente (HTML → PDF)
- Buffer management con TTL 15 min (Redis)
- Handler `InvoiceApproved` → iniciar generación → publicar `DocumentRendered`

---

## Sprint 10 — Communications Integration

**Duración:** 2 semanas
**Objetivo:** Invoice entregada al Customer por email con PDF adjunto.
**Agentes:** `CommunicationsAgent`, `QAAgent`
**Dependencias:** Sprint 9

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | — |
| Analytics BC-10 | — |
| BI BC-13 | — |
| Domain Events | ✅ `CommunicationDispatched`, `CommunicationDelivered`, `CommunicationFailed` |
| QA | ✅ |
| Docs | ✅ |

**Entregables:**

*Communications:*
- Handler `DocumentRendered` → fetch buffer → dispatch a Communications Platform → publicar `CommunicationDispatched`
- Handler `CommunicationDelivered` → actualizar CommunicationLog → publicar `InvoiceDelivered` a Billing
- Handler `CommunicationFailed` → publicar `InvoiceDeliveryFailed` a Billing
- Handler `InvoiceOverdue` → trigger reminder email
- `GET /communications/log` — historial de comunicaciones del Business

---

## Sprint 11 — Analytics Engine completo

**Duración:** 3 semanas
**Objetivo:** Read Models completos y KPIs operativos para el dashboard del Business (Analytics BC-10).
**Nota:** Este sprint implementa Analytics operativo (MongoDB, dentro de business-app). El servicio Business Intelligence BC-13 (Python + PostgreSQL Neon) ya existe y está listo — la **ingesta de datos en BI se activa** una vez que este sprint haya completado el flujo de eventos end-to-end. La activación de la ingesta es una tarea separada para el `BusinessIntelligenceAgent`.
**Agentes:** `AnalyticsAgent`, `QAAgent`
**Dependencias:** Sprint 10 (para tener el flujo completo generando eventos)
**Paralelo con:** Sprints de Frontend

| Componente | Requerido |
|---|---|
| Backend | ✅ |
| Frontend | ✅ (dashboard con KPIs y charts) |
| Analytics BC-10 | ✅ (objetivo principal del sprint) |
| BI BC-13 | ✅ (activación de ingesta de datos desde Domain Events) |
| Domain Events | — (consume los ya existentes) |
| QA | ✅ (incluyendo: frontend no llama BI directo, gateway correcto) |
| Docs | ✅ |

**Separación Analytics vs BI en este sprint:**
- Analytics BC-10 (MongoDB): Revenue Summary, AR Aging, Collections Rate, Cash Flow, Workload — datos para el dashboard operacional
- BI BC-13 (Neon): activar ingesta de `fact_invoice`, `fact_payment`, `fact_work_event`, `fact_customer_activity` desde los eventos ya publicados por los sprints anteriores

**Entregables:**

*Read Models:*
- Revenue Summary: ingreso pendiente de facturar, facturado, cobrado
- AR Aging: facturas por antigüedad (30/60/90+ días)
- Collections Rate: % de facturas cobradas en el período
- Cash Flow projection
- Workload Analysis: horas trabajadas por Customer, período

*Dataset API completa:*
- Todos los datasets del Document Contract catálogo
- Query optimization y caching

*KPI API:*
- `GET /analytics/summary` — dashboard metrics
- `GET /analytics/revenue` — revenue por período
- `GET /analytics/ar-aging` — aging report
- `GET /analytics/cash-flow` — proyección de cash

---

## Sprint 12-14 — Frontend Business App

**Duración:** 3 × 2-3 semanas
**Objetivo:** Interfaz de usuario completa del Business App.
**Agentes:** `FrontendAgent`, `QAAgent`
**Dependencias:** Sprints 1-11 completos (puede arrancar gradualmente desde Sprint 1)

| Componente | Requerido |
|---|---|
| Backend | — (APIs ya implementadas) |
| Frontend | ✅ (objetivo principal) |
| Analytics BC-10 | — (ya implementado) |
| BI BC-13 | — (ya activo) |
| Domain Events | — (ya implementados) |
| QA | ✅ (validar que frontend NO llama BI/Analytics directo — **obligatorio** en todos los PRs) |
| Docs | ✅ |

**Regla de gateway para todos los sprints de Frontend:** Todo acceso a datos pasa por `business-app/backend`. El QAAgent debe verificar que no existe ninguna URL de BI o Analytics en el código del frontend.

**Sprint 12 — Foundation + Platform UI:**
- Login, registro, verificación de email
- Dashboard inicial (skeleton)
- Users + Invitations
- Company settings (perfil, fiscal, SMTP)
- Customer management (list, create, edit, contacts)

**Sprint 13 — Operational UI:**
- Calendar integration UI (conectar, ver estado, forzar sync)
- Contract + Rates UI
- WorkEvent management (list, create, confirm, void)
- Revenue Dashboard (BillingPeriods activos, RevenueDrafts)
- Invoice management (list, create, view, approve, send)
- Payment recording

**Sprint 14 — Financial + Analytics UI:**
- Accounting: Chart of Accounts, Journal, General Ledger
- Financial reporting: P&L, Balance Sheet, BAS
- Analytics dashboard: KPIs, revenue charts, AR aging
- Document management: ver documentos generados

---

## Sprint 15 — Integration Hub

**Duración:** 2 semanas
**Objetivo:** Calendar sync con Google Calendar production-ready. OFX import básico.
**Agentes:** `IntegrationAgent`, `QAAgent`
**Dependencias:** Sprint 3 (base del Calendar Domain)

**Entregables:**
- Google Calendar OAuth2 production-ready (refresh tokens, error handling)
- Apple Calendar / iCal URL import completo
- OFX bank statement import básico (para futuro Bank Reconciliation)

---

## Sprint 16+ — Revenue Flows adicionales

**Services Revenue Flow:**
- ServiceCatalog, ServiceOrder, ServiceDelivery
- Hourly Services Flow completo
- Fixed Price Services Flow
- Services Frontend UI

**Products Revenue Flow:**
- ProductCatalog, SalesOrder, OrderItem, Inventory básico
- DirectSaleFlow completo
- Products Frontend UI

**Subscriptions Revenue Flow:**
- SubscriptionPlan, SubscriptionPeriod, Renewal
- RecurringBillingFlow completo
- Integration con Calendar para renewal triggers

---

## Dependencias críticas entre Sprints

```
Sprint 0 (Infra)
  └──► Sprint 1 (Platform)
          └──► Sprint 2 (Customer)     ──────────────────────────────────────────┐
          └──► Sprint 3 (Calendar)     ─────────────────────────────────────────┐│
                  └──► Sprint 4 (Work)                                          ││
                          └──► Sprint 5 (Revenue)                               ││
                                  └──► Sprint 6 (Billing)                       ││
                                          └──► Sprint 7 (Financial)            ││
                                          └──► Sprint 9 (Document Platform)    ││
                                                  └──► Sprint 10 (Comms)       ││
                                                  └──► Sprint 8 (Accounting)   ││
                                                          └──► Sprint 11 (Analytics) ││
                                                                  └──► Sprint 12-14 (Frontend) ◄┘┘
```

**Paralelismos posibles:**
- Sprint 2 y Sprint 3 pueden correr simultáneamente
- Sprint 8 puede arrancar en paralelo con Sprint 9 (comparten dependencia de Sprint 7)
- Frontend puede arrancar gradualmente desde Sprint 1 para las páginas de Platform

---

## Definition of Done por Sprint

Un Sprint está DONE cuando:
1. Todos los endpoints especificados están implementados y funcionando
2. Tests unitarios y de integración pasan (sin skipear)
3. Los Domain Events especificados se publican con el payload correcto
4. Los handlers de eventos consumidos son idempotentes y testeados
5. La documentación en `docs/` fue actualizada para reflejar lo implementado
6. El código fue revisado y aprobado por el CTO Agent
7. QA Agent dio el sign-off
8. El feature está deployed en staging y verificado
