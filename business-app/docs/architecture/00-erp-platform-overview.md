# 00 — ERP Platform Overview

**Versión:** 1.1 | **Fecha:** 2026-07-06 | **Estado:** Oficial — Visión de plataforma (actualizado con Revenue Flow)

---

## El ERP como plataforma financiera

Este ERP NO es una aplicación para facturar turnos. Es una **plataforma financiera** que soporta múltiples Revenue Sources. Los turnos de trabajo (Shift Work) son el primer Revenue Source implementado, pero no el único posible.

**El principio rector corregido:**

> El valor es generado primero. La factura lo documenta. El pago lo cierra.

Este principio aplica a cualquier Revenue Source — un turno trabajado, un servicio entregado, un producto vendido, una suscripción renovada.

---

## Diagrama General del ERP

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                   REVENUE SOURCES — categorías de ingreso (declarativo)                  ║
║                                                                                          ║
║   Shift Work       Services        Products        Subscriptions      Projects ...       ║
╚═══════════╤════════════╤═══════════════╤══════════════╤══════════════╤══════════════════╝
            │            │               │              │              │
            ▼            ▼               ▼              ▼              ▼
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                   REVENUE FLOWS — pipelines concretos (procedimental)                    ║
║  Cada Revenue Source implementa ≥1 Revenue Flow                                          ║
║                                                                                          ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   ║
║  │  ShiftWorkFlow  │  │ HourlyServices  │  │  DirectSaleFlow │  │  RecurringFlow  │   ║
║  │                 │  │ FixedPriceFlow  │  │  DropshipFlow   │  │                 │   ║
║  │  Entry:         │  │ RetainerFlow    │  │                 │  │  Entry:         │   ║
║  │  Calendar/Manual│  │                 │  │  Entry:         │  │  Calendar       │   ║
║  │                 │  │  Entry:         │  │  SalesOrder     │  │  (ScheduledEvt) │   ║
║  │  Steps:         │  │  Calendar/Order │  │                 │  │                 │   ║
║  │  WorkEvent(dft) │  │                 │  │  Steps:         │  │  Steps:         │   ║
║  │  → Confirm      │  │  Steps:         │  │  Reserve        │  │  SubscriptionPd │   ║
║  │  → Rate Engine  │  │  Appointment    │  │  → Fulfill      │  │  → Auth renewal │   ║
║  │                 │  │  → Completion   │  │  → Ship         │  │  → RecurringChg │   ║
║  │  Flow Policies: │  │  → Approval     │  │                 │  │                 │   ║
║  │  BillingPeriod  │  │                 │  │  Flow Policies: │  │  Flow Policies: │   ║
║  │  CutOff         │  │  Flow Policies: │  │  RecognitionPt  │  │  BillingCycle   │   ║
║  │  Rate Snapshot  │  │  Completion     │  │  ReturnWindow   │  │  AutoRenewal    │   ║
║  │  Late Events    │  │  Cancellation   │  │  Backorder      │  │  Proration      │   ║
║  │  Validation     │  │  No-Show        │  │                 │  │  Dunning        │   ║
║  │                 │  │                 │  │                 │  │                 │   ║
║  │  Billable Unit: │  │  Billable Unit: │  │  Billable Unit: │  │  Billable Unit: │   ║
║  │  WorkEvent      │  │  ServiceDelivery│  │  OrderItem      │  │  RenewalPeriod  │   ║
║  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   ║
║           │                   │                     │                    │             ║
║           └─────────── Revenue Flow Contract ────────┴────────────────────┘             ║
╚═══════════════════════════════════════╤════════════════════════════════════════════════╝
                                        │ BillableUnitReady
                                         │
                                         ▼
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                  REVENUE DOMAIN                                          ║
║  RevenueLine · RevenueDraft · BillingPeriod                                              ║
║  Acumula el ingreso, lo organiza por período, lo entrega a Billing                       ║
║  AGNÓSTICO al Revenue Source — solo conoce RevenueLines y totales                        ║
╚════════════════════════════════════╤═════════════════════════════════════════════════════╝
                                     │ BillingPeriodClosed
                                     ▼
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                  BILLING DOMAIN                                          ║
║  Invoice · InvoiceItem · Payment                                                         ║
║  ◄── Financial Policies aplican aquí ──────────────────────────────────────────────►    ║
║  Payment Terms · Due Date · Reminder Policy · Overdue Policy · Collection Policy         ║
║  AGNÓSTICO al Revenue Source — solo conoce Invoices y Payments                          ║
╚════════════════════════════════════╤═════════════════════════════════════════════════════╝
                                     │ InvoiceSent / PaymentRecorded
                                     ▼
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                FINANCIAL ENGINE                                          ║
║  FinancialTransaction (INVOICE_ISSUED · PAYMENT_RECEIVED · INVOICE_VOIDED · ...)        ║
║  Recognition Policy · Posting Rules                                                      ║
║  AGNÓSTICO — solo conoce tipos de transacciones financieras                             ║
╚════════════════════════════════════╤═════════════════════════════════════════════════════╝
                                     │ FinancialTransactionCreated
                                     ▼
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                               ACCOUNTING ENGINE                                          ║
║  JournalEntry · GeneralLedger · FiscalPeriod · ChartOfAccounts                          ║
║  Trial Balance · P&L · Balance Sheet · BAS                                              ║
║  AGNÓSTICO — solo conoce FinancialTransactions                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

        │ Todos los eventos de todos los dominios fluyen hacia →
        ▼
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                    ANALYTICS                                             ║
║  Read Models · KPIs · Datasets · Business Intelligence                                  ║
║  Consume eventos de TODOS los dominios · NUNCA escribe en ninguno                       ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

        │ InvoiceSent, InvoiceOverdue, etc. →
        ▼
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                              DOCUMENT PLATFORM                                           ║
║  DocumentPackage · DocumentContract · DocumentBlock · DocumentTemplate                  ║
║  Generación efímera de PDFs · Entrega a Communications · Sin almacenamiento de PDFs    ║
╚════════════════════════════════════╤═════════════════════════════════════════════════════╝
                                     │ DocumentRendered
                                     ▼
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                               COMMUNICATIONS                                             ║
║  Email · SMS · Push (futuro)                                                            ║
║  Recibe buffer del PDF · Adjunta · Envía al Customer                                    ║
╚════════════════════════════════════╤═════════════════════════════════════════════════════╝
                                     │
                                     ▼
                               [ CUSTOMER ]

──────────────────────────────────── DOMINIOS TRANSVERSALES ────────────────────────────────────────

  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │                              CALENDAR (TRANSVERSAL)                                          │
  │  Conecta con Google Calendar · Apple Calendar · Outlook · iCal                               │
  │  Produce CalendarEvents neutros que cualquier Revenue Source puede consumir                  │
  │  Gestiona ScheduledEvents internos: due dates, tax deadlines, renewal dates, payroll periods │
  │                                                                                              │
  │  Shift Work usa Calendar · Services usa Calendar · Projects usa Calendar                    │
  │  Billing usa Calendar (due dates) · Tax usa Calendar (BAS deadlines)                        │
  │  Calendar NUNCA conoce la lógica de ninguno de sus consumidores                             │
  └─────────────────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
  │   MASTER DATA    │  │  DOCUMENT MGMT   │  │   AUTOMATION     │  │    INTEGRATION HUB       │
  │  (MDM)           │  │  Almacenamiento  │  │  Workflows       │  │  Google · Banks · ATO    │
  │  Catálogos de    │  │  permanente de   │  │  Recordatorios   │  │  Xero · MYOB · Shopify   │
  │  referencia      │  │  documentos      │  │  Escalada        │  │  ACL externo             │
  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────────────┘
```

---

## Matriz de responsabilidades por Revenue Source

La matriz demuestra que solo el origen del ingreso cambia. Todo el núcleo financiero permanece idéntico.

### Shift Work

```
Google Calendar / Manual Entry
  ↓ CalendarEventImported
CALENDAR DOMAIN
  ↓
SHIFT WORK DOMAIN (Work)
  Contract + Rate + WorkEvent
  Flow Policies: BillingPeriod, CutOff, Rate Snapshot, WorkEvent Validation
  ↓ WorkEventConfirmed (con RateResult)
REVENUE DOMAIN
  RevenueLine + RevenueDraft + BillingPeriod
  ↓ BillingPeriodClosed
BILLING DOMAIN
  Invoice + InvoiceItem + Payment
  Financial Policies: Payment Terms, Due Date, Reminders, Overdue, Collection
  ↓ InvoiceSent
FINANCIAL ENGINE
  FinancialTransaction: INVOICE_ISSUED
  ↓
ACCOUNTING ENGINE
  JournalEntry: DR Accounts Receivable / CR Revenue / CR GST
  ↓
ANALYTICS → DOCUMENT PLATFORM → COMMUNICATIONS → CUSTOMER
```

---

### Services (futuro)

```
Customer booking / Internal scheduling
  ↓ (via Calendar: AppointmentScheduled)
CALENDAR DOMAIN
  ↓
SERVICES DOMAIN
  ServiceCatalog + ServiceOrder + ServiceDelivery
  Flow Policies: Service Delivery Confirmation, Service Period, Approval Rules
  ↓ ServiceDeliveryConfirmed (con monto calculado)
REVENUE DOMAIN                         ← misma infraestructura
  RevenueLine + RevenueDraft + BillingPeriod
  ↓ BillingPeriodClosed
BILLING DOMAIN                         ← misma infraestructura
  Invoice + InvoiceItem + Payment
  Financial Policies: (idénticas)
  ↓ InvoiceSent
FINANCIAL ENGINE                       ← sin cambios
ACCOUNTING ENGINE                      ← sin cambios
ANALYTICS → DOCUMENT PLATFORM → COMMUNICATIONS → CUSTOMER
```

---

### Products (futuro)

```
Customer order (online, manual, or import)
PRODUCTS DOMAIN
  ProductCatalog + ProductOrder + OrderItem + Inventory
  Flow Policies: Order Fulfillment, Stock Verification, Pricing Rules
  ↓ OrderFulfilled (con monto por ítem)
REVENUE DOMAIN                         ← misma infraestructura
  RevenueLine + RevenueDraft
  (BillingPeriod puede ser: per order, daily, weekly)
  ↓ BillingPeriodClosed
BILLING DOMAIN                         ← misma infraestructura
  Invoice + InvoiceItem + Payment
  Financial Policies: (idénticas)
  ↓ InvoiceSent
FINANCIAL ENGINE                       ← sin cambios
ACCOUNTING ENGINE                      ← sin cambios
ANALYTICS → DOCUMENT PLATFORM → COMMUNICATIONS → CUSTOMER
```

---

### Subscriptions (futuro)

```
CALENDAR DOMAIN
  ScheduledEvent: subscription_renewal en 3 días
  ↓ ScheduledEventDue
SUBSCRIPTIONS DOMAIN
  SubscriptionPlan + SubscriptionPeriod + Renewal
  Flow Policies: Renewal Cycle, Trial Periods, Upgrade/Downgrade Rules
  ↓ SubscriptionRenewed (con monto del período)
REVENUE DOMAIN                         ← misma infraestructura
  RevenueLine + RevenueDraft
  (BillingPeriod = período de suscripción)
  ↓ BillingPeriodClosed
BILLING DOMAIN                         ← misma infraestructura
  Invoice + InvoiceItem + Payment
  Financial Policies: (idénticas)
  ↓ InvoiceSent
FINANCIAL ENGINE                       ← sin cambios
ACCOUNTING ENGINE                      ← sin cambios
ANALYTICS → DOCUMENT PLATFORM → COMMUNICATIONS → CUSTOMER
```

---

## Tabla comparativa de Revenue Sources

| Concepto | Shift Work | Services | Products | Subscriptions |
|---|---|---|---|---|
| **Billable Unit** | WorkEvent | ServiceDelivery | OrderItem | SubscriptionPeriod |
| **Source Configuration** | Contract + Rate | ServicePackage | ProductCatalog | SubscriptionPlan |
| **Calendar usage** | Import shifts | Book appointments | Ship scheduling | Renewal scheduling |
| **Flow Policies** | Shift-specific | Service-specific | Order-specific | Subscription-specific |
| **Revenue Domain** | ✅ Mismo | ✅ Mismo | ✅ Mismo | ✅ Mismo |
| **Billing Domain** | ✅ Mismo | ✅ Mismo | ✅ Mismo | ✅ Mismo |
| **Financial Engine** | ✅ Mismo | ✅ Mismo | ✅ Mismo | ✅ Mismo |
| **Accounting Engine** | ✅ Mismo | ✅ Mismo | ✅ Mismo | ✅ Mismo |
| **Analytics** | ✅ Mismo | ✅ Mismo | ✅ Mismo | ✅ Mismo |
| **Document Platform** | ✅ Mismo | ✅ Mismo | ✅ Mismo | ✅ Mismo |
| **Communications** | ✅ Mismo | ✅ Mismo | ✅ Mismo | ✅ Mismo |

**Conclusión:** Agregar un nuevo Revenue Source requiere construir el dominio upstream. El núcleo financiero (Revenue, Billing, Financial, Accounting) no cambia.

---

## Configuración del Business por nivel

### Configuración Global del Business

Aplica a todos los Revenue Sources del Business:

```
BusinessConfiguration {
  // Identidad
  businessName, abn, address, logo
  currency, timezone, locale
  
  // Fiscal
  gstRegistered, gstRate, fiscalYearStart, jurisdiction
  defaultPaymentTerms      ← Financial Policy
  bankAccount              ← para datos de pago en Invoices
  
  // Document Platform
  defaultDocumentVariant   ← Classic, Modern, Minimal
  defaultLocale            ← para generación de PDFs
  defaultFormat            ← A4, Letter
  
  // Communications
  communicationConnection  ← token de la plataforma de comunicaciones
  smtpSettings (opcional)
}
```

### Configuración de Flow del Shift Work

Específica del Revenue Source Shift Work:

```
ShiftWorkConfiguration {
  billingCycle           ← WEEKLY, FORTNIGHTLY, MONTHLY, MANUAL
  cutOffDay              ← día de corte para ciclos semanales
  cutOffTime             ← hora de corte
  weekStartDay           ← MONDAY o SUNDAY
  autoClosePeriod        ← ¿cerrar automáticamente al Cut-Off?
  autoGenerateInvoice    ← ¿generar Invoice Draft automáticamente?
  autoApproveInvoice     ← ¿aprobar automáticamente?
  allowPeriodReopening   ← ¿permitir reapertura de períodos?
  lateEventBehavior      ← NEXT_PERIOD | REJECT | NOTIFY_OWNER
}
```

### Configuración Financiera (Financial Policies)

Aplica a todos los Revenue Sources. Define cómo se gestiona una Invoice después de ser enviada:

```
FinancialPoliciesConfiguration {
  defaultPaymentTerms    ← NET_7, NET_14, NET_30, NET_45, IMMEDIATE, CUSTOM
  reminderEnabled        ← boolean
  reminderBeforeDueDays  ← [7, 3] días antes
  reminderAfterDueDays   ← [7, 14, 30] días después
  overdueAutoDetect      ← boolean (job diario)
  collectionThresholdDays ← días después de dueDate para alertar de cobranza
  interestOnLatePayment  ← boolean (futuro)
  interestRate           ← decimal (futuro)
}
```

**Regla de separación:** Si una configuración solo tiene sentido en el contexto de Shift Work (ej. billingCycle semanal), es una **Flow Configuration**. Si tiene sentido para cualquier Invoice (ej. Payment Terms), es una **Financial Configuration**.

---

## Futuro catálogo completo de documentos

La arquitectura de Document Platform soporta todos los tipos de documento que cualquier Revenue Source puede necesitar:

| Documento | Revenue Source | DocumentPackage |
|---|---|---|
| **Invoice** | Shift Work, Services, Products, Projects | `invoice-package` |
| **Statement** | Todos | `statement-package` |
| **Receipt** | Todos | `receipt-package` |
| **BAS (Business Activity Statement)** | Tax / Accounting | `bas-package` |
| **GST Report** | Tax / Accounting | `gst-report-package` |
| **Payroll Summary** | Payroll | `payroll-summary-package` |
| **Payslip** | Payroll | `payslip-package` |
| **Balance Sheet** | Accounting | `balance-sheet-package` |
| **P&L (Income Report)** | Accounting | `pl-report-package` |
| **Forecast** | Analytics | `forecast-package` |
| **Inventory Report** | Products | `inventory-report-package` |
| **Purchase Order** | Products / Procurement | `purchase-order-package` |
| **Quote** | Services, Projects | `quote-package` |
| **Customer Statement** | Billing | `customer-statement-package` |
| **Analytics Report** | Analytics | `analytics-report-package` |

Todos usan el mismo Document Platform. Solo cambia el DocumentPackage, el DocumentContract (qué datasets necesita), y los DocumentBlocks (cómo se presenta).

---

## Documentos relacionados

- `docs/domain/revenue-sources/01-revenue-sources.md` — Concepto de Revenue Sources
- `docs/domain/revenue-sources/02-shift-work-flow-policies.md` — Políticas del flujo Shift Work
- `docs/domain/financial-policies/01-financial-policies.md` — Políticas financieras universales
- `docs/domain/calendar/01-calendar-domain.md` — Calendar como dominio transversal
- `docs/decisions/ADR-009-multi-revenue-source-architecture.md` — Auditoría y decisiones
- `docs/architecture/01-bounded-contexts.md` — Bounded Contexts (requiere actualización en BC-05)
