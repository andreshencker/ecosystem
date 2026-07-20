# Transversal Domains — Arquitectura del ERP

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Este documento explica cómo los cuatro dominios transversales complementan la arquitectura de los dominios operativos del ERP.

---

## Los dos tipos de dominios en el ERP

```
DOMINIOS OPERATIVOS                      DOMINIOS TRANSVERSALES
────────────────────────────────         ──────────────────────────────────
Implementan la lógica de negocio         Proveen servicios reutilizables

Identity     — autenticación             Master Data    — datos de referencia
Business     — tenant root               Document Mgmt  — almacenamiento
Customer     — clientes                  Automation     — orquestación
Work         — tiempo trabajado          Integration Hub — sistemas externos
Calendar     — sincronización
Billing      — facturas y pagos          PLATAFORMA:
Financial    — transacciones             Communications  — mensajería
Accounting   — libro mayor              Analytics       — inteligencia de negocio
```

---

## El mapa completo del ERP

```
                    ╔══════════════════════════════════════════════════════════╗
                    ║                  MASTER DATA (MDM)                      ║
                    ║  Country · Currency · TaxRate · InvoiceStatus · Roles   ║
                    ║    Todos los dominios consultan MDM para referencia      ║
                    ╚══════════════════════╤═══════════════════════════════════╝
                                           │ Datos de referencia
                                           ▼
    ┌──────────────┐    ┌──────────────────────────────────────────────────────┐
    │  INTEGRATION │    │                DOMINIO OPERATIVO                      │
    │     HUB      │    │                                                        │
    │              │    │  IDENTITY (Auth, Users, Invitations)                   │
    │ Google       │──►│       │ UserRegistered                                  │
    │ Calendar     │    │       ▼                                                  │
    │              │    │  BUSINESS (Tenant root, FiscalProfile)                  │
    │ Stripe       │──►│       │ BusinessCreated                                  │
    │ Square       │    │       ▼                                                  │
    │              │    │  CUSTOMER (Clients, Contacts)                           │
    │ Xero         │◄──│       │ CustomerCreated                                  │
    │ MYOB         │    │       ▼                                                  │
    │              │    │  CALENDAR ──────────► WORK (Contracts, Rates,           │
    │ OFX / CDR    │──►│  (Calendar sync)       WorkEvents)                      │
    │              │    │                         │ WorkEventConfirmed             │
    │ ATO / IRD    │◄──│                         ▼                               │
    │              │    │                     BILLING (Invoices, Payments)        │
    │ Shopify      │──►│                         │ InvoiceSent · PaymentRecorded │
    └──────────────┘    │                    ┌───┴────────────┐                   │
                        │                    ▼                ▼                   │
                        │              FINANCIAL          COMMUNICATION           │
                        │              (FinTx, Posting)   (Dispatch)              │
                        │                    │                                   │
                        │                    ▼                                   │
                        │              ACCOUNTING                                │
                        │              (Journal, Ledger)                         │
                        │                    │                                   │
                        │                    ▼                                   │
                        │              ANALYTICS                                 │
                        │              (Read Models, KPIs, ML)                   │
                        └──────────────────────────────────────────────────────┘

    ╔════════════════════════════════════════════════════════════════════════╗
    ║                         AUTOMATION / WORKFLOW                          ║
    ║  Escucha todos los Domain Events · Orquesta acciones entre dominios    ║
    ║  Invoice Overdue → remind → wait → remind → task → notify             ║
    ╚════════════════════════════════════════════════════════════════════════╝

    ╔════════════════════════════════════════════════════════════════════════╗
    ║                       DOCUMENT MANAGEMENT                              ║
    ║  Billing, Accounting, Analytics generan docs → Document Mgmt los almacena║
    ║  Communications los adjunta · Business Owner los descarga               ║
    ╚════════════════════════════════════════════════════════════════════════╝
```

---

## Por qué los dominios transversales son independientes

### Master Data — no depende de ningún operativo

MDM es upstream de todos. Nadie le escribe, todos le leen. Si MDM no existiera, cada dominio tendría su propio catálogo con su propia semántica. MDM garantiza que "GST Australia 10%" significa lo mismo en Billing que en Financial que en Accounting.

### Document Management — no depende de ningún operativo

Document Management no sabe qué es una factura. Solo sabe que recibió un binario, lo almacenó, y puede retornar una URL. Billing le pasa el PDF; Document Management lo almacena. Si Billing cambia el formato del PDF, Document Management no sabe y no le importa.

### Automation — depende de Domain Events, no de dominios internos

Automation suscribe al Event Bus y reacciona. No importa si los modelos de las invoices, los contratos, o los WorkEvents cambian de schema. Automation solo conoce el payload del evento (que es estable por contrato). Los workflows se pueden modificar sin tocar ningún dominio operativo.

### Integration Hub — no conoce el modelo de dominio interno

El Integration Hub no sabe qué es una Invoice. Sabe que recibió un payload de Stripe y lo normaliza a un IntegrationEvent. Work domain es quien decide cómo procesar ese IntegrationEvent. Si el dominio de Work cambia su modelo de WorkEvent, Integration Hub no se entera — él sigue publicando el mismo CalendarEventImported con el mismo schema.

---

## Las dependencias entre transversales

Los dominios transversales también tienen relaciones entre sí:

```
MDM ────────────────────────────────► TODOS
  (provee datos de referencia)

INTEGRATION HUB ────────────────────► AUTOMATION
  CalendarConnectionFailed            (dispara notificación al usuario)

DOCUMENT MANAGEMENT ─────────────────► AUTOMATION
  DocumentCreated (contrato)          (puede disparar workflow de firma)

AUTOMATION ──────────────────────────► DOCUMENT MANAGEMENT
  create_report action                (solicita generar un PDF)

AUTOMATION ──────────────────────────► INTEGRATION HUB
  invoke_webhook action               (dispara webhook externo)

INTEGRATION HUB ─────────────────────► DOCUMENT MANAGEMENT
  receipt_image importada             (almacena la imagen del recibo)
```

---

## Cómo se agregan nuevos dominios operativos

El diseño de los dominios transversales permite agregar nuevos módulos (Expenses, Payroll, Inventory) sin modificar nada de la infraestructura transversal.

### Agregar Expenses (Fase 6)

```
1. Expenses publica ExpenseApproved event
   → Automation: puede crear workflow "ExpenseApproved → send email → log"
   → Document Management: Expenses puede solicitar almacenar receipt_image
   → Integration Hub: puede importar receipts desde Google Drive
   → MDM: Expenses usa ExpenseCategory (ya existe en MDM)
   → Analytics: ingiere ExpenseApproved event (handler nuevo, sin cambios en el store)
   → Financial: nuevo Factory que crea FinancialTransaction de tipo EXPENSE_RECORDED
   → Accounting: PostingRules para EXPENSE_RECORDED (ya pueden existir en MDM)
```

Todos los dominios transversales soportan el nuevo módulo **sin cambios en sus interfaces**.

### Agregar Payroll (Fase 9)

```
1. Payroll publica PayrollProcessed, SuperannuationAccrued events
2. Integration Hub: nuevo connector para ATO STP (Single Touch Payroll)
   → La infraestructura de OAuth, retry, circuit breaker ya existe
   → Solo se agrega el Connector de ATO STP
3. Automation: nuevo template workflow "PayrollProcessed → STP submission → notify"
4. Document Management: Payroll puede generar payslips (PDFs)
5. MDM: ExpenseCategory ya incluye 'wages' (ya existe)
6. Analytics: ingiere PayrollProcessed (nuevo handler, mismo store)
```

---

## La promesa de la arquitectura transversal

Los dominios transversales son la infraestructura que permite que el ERP crezca sin acoplamiento:

> "Agregar un nuevo módulo de negocio no requiere modificar MDM, Document Management, Automation, ni Integration Hub. Solo requiere publicar los Domain Events correctos y las infraestructuras transversales lo recogen automáticamente."

Esta es la promesa que hace posible el roadmap de 11 fases del ERP sin acumular deuda técnica estructural.

---

## Índice de todos los dominios

### Dominios operativos (orden del flujo)
| Dominio | Carpeta |
|---|---|
| Identity | `docs/domain/` (01-12) |
| Business | `docs/domain/` |
| Customer | `docs/domain/` |
| Work + Calendar | `docs/domain/` |
| Billing + Payments | `docs/domain/` |
| Financial Engine | `docs/domain/accounting/` |
| Accounting Engine | `docs/domain/accounting/` |
| Analytics | `docs/domain/analytics/` |

### Dominios transversales
| Dominio | Carpeta |
|---|---|
| Master Data (MDM) | `docs/domain/master-data/` |
| Document Management | `docs/domain/document-management/` |
| Automation / Workflow | `docs/domain/automation/` |
| Integration Hub | `docs/domain/integration/` |

### Arquitectura
| Documento | Carpeta |
|---|---|
| Bounded Contexts, Architecture Principles | `docs/architecture/` |
| ADRs (decisiones arquitectónicas) | `docs/decisions/` |
