# 11 — Context Map

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

El Context Map es la representación formal de cómo se relacionan los Bounded Contexts del ERP entre sí. Cada relación tiene un tipo específico derivado de DDD (Domain-Driven Design) que determina quién tiene el poder de cambio, quién se adapta a quién, y qué tipo de contrato existe entre ellos.

---

## Tipos de relación DDD usados en este mapa

| Tipo | Símbolo | Significado |
|---|---|---|
| **Customer / Supplier** | U → D | Upstream define; Downstream consume. Downstream tiene influencia limitada sobre el contrato. |
| **Conformist** | C | Downstream acepta sin filtrar el modelo del Upstream. |
| **Anti-Corruption Layer** | ACL | Downstream traduce el modelo Upstream a sus propios términos. Protege al Downstream de cambios en Upstream. |
| **Open Host Service** | OHS | Upstream publica un protocolo estable para que cualquier Downstream se integre. |
| **Published Language** | PL | Un lenguaje común de intercambio (ej. Domain Events) que todos comprenden sin conocer los internos del otro. |
| **Partnership** | P | Ambos evolucionan juntos. Cambios coordinados. No aplica entre BCs autónomos. |

---

## Diagrama del Context Map

```
                         ┌────────────────────────────────────────────────────────────┐
                         │                   PLATFORM (BC-12)                         │
                         │                                                            │
                         │  Open Host Service                                         │
                         │  Provee: PostingRules globales, Chart of Accounts templates│
                         └──────────────────────────┬─────────────────────────────────┘
                                                    │ OHS
                                                    │ (PublishedLanguage: PostingRulePublished)
                                                    ▼
┌──────────────────────┐         ┌──────────────────────────────────────────────────┐
│   IDENTITY (BC-01)   │ U       │             FINANCIAL (BC-07)                    │
│                      │──ACL──► │                                                  │
│  Open Host Service   │         │  ACL: FinancialTransactionFactories              │
│  PL: Domain Events   │         │  (traduce eventos de Billing/Payments a FT)      │
│  UserRegistered      │         └──────────────────────┬───────────────────────────┘
│  UserInvited         │                                │ U (PL: FinancialTransactionCreated)
│  PasswordReset...    │                                ▼
└──────────┬───────────┘         ┌──────────────────────────────────────────────────┐
           │                     │             ACCOUNTING (BC-08)                   │
           │ U (PL)              │                                                  │
           ▼                     │  Conformist: acepta FinancialTransaction          │
┌──────────────────────┐         │  como única fuente de entrada.                   │
│   BUSINESS (BC-02)   │         │  No conoce ningún módulo operativo.              │
│                      │         └──────────────────────┬───────────────────────────┘
│  Open Host Service   │                                │ U (PL: JournalEntryPosted)
│  Scope provider para │                                ▼
│  todos los demás BCs │         ┌──────────────────────────────────────────────────┐
│  (businessId scope)  │         │             ANALYTICS (BC-10)                    │
└──────────┬───────────┘         │                                                  │
           │                     │  Conformist TOTAL: solo lee.                     │
           │ OHS (scope)         │  Consume eventos de TODOS los demás BCs.         │
           │ todos conformistas  │  Nunca escribe en ninguno.                        │
           ▼                     └──────────────────────────────────────────────────┘
┌──────────────────────┐
│   CUSTOMER (BC-03)   │◄── U ── BILLING (BC-06) ────U (PL)────► COMMUNICATION (BC-09)
│                      │                │                              │
│  OHS para datos de   │                │ U (PL: WorkEventConfirmed)   │ D (ACL)
│  facturación del     │                ▼                              │
│  destinatario        │    ┌───────────────────────┐                 │
└──────────────────────┘    │       WORK (BC-04)    │                 │
                            │                       │◄─────────────── │ U (PL)
┌──────────────────────┐    │  OHS para WorkEvents  │   CALENDAR      │
│  INTEGRATION (BC-11) │    │  confirmados          │   (BC-05)       │
│                      │    └───────────────────────┘                 │
│  ACL para TODOS los  │                                               │
│  sistemas externos   │◄──────────────────────────────────────────────┘
│  (Google, Banks, etc)│
└──────────────────────┘
```

---

## Relaciones detalladas

### R-01: Identity → Business

| Aspecto | Detalle |
|---|---|
| **Tipo** | Upstream / Downstream con ACL |
| **Dirección** | Identity (upstream) → Business (downstream) |
| **Contrato** | Domain Event: `UserRegistered` |
| **Rol de Business** | Consumidor con ACL — procesa `UserRegistered` y crea su propia entidad `Business` |
| **Por qué ACL** | Business no acepta el modelo de Identity directamente. Traduce `userId` + `businessName` de registro a su propia `Business` aggregate. Si Identity cambia el payload de `UserRegistered`, solo el handler de Business necesita actualizarse. |

```
IDENTITY publishes:
  UserRegistered { userId, email, firstName, lastName, businessName, jurisdiction }

BUSINESS's ACL (handler):
  onUserRegistered(event) {
    // Traduce al vocabulario de Business, no a Identity
    Business.create({
      ownerUserId:  event.userId,
      businessName: event.businessName,
      jurisdiction: event.jurisdiction,
      currency:     deriveDefaultCurrency(event.jurisdiction)
    })
  }
```

---

### R-02: Identity → Communication

| Aspecto | Detalle |
|---|---|
| **Tipo** | Upstream / Downstream con Published Language |
| **Dirección** | Identity (upstream) → Communication (downstream) |
| **Contrato** | Domain Events: `UserInvited`, `UserActivated`, `PasswordResetRequested`, `PasswordChanged` |
| **Rol de Communication** | Conformist — reacciona a eventos de Identity tal como llegan |
| **Por qué Conformist** | Communication no tiene lógica propia sobre usuarios. Solo despacha notificaciones cuando Identity lo pide. No necesita protegerse del modelo de Identity porque los eventos ya son el mínimo necesario. |

---

### R-03: Business → All Contexts (Scope Provider)

| Aspecto | Detalle |
|---|---|
| **Tipo** | Open Host Service (OHS) |
| **Dirección** | Business (upstream) → Todos los demás (downstream conformistas) |
| **Contrato** | El `businessId` como campo obligatorio en todas las entidades de negocio. El evento `BusinessCreated`. |
| **Por qué OHS** | Business no impone su modelo interno. Solo expone un identificador de tenant estable (`businessId`) que todos pueden usar. |
| **Implicación crítica** | Si Business renombra `businessId` → `tenantId`, **todos los demás BCs necesitan actualizarse**. Por esta razón, `businessId` es inmutable una vez asignado. |

---

### R-04: Calendar → Work

| Aspecto | Detalle |
|---|---|
| **Tipo** | Upstream / Downstream con Published Language |
| **Dirección** | Calendar (upstream) → Work (downstream) |
| **Contrato** | Domain Event: `CalendarEventImported` |
| **Rol de Work** | Consumidor con ACL parcial — `CalendarEventImported` es traducido a `WorkEvent(draft)` con valores por defecto |
| **Por qué ACL parcial** | Un evento de Google Calendar tiene `summary`, `start`, `end`. Work necesita `title`, `startTime`, `endTime`, `durationMinutes`, `status: 'draft'`. La traducción agrega semántica de negocio que Calendar no tiene. |

---

### R-05: Work → Billing

| Aspecto | Detalle |
|---|---|
| **Tipo** | Upstream / Downstream con Published Language |
| **Dirección** | Work (upstream) → Billing (downstream) |
| **Contrato** | Domain Event: `WorkEventConfirmed` |
| **Rol de Billing** | Consumidor que indexa los WorkEvents disponibles para facturar |
| **Nota crítica** | Billing **nunca escribe** en Work. Cuando una Invoice incluye un WorkEvent, Billing publica `InvoiceItemCreated` y Work consume ese evento para cambiar el estado del WorkEvent a `invoiced`. Work siempre controla su propio estado. |

```
INCORRECTO (violación de ownership):
  BillingService.sendInvoice() {
    await workEvent.update({ status: 'invoiced' })  ← Work data modificada por Billing
  }

CORRECTO (patrón Published Language):
  BillingService.sendInvoice() {
    await events.publish(InvoiceItemCreated { workEventId, invoiceId })
  }
  WorkEventHandler.onInvoiceItemCreated(event) {
    await workEvent.update({ status: 'invoiced' })  ← Work modifica su propia data
  }
```

---

### R-06: Billing → Financial (la relación más importante)

| Aspecto | Detalle |
|---|---|
| **Tipo** | Upstream / Downstream con Anti-Corruption Layer |
| **Dirección** | Billing (upstream) → Financial (downstream) |
| **Contrato** | Domain Events: `InvoiceSent`, `InvoiceVoided`, `PaymentRecorded`, `PaymentReversed` |
| **Rol de Financial** | **ACL estricto** — FinancialTransactionFactories traducen eventos de Billing al lenguaje neutro `FinancialTransaction` |
| **Por qué ACL** | Billing habla en términos operativos: "una factura fue enviada". Financial habla en términos financieros: "hay una FinancialTransaction de tipo INVOICE_ISSUED por $110 AUD". Si Billing cambia el nombre de un campo en `InvoiceSent`, solo el Factory necesita actualizarse — el AccountingEngine no sabe que Billing existe. |

```
BILLING emite (lenguaje operativo):
  InvoiceSent {
    invoiceId, invoiceNumber,
    customerId, customerName,
    issueDate, dueDate,
    subtotal: 100, taxAmount: 10, total: 110,
    currency: 'AUD', jurisdiction: 'AU'
  }

FINANCIAL's ACL (BillingFinancialTransactionFactory):
  FinancialTransaction {
    type:       'INVOICE_ISSUED',     ← lenguaje financiero neutro
    direction:  'inbound',
    nature:     'revenue',
    grossAmount: Money(110, 'AUD'),
    netAmount:   Money(100, 'AUD'),
    taxAmount:   Money(10, 'AUD'),
    taxType:     'gst',
    ...
  }
```

---

### R-07: Financial → Accounting

| Aspecto | Detalle |
|---|---|
| **Tipo** | Upstream / Downstream, Downstream conformista |
| **Dirección** | Financial (upstream) → Accounting (downstream) |
| **Contrato** | Domain Event: `FinancialTransactionCreated` |
| **Rol de Accounting** | Conformista puro — acepta la `FinancialTransaction` como su única fuente de input. No tiene opinión sobre cómo fue generada. |
| **Por qué Conformist** | El AccountingEngine no necesita conocer nada de Billing, Payments, ni Expenses. Solo necesita saber qué hacer con una FinancialTransaction de tipo X en jurisdicción Y. Si el Accounting Engine decide cambiar cómo procesa las transacciones, no afecta a ningún módulo operativo. |

---

### R-08: ANY → Analytics (BC-10, operativo)

| Aspecto | Detalle |
|---|---|
| **Tipo** | Open Host Service (todos los dominios) → Conformist Total (Analytics) |
| **Dirección** | Todos (upstream) → Analytics (downstream) |
| **Contrato** | Published Language: todos los Domain Events del sistema |
| **Rol de Analytics** | Conformista total de solo lectura. No escribe en ningún dominio. |
| **Stack** | NestJS + MongoDB. Solo read models operativos. Latencia < 100ms. |
| **Por qué OHS** | Analytics BC-10 es el consumidor universal **operativo**. Si un nuevo BC publica eventos, Analytics puede empezar a consumirlos sin que el BC sepa que Analytics existe. El acoplamiento es unidireccional y unilateral. |
| **Límite crítico** | Analytics BC-10 NO incluye Data Warehouse, no usa PostgreSQL Neon, no hace forecasting, no produce KPIs estratégicos. Eso es responsabilidad de BI (BC-13). |

---

### R-11: Business App Backend → Business Intelligence (BC-13)

| Aspecto | Detalle |
|---|---|
| **Tipo** | Customer / Supplier (cross-service, interno) |
| **Dirección** | business-app/backend (downstream solicitante) → BI (upstream proveedor de análisis) |
| **Contrato** | HTTP interno con header `x-internal-service-token`. Endpoints bajo `/internal/`. |
| **Mediador** | Un módulo en `business-app/backend/src/` actúa como gateway — resuelve `businessId` desde JWT antes de llamar a BI. |
| **Por qué crítico** | BI no valida JWT de usuarios. Solo acepta el `businessId` ya autenticado que le pasa el backend. Si el backend no filtra correctamente, BI retorna datos del tenant incorrecto. |
| **Prohibición absoluta** | El Frontend **nunca** llama a BI directamente. Toda comunicación Frontend→BI es ilegal y el QAAgent debe validarlo. |

```
CORRECTO:
  Frontend → POST /api/analytics/kpis (business-app/backend, JWT válido)
    → backend resuelve businessId del JWT
    → GET /internal/kpis?businessId=XXX (BI, con x-internal-service-token)
    → BI retorna datos
    → backend retorna al frontend

PROHIBIDO:
  Frontend → GET http://bi-service/internal/kpis (acceso directo — nunca)
```

---

### R-09: Integration → External Systems (ACL externo)

| Aspecto | Detalle |
|---|---|
| **Tipo** | Anti-Corruption Layer en la frontera del sistema |
| **Dirección** | Mundo exterior → Integration (ACL) → BCs internos |
| **Contrato** | Domain Events normalizados: `CalendarEventImported`, `BankTransactionImported` |
| **Rol de Integration** | Capa de traducción y protección. Los protocolos externos (OAuth, iCal, OFX) nunca entran al dominio. |
| **Por qué crítico** | Sin esta capa, Calendar conocería OAuth2 de Google y Work dependería del formato de Google Calendar. Cambiar de Google Calendar a Outlook requeriría modificar Work. Con la ACL, solo cambia el adaptador de integración. |

---

### R-10: Business App → Communications Platform

| Aspecto | Detalle |
|---|---|
| **Tipo** | Customer / Supplier (cross-system) |
| **Dirección** | Business App (downstream) → Communications Platform (upstream) |
| **Contrato** | REST API: `POST /notifications/event` con `x-integration-token` |
| **Mediador** | `CommunicationDispatchService` en el BC de Communication (BC-09) |
| **Por qué Customer/Supplier** | Communications Platform expone un contrato estable (API). Business App lo consume. Communications Platform es el proveedor del servicio de mensajería; Business App es el consumidor. |

```
BUSINESS APP (via Communication BC):
  CommunicationDispatchService.dispatch({
    businessId, event: 'invoices.invoice_sent',
    email: contact.email, payload: { ... }
  })
    → Resuelve CommunicationConnection
    → POST /notifications/event (Communications Platform)
    → Registra CommunicationLog
```

---

## Regla de dependencia global

```
La flecha de dependencia siempre apunta hacia abajo y hacia los lados.
Ningún BC upstream depende de un BC downstream.

UPSTREAM → DOWNSTREAM
  Identity → Business, Communication
  Business → (scope para todos)
  Calendar → Work
  Customer → Work (scope)
  Work → Billing
  Billing → Financial → Accounting
  Billing → Communication
  ANY → Analytics BC-10 (MongoDB, operativo)
  External → Integration → ANY
  business-app/backend → BI BC-13 (gateway único, con x-internal-service-token)

PROHIBIDO:
  Accounting → Billing (ya fue registrado, no retrocede)
  Analytics BC-10 → ANY (solo lectura)
  BI BC-13 → ANY (solo lectura de su DW)
  Financial → Work (no conoce WorkEvents)
  Communication → Accounting (el mensajero no conoce el libro mayor)
  Frontend → BI BC-13 (NUNCA — el frontend no puede llamar BI directamente)
```

---

## Implicaciones para el diseño de software

### 1. Los imports siguen las flechas del Context Map

Si el Context Map dice que Billing no depende de Accounting, entonces en el código ningún archivo bajo el módulo de Billing puede importar una clase de Accounting.

### 2. La anti-corruption layer tiene una ubicación física

Para la relación Billing → Financial, el ACL son los `FinancialTransactionFactories`. Estos viven en el módulo de Financial, no en Billing. Financial decide cómo interpretar los eventos de Billing — no al revés.

### 3. Los Domain Events son el Published Language oficial

El contrato entre todos los BCs son los Domain Events. Si un BC quiere comunicarse con otro, no comparte código — publica un evento y el otro lo consume. El schema del evento es el único contrato.

### 4. Cambiar una relación requiere actualizar este mapa

Si en el futuro se agrega una integración nueva (ej. Billing → Payroll) o cambia el tipo de relación, este documento debe actualizarse. El Context Map es una especificación viva, no un diagrama decorativo.

---

## Evolución del Context Map

### En 5 años — nuevos BCs

Cuando se agreguen Expenses, Payroll, Banking, e Inventory, las relaciones siguen el mismo patrón:

```
Expenses   → Financial (ACL: ExpenseFinancialTransactionFactory)
Payroll    → Financial (ACL: PayrollFinancialTransactionFactory)
Banking    → Financial (ACL: BankingFinancialTransactionFactory)
Inventory  → Financial (ACL: InventoryFinancialTransactionFactory)
Inventory  → Billing  (extension: InvoiceItem puede referenciar Product)
```

Ninguno de estos nuevos BCs afecta el Context Map existente. Se agregan relaciones nuevas; no se modifican las existentes.

### Lo que NUNCA debe cambiar

| Relación | Por qué es invariable |
|---|---|
| Billing nunca → Accounting | Rompería la independencia del General Ledger |
| Analytics nunca ← ninguno | Analytics es consumidor terminal, jamás upstream |
| FinancialTransaction como único puente | Es el contrato central de toda la arquitectura |
| businessId como scope universal | Cambiarlo afecta todos los BCs simultáneamente |
