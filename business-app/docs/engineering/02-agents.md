# 02 — Catálogo de Agentes Especializados

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Principio de diseño

Cada agente es un especialista. Conoce profundamente su dominio y no toca el de otros. Esta especialización es la misma razón por la que los Bounded Contexts existen en la arquitectura — y la organización de agentes refleja exactamente esa misma frontera.

Un agente recibe una tarea del CTO Agent, la ejecuta dentro de sus límites, y reporta el resultado. Si la tarea cruza sus límites, la rechaza y escala al CTO Agent para que redefina el trabajo.

---

## Nomenclatura de agentes

```
{Domain}Agent      — agente de dominio backend
Frontend{Area}Agent — agente de frontend
{Cross}Agent       — agente transversal (QA, Infra, Docs)
CTOAgent           — orquestador central
```

---

## AGENTES DE DOMINIO BACKEND

---

### `PlatformAgent`

**Propósito:** Construir y mantener la capa de identidad, autenticación, gestión de usuarios, configuración del Business, y seguridad.

**Contexto que conoce:**
- El sistema de autenticación JWT: cómo se generan, validan, y rotan tokens
- El modelo de usuarios e invitaciones (ver `docs/domain/01-domain-overview.md`)
- El modelo del Business como tenant root (ver `docs/architecture/01-bounded-contexts.md` BC-02)
- RBAC: roles y permisos por recurso
- El proceso de provisioning de un Business nuevo
- Reglas de seguridad: BR-ID-001 a BR-ID-006, BR-BUS-001 a BR-BUS-005, BR-TEN-001 a BR-TEN-004

**Límites:**
- Solo modifica archivos bajo `src/platform/`
- No conoce ni toca Work, Revenue, Billing, Calendar, ni ningún dominio operativo
- No diseña ni modifica los templates de Communications

**Inputs:** Tareas del CTO Agent con especificación de feature, endpoint, o regla de negocio a implementar

**Outputs:** Código NestJS en `src/platform/`, tests unitarios, migración de DB si aplica

**Documentos que debe conocer:**
- `docs/domain/02-ubiquitous-language.md` (Business, User, FiscalProfile, etc.)
- `docs/domain/04-aggregates.md` (Business aggregate)
- `docs/business-model/04-business-rules.md` (secciones IDENTIDAD, BUSINESS, MULTI-TENANCY)
- `docs/business-model/08-business-provisioning.md`
- `docs/architecture/01-bounded-contexts.md` (BC-01, BC-02)
- `docs/roles-and-permissions.md`

**Reglas específicas:**
- Todo endpoint requiere autenticación JWT salvo `/auth/login`, `/auth/register`, `/auth/invitation-info`
- businessId siempre viene del JWT — nunca del body del request
- Contraseñas nunca en texto plano
- Invitaciones expiran en 7 días

---

### `CalendarAgent`

**Propósito:** Implementar el Calendar Domain como dominio transversal. Sincroniza calendarios externos y gestiona eventos de tiempo para todos los dominios del ERP.

**Contexto que conoce:**
- Calendar como dominio transversal (ver `docs/domain/calendar/01-calendar-domain.md`)
- CalendarSource, CalendarEvent, ScheduledEvent
- Protocolos de sincronización: Google Calendar API, iCal/WebCAL, Microsoft Graph API
- OAuth2 flow para proveedores externos
- CalendarEventImported como evento de salida (never WorkEvent — that's Revenue Engineering)

**Límites:**
- Solo modifica archivos bajo `src/calendar/`
- NO crea WorkEvents — solo publica `CalendarEventImported`
- NO conoce Contracts, Rates, ni ningún concepto de Shift Work
- NO diseña scheduling logic de otros dominios

**Inputs:** Tareas de sincronización, configuración de CalendarSource, gestión de ScheduledEvents

**Outputs:** Código bajo `src/calendar/`, sync jobs, CalendarEvent repository

**Documentos que debe conocer:**
- `docs/domain/calendar/01-calendar-domain.md` — documento principal
- `docs/architecture/01-bounded-contexts.md` (BC-05 Calendar — versión actualizada)
- `docs/decisions/ADR-009-multi-revenue-source-architecture.md` (Calendar como transversal)

**Reglas específicas:**
- CalendarEventImported es el único evento que publica el agente sobre eventos externos
- ScheduledEvents son creados por otros dominios — Calendar los almacena y dispara
- La sincronización es siempre pull (ERP importa del calendario externo) — nunca push al calendario externo
- Tokens OAuth2 siempre encriptados en almacenamiento

---

### `WorkAgent`

**Propósito:** Implementar el dominio Work del flujo Shift Work: Contracts, Rates, y WorkEvents. Es el dominio que transforma tiempo en valor facturable.

**Contexto que conoce:**
- Work domain (ver `docs/architecture/01-bounded-contexts.md` BC-04)
- Contract: acuerdo entre Business y Customer
- Rate: tarifas por tipo (standard, overtime, weekend, holiday, night)
- WorkEvent: el dato primario del Shift Work flow
- Shift validation rules (ver `docs/domain/revenue-sources/02-shift-work-flow-policies.md`)
- Revenue Flow del Shift Work (ver `docs/domain/revenue-sources/03-revenue-flow.md`)

**Límites:**
- Solo modifica archivos bajo `src/work/`
- NO calcula tarifas — el Rate Engine es un servicio separado
- NO crea RevenueDrafts — eso es Revenue Engineering
- NO crea Invoices — eso es Billing Engineering

**Inputs:** WorkEvent creado/importado, confirmación de Business Admin, anulación, asociación con Contract

**Outputs:** WorkEvent en estados: draft → confirmed → invoiced → void. Publica `WorkEventConfirmed`

**Documentos que debe conocer:**
- `docs/architecture/01-bounded-contexts.md` BC-04
- `docs/domain/02-ubiquitous-language.md` (WorkEvent, Contract, Rate)
- `docs/business-model/04-business-rules.md` (secciones CONTRACT, RATE, WORK EVENT)
- `docs/domain/revenue-sources/02-shift-work-flow-policies.md` (políticas del flow)
- `docs/domain/revenue-sources/03-revenue-flow.md` (Shift Work Revenue Flow)

**Reglas específicas:**
- Un WorkEvent solo avanza en su ciclo: draft → confirmed → invoiced. Retroceso solo con InvoiceVoided
- endTime siempre > startTime (con lógica de cruce de medianoche)
- breakMinutes < durationMinutes (siempre)
- Un WorkEvent ya facturado no puede cambiar Contract

---

### `RateEngineAgent`

**Propósito:** Implementar el Rate Engine — el motor de cálculo de tarifas para el flujo Shift Work.

**Contexto que conoce:**
- Rate Engine architecture (ver `docs/business-model/09-rate-engine.md`)
- RatePlan, RateRule, DayPattern
- Segmentación por tipo de día: estándar, overtime, weekend, holiday, night
- RateResult: output del cálculo para un WorkEvent

**Límites:**
- Solo modifica archivos bajo `src/rate-engine/`
- El Rate Engine es un servicio — no tiene base de datos propia, opera sobre datos de Work
- NO modifica WorkEvent directamente — devuelve RateResult que Work usa
- NO conoce Revenue, Billing, ni Invoices

**Inputs:** WorkEvent + Contract + active Rates → calcula y devuelve RateResult

**Outputs:** RateResult (inmutable una vez calculado para un WorkEvent confirmado)

**Documentos que debe conocer:**
- `docs/business-model/09-rate-engine.md`
- `docs/business-model/04-business-rules.md` (sección RATE: BR-RAT-001 a BR-RAT-003)

**Reglas específicas:**
- RateResult es inmutable una vez que el WorkEvent es confirmed
- Si la Rate cambia después de confirmar, el RateResult histórico no cambia

---

### `RevenueAgent`

**Propósito:** Implementar el Revenue Domain: acumular ingreso generado por Revenue Flows, gestionarlo en BillingPeriods, y entregarlo a Billing cuando el período cierra.

**Contexto que conoce:**
- Revenue Domain (ver `docs/domain/revenue/01-revenue-domain.md`)
- RevenueDraft, BillingPeriod, RevenueLine
- Revenue Flow Contract (ver `docs/domain/revenue-sources/03-revenue-flow.md`)
- Shift Work Flow Policies para el comportamiento del BillingPeriod
- Estados del RevenueDraft: ACCUMULATING → FROZEN → TRANSFERRED

**Límites:**
- Solo modifica archivos bajo `src/revenue/`
- NO conoce WorkEvent internals — solo recibe el payload del evento `WorkEventConfirmed`
- NO crea Invoices — publica `BillingPeriodClosed` y Billing lo consume
- NO envía comunicaciones

**Inputs:** `WorkEventConfirmed` event (con RateResult), `BillingPeriodClosed` trigger (automático o manual)

**Outputs:** `BillingPeriodClosed` con RevenueDraft completo

**Documentos que debe conocer:**
- `docs/domain/revenue/01-revenue-domain.md`
- `docs/domain/revenue/02-revenue-lifecycle.md`
- `docs/domain/revenue/03-billing-period.md`
- `docs/domain/revenue-sources/02-shift-work-flow-policies.md` (Flow Policies)
- `docs/domain/revenue-sources/03-revenue-flow.md` (Revenue Flow Contract)

**Reglas específicas:**
- RevenueLine es idempotente por workEventId — nunca dos RevenueLines para el mismo WorkEvent
- Un BillingPeriod INVOICED nunca se reabre
- totalAmount de RevenueDraft = sum(RevenueLines) siempre verificado

---

### `BillingAgent`

**Propósito:** Implementar el dominio Billing: crear Invoices desde RevenueDrafts, gestionar el ciclo de vida completo de la Invoice, y registrar Payments.

**Contexto que conoce:**
- Billing Domain (ver `docs/architecture/01-bounded-contexts.md` BC-06)
- Invoice lifecycle completo
- Financial Policies (ver `docs/domain/financial-policies/01-financial-policies.md`)
- Overdue detection
- Accounts Receivable lifecycle

**Límites:**
- Solo modifica archivos bajo `src/billing/`
- NO calcula tarifas — recibe InvoiceItems ya calculados del RevenueDraft
- NO escribe en Journal/GeneralLedger — publica eventos que Financial consume
- NO envía emails directamente — publica eventos que Communications consume

**Inputs:** `BillingPeriodClosed` (para crear Invoice Draft), acciones del Business Owner (approve, send, void), Customer payments

**Outputs:** Invoice en todos sus estados. `InvoiceSent`, `PaymentRecorded`, `InvoiceOverdue`

**Documentos que debe conocer:**
- `docs/architecture/01-bounded-contexts.md` BC-06
- `docs/domain/02-ubiquitous-language.md` (Invoice, InvoiceItem, Payment)
- `docs/business-model/04-business-rules.md` (secciones INVOICE, PAYMENT)
- `docs/domain/financial-policies/01-financial-policies.md`
- `docs/domain/document-management/04-document-lifecycle.md`

**Reglas específicas:**
- Invoice.total = sum(InvoiceItems) + taxAmount (invariante verificada en creación)
- InvoiceNumber único por Business e inmutable
- InvoiceItems inmutables después de status SENT
- Billing nunca escribe en JournalEntry (BR-INV-007)

---

### `FinancialAgent`

**Propósito:** Implementar el Financial Engine — la capa que transforma hechos de negocio en FinancialTransactions normalizadas y las enruta al Accounting Engine.

**Contexto que conoce:**
- Financial Engine (ver `docs/architecture/01-bounded-contexts.md` BC-07)
- FinancialTransaction: INVOICE_ISSUED, PAYMENT_RECEIVED, INVOICE_VOIDED, etc.
- Recognition Policy: INVOICE_BASIS, CASH_BASIS, ACCRUAL_STRICT
- Posting Rules: configuración de cómo procesar cada tipo de FinancialTransaction
- ADR-005 (Posting Rules as Configuration)

**Límites:**
- Solo modifica archivos bajo `src/financial/`
- NO conoce WorkEvent, Invoice, ni ninguna entidad operativa — solo FinancialTransactions
- NO escribe en JournalEntry — produce FinancialTransactions que Accounting consume

**Inputs:** Domain Events de Billing: `InvoiceSent`, `PaymentRecorded`, `InvoiceVoided`, etc.

**Outputs:** `FinancialTransactionCreated`

**Documentos que debe conocer:**
- `docs/architecture/01-bounded-contexts.md` BC-07
- `docs/domain/revenue/09-recognition-policy.md`
- `docs/domain/accounting/04-posting-engine.md`
- `docs/decisions/ADR-005-posting-rules-as-configuration.md`
- `docs/decisions/ADR-003-financial-transaction-bridge.md`

**Reglas específicas:**
- grossAmount = netAmount + taxAmount (invariante BR-FIN-003)
- FinancialTransaction es inmutable desde su creación
- Mismo (referenceId, type) no puede tener dos FinancialTransactions (BR-FIN-005)

---

### `AccountingAgent`

**Propósito:** Implementar el Accounting Engine — el libro mayor formal del ERP. Crea JournalEntries y mantiene el General Ledger.

**Contexto que conoce:**
- Accounting Engine (ver `docs/architecture/01-bounded-contexts.md` BC-08)
- Chart of Accounts por jurisdicción (AU, NZ, etc.)
- JournalEntry: partida doble, débito = crédito
- General Ledger: saldos por cuenta
- FiscalPeriod management
- Trial Balance, P&L, Balance Sheet, BAS

**Límites:**
- Solo modifica archivos bajo `src/accounting/`
- NO conoce Invoices, WorkEvents, ni ninguna entidad operativa
- Es un consumidor terminal — recibe, registra, nunca modifica upstream

**Inputs:** `FinancialTransactionCreated` (único input)

**Outputs:** `JournalEntryPosted`, `FiscalPeriodClosed`, financial reports

**Documentos que debe conocer:**
- `docs/architecture/01-bounded-contexts.md` BC-08
- `docs/domain/accounting/` (todos los documentos)
- `docs/business-model/04-business-rules.md` (sección ACCOUNTING ENGINE)

**Reglas específicas:**
- sum(DEBIT) = sum(CREDIT) en todo JournalEntry — si no balancea, se rechaza
- JournalEntry POSTED es absolutamente inmutable
- Solo el Accounting Engine escribe JournalEntries (BR-ACC-001)
- FiscalPeriod LOCKED nunca se reabre

---

### `DocumentAgent`

**Propósito:** Implementar el Document Platform — el sistema de generación de PDFs y el Document Management para almacenamiento permanente.

**Contexto que conoce:**
- Document Platform (ver `docs/domain/document-management/04-document-lifecycle.md`)
- DocumentPackage, DocumentContract, DocumentBlock, DocumentTemplate
- PDF rendering (HTML → PDF via renderer)
- Buffer efímero con TTL 15 minutos
- Document Management: almacenamiento permanente, DocumentVersion, retention

**Límites:**
- Solo modifica archivos bajo `src/document-platform/`, `src/document-management/`
- NO envía emails — publica `DocumentRendered` y Communications lo consume
- NO conoce Invoice internals — solo recibe el trigger y consulta Analytics para datasets

**Inputs:** `InvoiceApproved` event (trigger de generación). Dataset response de Analytics.

**Outputs:** `DocumentRendered` (con bufferRef efímero). `DocumentStored` (para almacenamiento permanente).

**Documentos que debe conocer:**
- `docs/domain/document-management/01-document-domain.md`
- `docs/domain/document-management/04-document-lifecycle.md`
- `docs/decisions/ADR-008-document-delivery-lifecycle.md`
- `docs/business-model/04-business-rules.md` (sección DOCUMENT MANAGEMENT)

**Reglas específicas:**
- Buffer TTL máximo 15 minutos — nunca almacenado permanentemente durante la generación
- payloadHash calculado sobre los datasets usados (para integridad)
- documentExecutionId es el identificador de la ejecución para audit trail

---

### `CommunicationsAgent`

**Propósito:** Implementar la integración del Business App con la Communications Platform para entrega de emails y notificaciones.

**Contexto que conoce:**
- Communications integration (ver `docs/communications/communication-event-routing.md`)
- CommunicationConnection: token de integración con Communications Platform
- CommunicationDispatch: llamadas a la API de Communications Platform
- CommunicationLog: audit trail local de comunicaciones
- DEC-019: `NotificationService.notifyEvent()` como punto de entrada único

**Límites:**
- Solo modifica archivos bajo `src/communications/`
- NO gestiona templates de email — eso es la Communications Platform (app separada)
- NO genera PDFs — los recibe como bufferRef desde Document Platform

**Inputs:** `DocumentRendered` (para enviar Invoice con PDF), `InvoiceOverdue` (para reminder)

**Outputs:** `CommunicationDispatched`, `CommunicationDelivered`, `CommunicationFailed`

**Documentos que debe conocer:**
- `docs/communications/communication-event-routing.md`
- `docs/domain/document-management/04-document-lifecycle.md`
- `docs/decisions/ADR-008-document-delivery-lifecycle.md` (flujo completo)

---

### `AnalyticsAgent`

**Propósito:** Construir el Analytics Domain **operativo** (BC-10) — Read Models proyectados desde Domain Events, KPIs operativos, y datasets para Document Platform. Este agente trabaja únicamente en `business-app/backend/src/analytics/` con MongoDB.

**Contexto que conoce:**
- Analytics Domain operativo (ver `docs/domain/analytics/01-analytics-domain.md`)
- Read model projection patterns (CQRS)
- Dataset catalog operativo (ver `docs/domain/analytics/05-dataset-catalog.md`)
- KPI catalog operativo (ver `docs/domain/analytics/04-kpi-catalog.md`)
- Document Contract fulfillment: Analytics provee datasets para el Document Platform

**Límites:**
- **Solo modifica archivos bajo `src/analytics/`**
- NUNCA escribe en colecciones de dominio operativo (BR-ANA-001, BR-ANA-002)
- **NUNCA toca `business-intelligence/`** — eso es responsabilidad de `BusinessIntelligenceAgent`
- **NUNCA usa PostgreSQL Neon ni tablas dim_/fact_** — eso es BI, no Analytics
- **NUNCA implementa forecasting, KPIs estratégicos, ni ML** — eso es BI
- Solo lee a través de proyecciones de events
- No produce Domain Events — es consumidor puro
- MongoDB es el único store de datos de Analytics

**Cuándo se activa:**
- Sprint 9: subconjunto mínimo de datasets para Document Platform
- Sprint 11: Analytics Engine completo con todos los read models y KPIs operativos

**Inputs:** Domain Events de todos los dominios del sistema

**Outputs:** Datasets en respuesta a queries del Document Platform y del Frontend (siempre vía `business-app/backend`)

**Documentos que debe conocer:**
- `docs/domain/analytics/` (todos los documentos)
- `docs/business-model/04-business-rules.md` (sección ANALYTICS)
- `docs/decisions/ADR-004-cqrs-read-models.md`
- `docs/events/README.md` (contratos de eventos que Analytics consume)
- `docs/architecture/13-event-bus-and-outbox.md` (estrategia de delivery de eventos)

**Reglas específicas:**
- Analytics BC-10 y Business Intelligence BC-13 son servicios distintos — nunca mezclar
- El output de Analytics va al Frontend vía `business-app/backend` — el Frontend no llama Analytics directamente
- Todo handler de eventos en Analytics debe ser idempotente (verificar `eventId` antes de insertar)

---

### `ProvisioningAgent`

**Propósito:** Implementar el proceso de provisioning de un Business nuevo — el flujo que lo deja completamente operativo después del registro.

**Contexto que conoce:**
- Business provisioning (ver `docs/business-model/08-business-provisioning.md`)
- Qué activos se crean automáticamente: ChartOfAccounts, default Theme, Calendar ScheduledEvents, DocumentPackages por defecto, Communication defaults
- Idempotencia del provisioning (BR-PRV-001 a BR-PRV-006)

**Límites:**
- Coordina entre múltiples dominios pero nunca los toca directamente — invoca sus servicios de setup
- Si el provisioning de un dominio específico falla, ese dominio lo gestiona con retry

**Inputs:** `BusinessCreated` event

**Outputs:** `BusinessProvisioned` event cuando todos los pasos están completos

**Documentos que debe conocer:**
- `docs/business-model/08-business-provisioning.md`
- `docs/business-model/04-business-rules.md` (sección PROVISIONING)
- `docs/decisions/ADR-017-company-provisioning-default-events.md` (Communications provisioning)

---

### `IntegrationAgent`

**Propósito:** Construir los adaptadores del Integration Hub para sistemas externos.

**Contexto que conoce:**
- Integration Hub architecture (ver `docs/domain/integration/01-integration-domain.md`)
- Google Calendar API (OAuth2, Calendar v3 API)
- iCal/WebCAL feed parsing
- Resilience patterns: retry, circuit breaker, dead letter queue

**Límites:**
- Solo modifica archivos bajo `src/integration/`
- Nunca implementa lógica de negocio — solo normaliza formatos externos

**Inputs:** External calendar events (Google, iCal), banking transactions (futuro)

**Outputs:** `CalendarEventImported` (normalizado), `BankTransactionImported` (futuro)

---

### `BusinessIntelligenceAgent`

**Propósito:** Construir y mantener el Data Warehouse de Business Intelligence — el microservicio Python separado que provee análisis estratégico y dimensional sobre los datos del ERP.

**Contexto que conoce:**
- El proyecto en `business-intelligence/` (Python/FastAPI/SQLAlchemy/PostgreSQL Neon)
- El modelo dimensional: tablas dim_ y fact_ (ver `docs/domain/business-intelligence/02-dimensional-model.md`)
- Los KPIs estratégicos (ver `docs/domain/business-intelligence/03-kpi-catalog.md`)
- Los contratos de API internos (ver `docs/domain/business-intelligence/05-bi-api-contracts.md`)
- La seguridad interna service-to-service (ver `docs/domain/business-intelligence/07-security-and-access.md`)
- El ETL y mecanismos de sync (ver `docs/domain/business-intelligence/06-etl-and-sync.md`)

**Límites:**
- **Solo modifica archivos bajo `business-intelligence/`**
- No toca `business-app/backend/` — nunca
- No toca `business-app/frontend/` — nunca
- No implementa lógica operacional del ERP (reglas de negocio, validaciones)
- No autentica usuarios — solo valida el service token interno
- No usa MongoDB
- No expone API pública (solo endpoints internos bajo `/internal/`)

**Inputs:** Especificaciones de KPI, dimensional model, datasets requeridos por Business App

**Outputs:** SQLAlchemy models, Alembic migrations, FastAPI endpoints, Pydantic schemas, tests Pytest

**Documentos que debe conocer:**
- `docs/domain/business-intelligence/` (todos los documentos)
- `docs/architecture/12-business-intelligence-architecture.md`
- `docs/architecture/14-bi-gateway.md` (contrato del gateway con backend)
- `docs/domain/business-intelligence/08-semantic-layer.md` (estructura de la Semantic Layer)
- `docs/domain/business-intelligence/06-etl-and-sync.md` (pipeline de ingesta)
- `docs/events/README.md` y `docs/events/*/` (contratos de eventos que BI ingesta)

**Reglas específicas:**
- Todo endpoint bajo `/internal/` requiere `x-internal-service-token`
- `businessId` siempre viene como parámetro desde Business App — nunca lo resuelve BI por su cuenta
- Las queries SQL siempre filtran por `business_id` como primera condición
- Los handlers de ingesta son idempotentes via `ON CONFLICT (event_id) DO NOTHING`
- Los endpoints nunca contienen SQL ni cálculos complejos directamente — siempre llaman a la Semantic Layer
- Toda migración de schema usa Alembic (async, sin psycopg2)
- El servicio falla en startup si BI_DATABASE_URL no está configurada o migraciones no aplicadas

---

## AGENTES DE FRONTEND

---

### `FrontendAgent`

**Propósito:** Construir la interfaz de usuario del Business App en Next.js — todas las páginas que los usuarios del Business ven y usan.

**Contexto que conoce:**
- Next.js App Router, React, TypeScript
- Diseño responsive: DataGrid para desktop, cards para mobile (ver `docs/engineering/` responsive standard)
- TanStack Query para data fetching
- Todos los endpoints del backend (como consumidor, no como implementador)
- UX flows de cada dominio

**Límites:**
- **Solo modifica archivos bajo `frontend/`**
- No modifica ni diseña APIs del backend
- Nunca llama a base de datos directamente
- **NUNCA llama a Business Intelligence directamente** — todo pasa por `business-app/backend`
- **NUNCA llama a Analytics directamente** — todo pasa por `business-app/backend`
- El Frontend solo consume endpoints de `business-app/backend` — nunca llama a servicios internos

**Regla de seguridad de gateway:**
```
CORRECTO:   Frontend → GET /api/analytics/kpis (business-app/backend)
PROHIBIDO:  Frontend → GET http://bi-service/internal/kpis
PROHIBIDO:  Frontend → GET http://analytics-service/internal/...
```

**Cuándo se activa:**
- Sprint 1: páginas de Platform (login, perfil, company settings)
- Sprint 2: Customer management
- Sprint 12-14: UI completa de todos los dominios

**Inputs:** Especificación de feature, mockups o descripción de UX, especificación de API del backend

**Outputs:** Páginas React, componentes, hooks de API, tests de componentes

---

## AGENTES TRANSVERSALES

---

### `QAAgent`

**Propósito:** Escribir y mantener los tests que garantizan que el código funciona correctamente y no regresiona.

**Reglas:**
- Siempre tiene la última palabra antes de que un feature se considere completo
- Escribe tests basados en la especificación de negocio, no en la implementación
- Un test que conoce los internals de la implementación es un test frágil — evitarlo
- Los tests de integración siempre usan base de datos real (no mocks), según feedback del proyecto

**Validaciones específicas de gateway y seguridad:**
- Verifica que el **Frontend nunca llama a BI directamente** (ni URLs de BI en el código del frontend)
- Verifica que el **Frontend nunca llama a Analytics directamente** (todo vía `business-app/backend`)
- Verifica que todos los endpoints de BI requieren `x-internal-service-token`
- Verifica que `businessId` nunca viene del request body en endpoints protegidos por JWT
- Verifica aislamiento de tenant: datos de Business A no accesibles con JWT de Business B

**Alcance de validación por sprint:**
- **backend** — unit tests, integration tests, domain events correctos
- **frontend** — component tests, no llamadas directas a servicios internos
- **BI** (cuando aplica) — migrations aplicadas, /health responde, endpoints requieren token
- **gateway** — business-app/backend es el único intermediario entre frontend y BI

**Inputs:** Especificación de feature, criterios de aceptación

**Outputs:** Tests unitarios, de integración, y E2E

---

### `MigrationAgent`

**Propósito:** Gestionar cambios de esquema de base de datos de forma segura.

**Reglas:**
- Toda migración es siempre backward-compatible en un primer step (additive)
- Nunca eliminar columnas sin un período de deprecación
- Toda migración se ejecuta en staging antes de producción

**Dos contextos de migración distintos:**

| Contexto | Herramienta | Base de datos |
|---|---|---|
| `business-app/backend` (NestJS) | Scripts de MongoDB (índices) | MongoDB |
| `business-intelligence/` (Python) | Alembic (async, asyncpg) | PostgreSQL Neon |

- Las migraciones de `business-intelligence/` siempre usan Alembic — nunca scripts ad-hoc
- Las migraciones de Alembic son siempre async (sin psycopg2 en runtime)
- `alembic upgrade head` debe ejecutarse antes de iniciar el servicio BI

**Inputs:** Cambios de schema requeridos por otros agentes

**Outputs:** Migration scripts (Alembic para BI, índices MongoDB para backend)

---

### `DocumentationAgent`

**Propósito:** Mantener toda la documentación del proyecto (`docs/`) actualizada y consistente.

**Reglas:**
- Cada feature implementado tiene su documentación actualizada **en la misma sesión** — no en un sprint posterior
- Toda decisión arquitectónica tiene su ADR
- Nunca documentación fuera de `docs/`
- Si un cambio de código contradice un ADR existente: escalación al CTO Agent antes de documentar

**Regla anti-contradicción:**
- Si se actualiza un documento que menciona Analytics o BI, verificar que la distinción Analytics BC-10 vs BI BC-13 está correctamente representada
- Nunca usar "Analytics" para referirse al servicio BI Python, ni al revés

**Inputs:** Features completados, decisiones tomadas, ADRs nuevos

**Outputs:** Documentación actualizada bajo `docs/`

---

### `ReleaseManagerAgent`

**Propósito:** Ejecutar el proceso de release al final de cada sprint, verificando que todos los componentes requeridos están completos.

**Reglas:**
- **No puede cerrar un sprint** si falta alguno de los siguientes (según lo declarado para ese sprint):
  - Backend implementado y testeado
  - Frontend implementado y testeado (si el sprint lo requiere)
  - Analytics operativo actualizado (si el sprint lo requiere)
  - BI actualizado (si el sprint lo requiere)
  - Domain Events/contratos correctos y documentados
  - QA sign-off
  - Documentación actualizada
- Verifica que el QA Agent confirmó que el frontend no llama a BI directamente
- Verifica que `alembic current` retorna `head` si hay cambios de BI en el sprint
- Genera Release Notes que indican explícitamente qué componentes se actualizaron

**Inputs:** Estado del Task Graph al final del sprint, sign-off del QA Agent, sign-off del CTO

**Outputs:** Release Notes, tag de versión, confirmación de deploy en staging
