# 02 — Departamentos de Ingeniería

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Principio de organización

La estructura de departamentos es un reflejo exacto de los Bounded Contexts de la arquitectura. Esto no es una coincidencia — es el principio fundamental de Conway's Law aplicado intencionalmente:

> "Las organizaciones que diseñan sistemas están obligadas a producir diseños que son copias de las estructuras de comunicación de esas organizaciones."

Si los bounded contexts están aislados, los departamentos deben estarlo. Si los dominios se comunican por eventos, los departamentos deben coordinarse por el mismo mecanismo.

---

## Árbol de departamentos

```
ENGINEERING
    │
    ├── ARCHITECTURE          — ADRs, decisiones conceptuales, consistencia
    │
    ├── PLATFORM              — Identity, Auth, Users, Business, Security, Provisioning
    │
    ├── REVENUE               — Work Domain, Rate Engine, Revenue Flows, Revenue Domain
    │
    ├── BILLING               — Invoices, Payments, AR, Financial Policies (aplicación)
    │
    ├── FINANCIAL             — Financial Engine, Recognition Policy, Accounting Engine
    │
    ├── CALENDAR              — Calendar Domain transversal, sincronización, scheduling
    │
    ├── DOCUMENT              — Document Platform, Renderers, Document Management
    │
    ├── COMMUNICATIONS        — Integración con Communications Platform, notificaciones
    │
    ├── ANALYTICS             — Read Models, KPIs, Datasets, BI
    │
    ├── INTEGRATION           — Integration Hub, adaptadores externos
    │
    ├── FRONTEND              — Business App UI, Platform Admin UI
    │
    ├── QA                    — Calidad, testing, criterios de aceptación
    │
    └── DEVOPS                — Infraestructura, CI/CD, ambientes, bases de datos
```

---

## ARCHITECTURE

**Misión:** Custodiar la integridad de la arquitectura durante toda la implementación. Asegurar que el código producido respete los ADRs y no cree deuda arquitectónica.

**Ownership:** `docs/` completo · `docs/decisions/` · `docs/architecture/` · `docs/domain/`

**Qué hace:**
- Crea y mantiene ADRs cuando hay nuevas decisiones
- Revisa que los PRs no violen bounded contexts
- Actualiza documentación cuando la arquitectura evoluciona
- No implementa código de dominio

**Qué nunca toca:**
- Código de ningún módulo del ERP
- Configuración de infraestructura

**Agente:** `DocumentationAgent` (para ejecución) + `CTOAgent` (para decisiones)

---

## PLATFORM

**Misión:** La capa de identidad, seguridad y tenant management. Todo el ERP depende de esta capa — ningún dominio funciona sin ella.

**Ownership:** `src/platform/` · `src/settings/`

**Bounded Context:** Identity (BC-01) + Business (BC-02)

**Eventos que publica:**
`UserRegistered` · `UserInvited` · `UserActivated` · `UserDeactivated` · `PasswordChanged`
`BusinessCreated` · `BusinessProfileUpdated` · `FiscalProfileConfigured` · `BusinessProvisioned`

**Eventos que consume:** Ninguno (es el inicio de la cadena)

**Dependencias upstream:** Ninguna

**Qué nunca toca:**
- Ningún módulo operativo (Work, Revenue, Billing, Calendar)
- Ningún módulo de Accounting o Financial

**Agente:** `PlatformAgent`

---

## REVENUE

**Misión:** Implementar los Revenue Flows del ERP. El Revenue Department es el corazón del modelo de ingresos — transforma tiempo y trabajo en ingreso estructurado listo para facturar.

**Ownership:** `src/work/` · `src/rate-engine/` · `src/revenue/`

**Bounded Context:** Work (BC-04) + Revenue Domain

**Eventos que publica:**
`WorkEventCreated` · `WorkEventConfirmed` · `WorkEventVoided` · `WorkEventInvoiced`
`ContractCreated` · `ContractActivated` · `ContractCompleted`
`BillingPeriodOpened` · `BillingPeriodClosed` · `BillingPeriodReopened`
`RevenueDraftUpdated` · `RevenueDraftTransferred`

**Eventos que consume:**
`BusinessCreated` · `CustomerCreated` · `CalendarEventImported` · `InvoiceVoided`

**Dependencias upstream:** Platform (scope), Customer, Calendar

**Qué nunca toca:**
- `src/billing/` (solo publica `BillingPeriodClosed` — Billing lo consume)
- `src/accounting/` · `src/financial/`
- `src/calendar/` (solo consume sus eventos)

**Agente:** `WorkAgent` + `RateEngineAgent` + `RevenueAgent`

---

## BILLING

**Misión:** Gestionar el ciclo completo de la Invoice — desde su creación hasta el cobro. Es el dominio del documento financiero y del dinero recibido.

**Ownership:** `src/billing/`

**Bounded Context:** Billing (BC-06)

**Eventos que publica:**
`InvoiceGenerated` · `InvoiceApproved` · `InvoiceSent` · `InvoiceViewed`
`InvoiceOverdue` · `InvoicePaid` · `InvoiceVoided` · `InvoiceCancelled`
`PaymentRecorded` · `PaymentReversed`

**Eventos que consume:**
`BillingPeriodClosed` (genera Invoice Draft)
`PaymentRecorded` (actualiza amountDue — propio)

**Dependencias upstream:** Revenue, Customer, Platform

**Qué nunca toca:**
- `src/work/` · `src/revenue/` (solo upstream — no los modifica)
- `src/accounting/` (nunca escribe en JournalEntry)
- `src/financial/` (solo publica eventos que Financial consume)

**Agente:** `BillingAgent`

---

## FINANCIAL

**Misión:** La capa contable del ERP — traduce hechos de negocio en registros formales. Es completamente agnóstica al origen del ingreso.

**Ownership:** `src/financial/` · `src/accounting/`

**Bounded Context:** Financial (BC-07) + Accounting (BC-08)

**Eventos que publica:**
`FinancialTransactionCreated` · `TransactionPosted` · `TransactionRejected`
`JournalEntryPosted` · `FiscalPeriodClosed` · `FiscalPeriodLocked`

**Eventos que consume:**
`InvoiceSent` · `InvoiceVoided` · `PaymentRecorded` · `PaymentReversed`
`CreditNoteIssued` · `ExpenseApproved` (futuro)

**Dependencias upstream:** Billing

**Qué nunca toca:**
- Ningún módulo operativo (Work, Revenue, Billing, Customer)
- Es consumidor terminal: recibe, registra, nunca modifica upstream

**Agente:** `FinancialAgent` + `AccountingAgent`

---

## CALENDAR

**Misión:** Infraestructura de tiempo para todos los Revenue Flows. Calendar nunca pertenece a ningún dominio operativo — es completamente transversal.

**Ownership:** `src/calendar/`

**Bounded Context:** Calendar (BC-05) — transversal

**Eventos que publica:**
`CalendarEventImported` · `CalendarEventUpdated` · `CalendarEventCancelled`
`CalendarSyncCompleted` · `CalendarSyncFailed` · `ScheduledEventDue`

**Eventos que consume:**
`BusinessCreated` (provisioning de ScheduledEvents fiscales)
`InvoiceSent` (crea ScheduledEvent para due date)

**Dependencias upstream:** Platform (scope)

**Qué nunca toca:**
- Ningún módulo operativo
- Calendar no crea WorkEvents — solo publica CalendarEventImported

**Agente:** `CalendarAgent`

---

## DOCUMENT

**Misión:** Generación de documentos del ERP — PDFs efímeros para envío y almacenamiento permanente para archivo.

**Ownership:** `src/document-platform/` · `src/document-management/`

**Bounded Context:** Document Platform + Document Management

**Eventos que publica:**
`DocumentRendered` · `DocumentStored` · `DocumentVersionCreated` · `DocumentArchived`

**Eventos que consume:**
`InvoiceApproved` (trigger de generación de PDF)
`BusinessCreated` (provisioning de DocumentPackages)

**Dependencias upstream:** Billing (trigger), Analytics (datasets para DocumentContract)

**Qué nunca toca:**
- `src/billing/` — Billing solicita; Document Platform genera
- Communications — solo publica `DocumentRendered`, Communications consume

**Agente:** `DocumentAgent`

---

## COMMUNICATIONS

**Misión:** Integrar el Business App con la Communications Platform externa para entrega de emails y notificaciones.

**Ownership:** `src/communications/`

**Bounded Context:** Communication (BC-09)

**Eventos que publica:**
`CommunicationDispatched` · `CommunicationDelivered` · `CommunicationFailed`

**Eventos que consume:**
`DocumentRendered` · `InvoiceOverdue` · `UserInvited`

**Dependencias upstream:** Document Platform (PDF buffer), Platform (CommunicationConnection)

**Qué nunca toca:**
- Ningún módulo de dominio operativo
- No gestiona templates (eso es la Communications Platform separada)

**Agente:** `CommunicationsAgent`

---

## ANALYTICS

**Misión:** Read Models proyectados desde Domain Events, KPIs calculados, y datasets para Document Platform y BI. Solo lectura — nunca escribe en otros dominios.

**Ownership:** `src/analytics/` · `src/business-intelligence/`

**Bounded Context:** Analytics (BC-10)

**Eventos que publica:** Ninguno — es consumidor puro

**Eventos que consume:** Todos los eventos del sistema

**Dependencias upstream:** Todos los dominios (es receptor universal)

**Qué NUNCA toca:**
- Las colecciones de escritura de cualquier otro dominio (BR-ANA-001, BR-ANA-002)

**Agente:** `AnalyticsAgent`

---

## INTEGRATION

**Misión:** Anti-Corruption Layer entre el mundo exterior y el ERP. Normaliza protocolos externos sin exponer su complejidad a los dominios internos.

**Ownership:** `src/integration/`

**Bounded Context:** Integration Hub (BC-11)

**Eventos que publica:**
`CalendarEventImported` (normalizado desde Google/iCal)
`BankTransactionImported` (futuro)
`IntegrationConnected` · `IntegrationDisconnected` · `IntegrationSyncFailed`

**Eventos que consume:** Solicitudes de sincronización del sistema

**Qué nunca toca:**
- Ningún módulo de dominio — solo normaliza y publica

**Agente:** `IntegrationAgent`

---

## FRONTEND

**Misión:** La interfaz de usuario que los Business Owners, Admins, Accountants, y Staff usan para operar el ERP.

**Ownership:** `frontend/`

**Stack:** Next.js · React · TypeScript

**Qué nunca toca:**
- Backend src/ directamente — solo consume APIs REST

**Agente:** `FrontendAgent`

---

## QA

**Misión:** Garantizar que cada pieza de software entregada funciona correctamente y no regresiona.

**Ownership:** `test/` · `**/*.spec.ts` · `**/*.e2e-spec.ts`

**Principio:** QA no implementa features. QA demuestra que los features funcionan.

**Qué nunca toca:**
- Código de producción — solo escribe tests
- Arquitectura — solo verifica que el código la respeta

**Agente:** `QAAgent`

---

## DEVOPS

**Misión:** La plataforma técnica sobre la que el ERP corre — ambientes, CI/CD, bases de datos, monitoreo.

**Ownership:** `Dockerfile` · `docker-compose.yml` · `.github/workflows/` · `src/infrastructure/`

**Qué nunca toca:**
- Código de dominio — no conoce Invoice, WorkEvent, ni ninguna entidad de negocio

**Agente:** `InfrastructureAgent` (también llamado `DevOpsAgent`)
