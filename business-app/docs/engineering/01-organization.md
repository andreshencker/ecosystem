# 01 — Organización de Ingeniería

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Estructura organizacional

```
CTO AGENT
  │  Lee arquitectura · Divide trabajo · Coordina departamentos
  │  Aprueba merges · Resuelve conflictos · Mantiene consistencia
  │
  ├─── PLATFORM ENGINEERING
  │         Identity · Auth · Users · Business · Provisioning · Security · RBAC
  │
  ├─── REVENUE ENGINEERING
  │         Work Domain · Rate Engine · Calendar Interpretation
  │         Revenue Domain · Revenue Flows · Shift Work
  │
  ├─── BILLING ENGINEERING
  │         Billing Domain · Invoices · Payments · Accounts Receivable
  │         Financial Policies (application layer)
  │
  ├─── ACCOUNTING ENGINEERING
  │         Financial Engine · Recognition Policy · Posting Rules
  │         Accounting Engine · General Ledger · Fiscal Periods
  │
  ├─── CALENDAR ENGINEERING
  │         Calendar Domain (transversal) · External sync · ScheduledEvents
  │
  ├─── DOCUMENT ENGINEERING
  │         Document Platform · Packages · Renderers · Document Management
  │
  ├─── COMMUNICATIONS ENGINEERING
  │         Communications integration · Email delivery · Notification routing
  │
  ├─── ANALYTICS ENGINEERING
  │         Analytics Domain · Read Models · KPIs · BI · Datasets
  │
  ├─── INTEGRATION ENGINEERING
  │         Integration Hub · External APIs · Calendar sync adapters · Banking (future)
  │
  ├─── FRONTEND ENGINEERING
  │         Business App UI · Platform Admin UI
  │
  ├─── QA ENGINEERING
  │         Test strategy · Automated testing · Quality gates · E2E
  │
  └─── INFRASTRUCTURE ENGINEERING
            DevOps · CI/CD · MongoDB · Redis · Queue · Environments · Monitoring
```

---

## Departamentos — Definiciones completas

---

### PLATFORM ENGINEERING

**Misión:** Construir y mantener la capa de identidad, seguridad, y tenant management del ERP. Es la fundación sobre la que todo lo demás descansa.

**Alcance:**
- Autenticación y autorización (JWT, refresh tokens, sessions)
- Gestión de usuarios e invitaciones
- Configuración del Business (tenant, FiscalProfile, settings)
- Provisioning del Business al crearse
- RBAC (roles y permisos)
- Seguridad transversal (rate limiting, helmet, audit log)

**Módulos que conoce:**
- `src/platform/auth` — JWT, login, registro, refresh
- `src/platform/users` — CRUD de usuarios, invitaciones
- `src/platform/company` — Business entity, FiscalProfile
- `src/platform/security` — RBAC guards, audit

**Módulos que NUNCA toca:**
- Ningún dominio operativo (Revenue, Billing, Work, Calendar)
- Ningún módulo de Accounting o Financial

**Domain Events que publica:**
- `UserRegistered` · `UserInvited` · `UserActivated` · `UserDeactivated`
- `BusinessCreated` · `BusinessProfileUpdated` · `FiscalProfileConfigured`
- `BusinessProvisioned`

**Domain Events que consume:**
- Ninguno (es el punto de inicio del sistema)

**Dependencias externas:**
- Communications App (para envío de emails de verificación/invitación)

**Ownership:** Todo archivo bajo `src/platform/` y `src/settings/`

---

### REVENUE ENGINEERING

**Misión:** Implementar los Revenue Flows del ERP. Comenzando con Shift Work, construir el pipeline completo desde el trabajo realizado hasta el Revenue Domain.

**Alcance:**
- Dominio Work: Contract, Rate, WorkEvent
- Rate Engine: cálculo de tarifas, segmentos, overtime, holiday rates
- Revenue Flow del Shift Work: pipeline completo
- Revenue Domain: RevenueDraft, BillingPeriod, RevenueLine
- Flow Policies del Shift Work
- Future Revenue Flows (Services, Products, Subscriptions — cuando llegue su Sprint)

**Módulos que conoce:**
- `src/work/` — Contract, Rate, WorkEvent
- `src/rate-engine/` — cálculos de tarifa
- `src/revenue/` — RevenueDraft, BillingPeriod, RevenueLine

**Módulos que NUNCA toca:**
- `src/billing/` — Billing es downstream; Revenue solo publica eventos
- `src/accounting/` · `src/financial/` — downstream
- `src/platform/` — upstream (solo lo consume para businessId scope)

**Domain Events que publica:**
- `WorkEventCreated` · `WorkEventConfirmed` · `WorkEventVoided` · `WorkEventInvoiced`
- `ContractCreated` · `ContractActivated` · `ContractCompleted`
- `BillingPeriodOpened` · `BillingPeriodClosed` · `BillingPeriodReopened`
- `RevenueDraftUpdated` · `RevenueDraftTransferred`

**Domain Events que consume:**
- `BusinessCreated` (para scope)
- `CustomerCreated` (para vincular Contracts)
- `CalendarEventImported` (de Calendar — para crear WorkEvents draft)
- `InvoiceVoided` (de Billing — para revertir WorkEvents a confirmed)

**Dependencias:** Calendar Engineering (events), Platform Engineering (scope), Billing Engineering (downstream consumer)

**Ownership:** Todo archivo bajo `src/work/`, `src/rate-engine/`, `src/revenue/`

---

### BILLING ENGINEERING

**Misión:** Gestionar el ciclo completo de la Invoice — desde su creación hasta el cobro — y las Financial Policies que gobiernan ese ciclo.

**Alcance:**
- Invoice lifecycle (draft → approved → sent → paid → overdue → collection)
- InvoiceItem creation desde RevenueDraft
- Payment recording y Accounts Receivable
- Overdue detection y reminder triggering
- Financial Policies: Payment Terms, Due Date, Reminder, Overdue, Collection
- Customer Statement (futuro)

**Módulos que conoce:**
- `src/billing/` — Invoice, InvoiceItem, Payment, AR

**Módulos que NUNCA toca:**
- `src/work/` · `src/revenue/` — upstream, nunca modifica
- `src/accounting/` — downstream, nunca escribe en el Journal
- `src/financial/` — downstream, no conoce FinancialTransaction internals

**Domain Events que publica:**
- `InvoiceGenerated` · `InvoiceApproved` · `InvoiceSent` · `InvoiceViewed`
- `InvoiceOverdue` · `InvoicePaid` · `InvoiceVoided` · `InvoiceCancelled`
- `PaymentRecorded` · `PaymentReversed`
- `BillingPeriodClosed` consumed → triggers `InvoiceDraftCreated`

**Domain Events que consume:**
- `BillingPeriodClosed` (de Revenue — para crear Invoice Draft)
- `PaymentRecorded` (propio — para actualizar amountDue)

**Dependencias:** Revenue Engineering (upstream), Financial Engineering (downstream consumer), Communications Engineering (para envío de Invoice)

**Ownership:** Todo archivo bajo `src/billing/`

---

### ACCOUNTING ENGINEERING

**Misión:** Construir el motor financiero y contable del ERP — la capa que transforma hechos de negocio en registros contables formales.

**Alcance:**
- Financial Engine: FinancialTransaction, Recognition Policy, Posting Rules
- Accounting Engine: JournalEntry, General Ledger
- Chart of Accounts por jurisdicción
- FiscalPeriod management
- Trial Balance, P&L, Balance Sheet
- BAS (Australia)

**Módulos que conoce:**
- `src/financial/` — FinancialTransaction, PostingRules, RecognitionPolicy
- `src/accounting/` — JournalEntry, GeneralLedger, ChartOfAccounts, FiscalPeriod

**Módulos que NUNCA toca:**
- Ningún módulo operativo (Work, Revenue, Billing, Customer)
- Solo escucha eventos — nunca modifica datos de otros dominios

**Domain Events que publica:**
- `FinancialTransactionCreated` · `TransactionPosted` · `TransactionRejected`
- `JournalEntryPosted` · `FiscalPeriodClosed` · `FiscalPeriodLocked`
- `TrialBalanceGenerated`

**Domain Events que consume:**
- `InvoiceSent` · `InvoiceVoided` · `PaymentRecorded` · `PaymentReversed`
- `CreditNoteIssued` · `ExpenseApproved` (futuro)

**Dependencias:** Billing Engineering (upstream events), Platform Engineering (FiscalProfile scope)

**Ownership:** Todo archivo bajo `src/financial/`, `src/accounting/`

---

### CALENDAR ENGINEERING

**Misión:** Implementar el Calendar Domain como infraestructura transversal de tiempo. Calendar no pertenece a ningún Revenue Flow — provee eventos de tiempo que cualquier dominio consume.

**Alcance:**
- CalendarSource: conexiones con Google Calendar, Apple Calendar, Outlook, iCal
- CalendarEvent sync y deduplicación
- ScheduledEvent management (due dates, deadlines fiscales, renewals)
- Availability y time slots (futuro)
- OAuth2 con proveedores externos

**Módulos que conoce:**
- `src/calendar/` — CalendarSource, CalendarEvent, ScheduledEvent

**Módulos que NUNCA toca:**
- Work domain (no crea WorkEvents — solo publica CalendarEventImported)
- Ningún módulo operativo downstream

**Domain Events que publica:**
- `CalendarEventImported` · `CalendarEventUpdated` · `CalendarEventCancelled`
- `CalendarSyncCompleted` · `CalendarSyncFailed`
- `ScheduledEventDue`

**Domain Events que consume:**
- `InvoiceSent` (para crear ScheduledEvent de due date)
- `BusinessCreated` (para provisioning de ScheduledEvents fiscales)

**Dependencias:** Integration Engineering (para adaptadores OAuth2 externos), Platform Engineering (scope)

**Ownership:** Todo archivo bajo `src/calendar/`

---

### DOCUMENT ENGINEERING

**Misión:** Construir el Document Platform y el Document Management. Generación efímera de PDFs y almacenamiento permanente de documentos del negocio.

**Alcance:**
- Document Platform: DocumentPackage, DocumentContract, DocumentBlock, DocumentTemplate
- PDF Renderer: conversión HTML → PDF, buffer efímero (TTL 15 min)
- Document Management: almacenamiento permanente, versionado, DocumentReference
- Theme system: colores, tipografía, branding

**Módulos que conoce:**
- `src/document-platform/` — Packages, Templates, Renderers
- `src/document-management/` — almacenamiento, versiones, referencias

**Módulos que NUNCA toca:**
- `src/billing/` — Billing solicita documentos; Document Platform los genera
- Ningún módulo de dominio operativo

**Domain Events que publica:**
- `DocumentRendered` · `DocumentStored` · `DocumentVersionCreated`
- `DocumentArchived`

**Domain Events que consume:**
- `InvoiceApproved` (para iniciar generación de PDF)
- `BusinessCreated` (para provisioning de DocumentPackages por defecto)

**Dependencias:** Analytics Engineering (para datasets en Document Contracts), Communications Engineering (para entrega del buffer)

**Ownership:** Todo archivo bajo `src/document-platform/`, `src/document-management/`

---

### COMMUNICATIONS ENGINEERING

**Misión:** Integrar el Business App con la Communications Platform para la entrega de emails, SMS, y notificaciones. No gestiona templates — gestiona la integración y el audit trail.

**Alcance:**
- CommunicationConnection: integración con Communications Platform
- CommunicationDispatch: envío de eventos a Communications Platform
- CommunicationLog: audit trail de comunicaciones desde Business App
- Email delivery para Invoice, Reminders, Overdue alerts

**Módulos que conoce:**
- `src/communications/` — CommunicationConnection, CommunicationLog, Dispatcher

**Módulos que NUNCA toca:**
- Ningún módulo operativo
- No gestiona templates (eso es Communications Platform, app separada)

**Domain Events que publica:**
- `CommunicationDispatched` · `CommunicationDelivered` · `CommunicationFailed`

**Domain Events que consume:**
- `DocumentRendered` (para adjuntar PDF y enviar email)
- `InvoiceOverdue` (para enviar recordatorio)
- `UserInvited` (de Platform — para enviar email de invitación)

**Dependencias:** Document Engineering (buffer del PDF), Platform Engineering (CommunicationConnection)

**Ownership:** Todo archivo bajo `src/communications/`

---

### ANALYTICS ENGINEERING

**Misión:** Construir el Analytics Domain: Read Models proyectados desde Domain Events, KPIs calculados, datasets para Document Platform y BI.

**Alcance:**
- Event ingestion de todos los dominios
- Read Model projections (Revenue, AR, Collections, Workload)
- KPI calculations (revenue por período, aging, cash flow)
- Dataset API para Document Platform (fulfills DocumentContracts)
- BI dashboards (futuro)

**Módulos que conoce:**
- `src/analytics/` — Read Models, projections, KPIs, Dataset API

**Módulos que NUNCA toca:**
- Ninguno — Analytics es read-only. Nunca escribe en colecciones de otros dominios.

**Domain Events que publica:**
- Ninguno — Analytics es un consumidor puro. No produce Domain Events.

**Domain Events que consume:**
- Todos los eventos del sistema (subscribes to all)

**Dependencias:** Todos los dominios (upstream consumers)

**Ownership:** Todo archivo bajo `src/analytics/`, `src/business-intelligence/`

---

### INTEGRATION ENGINEERING

**Misión:** Construir los adaptadores para sistemas externos. El Integration Hub es la Anti-Corruption Layer entre el mundo exterior y los dominios del ERP.

**Alcance:**
- Google Calendar adapter (OAuth2, sync engine)
- Apple Calendar / iCal adapter
- Outlook adapter (futuro)
- Banking adapters: OFX, CDR Open Banking (futuro)
- Xero / MYOB export adapter (futuro)
- Webhooks (incoming y outgoing)

**Módulos que conoce:**
- `src/integration/` — adapters, connectors, normalization

**Módulos que NUNCA toca:**
- Ningún dominio operativo directamente
- Solo publica eventos normalizados que otros dominios consumen

**Domain Events que publica:**
- `CalendarEventImported` (normalizado desde Google/iCal/Outlook)
- `BankTransactionImported` (futuro)
- `IntegrationConnected` · `IntegrationDisconnected` · `IntegrationSyncFailed`

**Domain Events que consume:**
- `CalendarIntegrationRequested` (de Business App — para iniciar conexión)

**Dependencias:** Calendar Engineering (CalendarEventImported), Platform Engineering (scope)

**Ownership:** Todo archivo bajo `src/integration/`

---

### FRONTEND ENGINEERING

**Misión:** Construir la interfaz de usuario del Business App: el portal que los Business Owners, Admins, Accountants, y Staff usan diariamente.

**Alcance:**
- Next.js app: todas las páginas del Business App
- Platform Admin UI: gestión de la plataforma SaaS
- Componentes UI: design system, DataGrid, forms, mobile-responsive
- API client: hooks para todos los endpoints del backend
- Authentication flow: login, registration, invitation acceptance

**Stack:** Next.js, React, TypeScript, MUI/Tailwind, TanStack Query

**Módulos que conoce:**
- `frontend/` — toda la aplicación frontend

**Módulos que NUNCA toca:**
- Backend src/ directamente (solo a través de API calls)

**Dependencias:** Todos los departamentos backend (consume sus APIs)

**Ownership:** Todo archivo bajo `frontend/`

---

### QA ENGINEERING

**Misión:** Garantizar la calidad de cada entrega. Sin QA sign-off, nada se mergea.

**Alcance:**
- Test strategy por dominio
- Unit tests para servicios y lógica de negocio
- Integration tests para endpoints
- E2E tests para flujos críticos
- Performance testing (futuro)
- Security testing (futuro)

**Regla de oro:** QA no implementa features. QA escribe tests que demuestran que los features funcionan correctamente según los criterios de aceptación.

**Dependencias:** Todos los departamentos (es un consumidor de calidad)

**Ownership:** Todo archivo bajo `test/`, `*.spec.ts`, `*.e2e-spec.ts`

---

### INFRASTRUCTURE ENGINEERING

**Misión:** Construir y mantener la plataforma técnica sobre la que el ERP corre.

**Alcance:**
- Docker / Docker Compose (dev, staging, production)
- CI/CD pipeline (GitHub Actions o similar)
- MongoDB: schemas, índices, migrations
- Redis: caching, sessions, queues
- Queue system: BullMQ para jobs asíncronos
- Logging: structured logs con correlation IDs
- Monitoring: health checks, alertas
- Environments: dev, staging, production

**Módulos que conoce:**
- `src/infrastructure/` — database, events, health, logging, queue, redis, security
- `Dockerfile` · `docker-compose.yml` · CI/CD configs

**Módulos que NUNCA toca:**
- Ningún módulo de dominio (no conoce Invoice, WorkEvent, etc.)

**Ownership:** Todo archivo bajo `src/infrastructure/`, archivos de Docker, CI/CD pipelines
