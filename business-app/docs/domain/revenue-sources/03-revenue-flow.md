# 03 — Revenue Flow

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial — Concepto arquitectónico de primera clase

---

## Respuesta a la pregunta central

> ¿Revenue Flow debe ser un concepto de primera clase?

**Sí. Y aquí está el por qué exacto.**

---

## 1. Revenue Flow como concepto de primera clase

### Qué problema resuelve

Actualmente el documento `01-revenue-sources.md` define Revenue Source como "el tipo de actividad económica". Contiene implícitamente el pipeline, las políticas, y el Billable Unit — todo mezclado bajo el mismo concepto.

Esto funciona cuando hay un solo flujo por tipo. Pero falla cuando existe más de un pipeline para el mismo Revenue Source.

Ejemplo concreto:

**Revenue Source: Services** puede tener tres Revenue Flows completamente distintos:

| Revenue Flow | Pipeline | Billable Unit |
|---|---|---|
| Hourly Services | Calendar → Appointment → TimeTracked → RevenueLine | HourlyEntry |
| Fixed Price | ServiceOrder → MilestoneCompleted → RevenueLine | Milestone |
| Retainer | ServiceContract → MonthlyPeriod → RevenueLine | RetainerPeriod |

Sin el concepto de Revenue Flow, serían tres Revenue Sources distintos. Con él, son tres Revenue Flows dentro del mismo Revenue Source "Services".

### Qué evita

Evita que agregar una variante de billing a un Revenue Source existente requiera crear un Revenue Source completamente nuevo. Services es un concepto de negocio; "cómo se factura" es un detalle de implementación del pipeline.

### Qué desacopla

Desacopla el **tipo de actividad económica** (Revenue Source) de la **secuencia de pasos que transforma esa actividad en ingreso** (Revenue Flow).

Sin este desacoplamiento, cuando el usuario pregunta "¿cuántas formas de generar ingreso tiene el ERP?", la respuesta mezcla categorías con pipelines.

---

## 2. Revenue Source vs Revenue Flow — análisis definitivo

**No son el mismo concepto.** Son niveles distintos de la jerarquía.

| Dimensión | Revenue Source | Revenue Flow |
|---|---|---|
| **Naturaleza** | Declarativo — "qué tipo de ingreso" | Procedimental — "cómo fluye ese ingreso" |
| **Pregunta que responde** | ¿De dónde viene el ingreso? | ¿Por qué pasos pasa para llegar a Revenue? |
| **Cardinalidad** | N Revenue Sources en la plataforma | N Revenue Flows, ≥1 por Revenue Source |
| **Owned by** | Platform (catálogo) + Business (activa cuáles usa) | Platform (define el pipeline) |
| **Variabilidad** | Estable — la categoría no cambia | Configurable — las políticas varían por Business |
| **Ejemplo** | "Services" | "Hourly Services Flow", "Fixed Price Flow" |

### La relación exacta

```
Revenue Source (1)
    └── Revenue Flow (1..N)
              └── Flow Policies (configurables por Business)
                       └── Billable Unit (el output del flow)
                                └── Revenue Domain (receptor universal)
```

Un Revenue Source contiene al menos un Revenue Flow canónico. Puede contener variantes. Cada variante es un Revenue Flow.

---

## 3. La jerarquía completa correcta

```
PLATFORM
    │
    ├── Revenue Sources Catalog (MDM — tipos de ingreso disponibles)
    │         Shift Work · Services · Products · Subscriptions
    │         Projects · Rentals · Memberships · Marketplace · ...
    │
    └── Revenue Flow Registry (pipelines disponibles por Revenue Source)
              │
              ├── ShiftWork → ShiftWorkFlow (1 canonical flow)
              │
              ├── Services  → HourlyServicesFlow
              │             → FixedPriceFlow
              │             → RetainerFlow
              │
              ├── Products  → DirectSaleFlow
              │             → DropshipFlow
              │
              └── Subscriptions → RecurringBillingFlow

BUSINESS
    │
    └── Enabled Revenue Flows (cuáles usa este Business)
              │
              ├── ShiftWorkFlow [enabled]
              │    └── Flow Policies: { billingCycle: WEEKLY, cutOff: FRI 18:00 }
              │
              └── FixedPriceFlow [enabled, futuro]
                   └── Flow Policies: { approvalRequired: true }

EJECUCIÓN (runtime)
    │
    └── Revenue Flow Instance
              │ Entry → Steps → Validation → Calculation → BillableUnitReady
              ▼
        Revenue Domain (agnóstico)
              │ RevenueLine + RevenueDraft + BillingPeriod
              ▼
        Billing Domain (agnóstico)
              │ Invoice + Payment
              ▼
        Financial Engine → Accounting → Analytics
```

---

## 4. Los cinco Revenue Flows analizados

### Shift Work Flow

```
Entry point:
  ├── CalendarEventImported (desde Google Calendar, iCal, Outlook)
  └── Manual WorkEvent creation (Business Admin)

Pipeline:
  CALENDAR EVENT / MANUAL ENTRY
        ↓
  [Work Domain] WorkEvent (status: draft)
        ↓ Business Admin confirms
  [Work Domain] WorkEvent (status: confirmed)
        ↓ Rate Engine applies
  [Work Domain] RateResult (segments + amounts)
        ↓ Revenue Domain receives
  [Revenue Domain] RevenueLine (description, durationMinutes, unitRate, amount)
        ↓ accumulated in
  [Revenue Domain] RevenueDraft (accumulating)
        ↓ when BillingPeriod closes
  BillingPeriodClosed event → Billing Domain

Flow Policies: BillingPeriod, CutOff, WorkEvent Assignment, Rate Snapshot,
               Late Events, Period Reopening, Shift Validation
Billable Unit: WorkEvent
Rate mechanism: Rate Engine (hourly × rate, overtime, weekend, holiday)
```

✅ Correcto tal como está modelado.

---

### Services Flow (futuro — Hourly variant)

```
Entry point:
  ├── Customer booking (via Calendar slot)
  └── Internal scheduling (Business Admin)

Pipeline:
  CALENDAR SLOT BOOKED / MANUAL SCHEDULE
        ↓
  [Services Domain] Appointment (status: scheduled)
        ↓ Service delivered
  [Services Domain] ServiceDelivery (status: completed)
        ↓ Business Owner / Customer confirms
  [Services Domain] ServiceDelivery (status: approved)
        ↓ Pricing applied (hourly, fixed, package)
  [Services Domain] ServiceAmount calculated
        ↓ Revenue Domain receives
  [Revenue Domain] RevenueLine

Flow Policies: Service Period, Completion Confirmation, Cancellation Policy, No-Show Policy
Billable Unit: ServiceDelivery
Rate mechanism: ServicePricing (rate per hour, per session, per deliverable)
```

✅ El flujo es correcto. El Revenue Domain y Billing no cambian.

---

### Products Flow (futuro)

```
Entry point:
  └── Customer places Sales Order (online, manual, import)

Pipeline:
  SALES ORDER
        ↓ Inventory reserved
  [Products Domain] OrderItem (status: reserved)
        ↓ Picked from warehouse
  [Products Domain] OrderItem (status: picked)
        ↓ Packed for shipment
  [Products Domain] OrderItem (status: packed)
        ↓ Shipped to customer
  [Products Domain] OrderItem (status: shipped)
        ↓ Revenue recognized at shipment (configurable: order date, ship date, delivery date)
  [Revenue Domain] RevenueLine

Flow Policies: Recognition Point (order/ship/delivery), Return Policy,
               Inventory Reservation, Backorder Policy, Discount Rules
Billable Unit: OrderItem (at fulfillment stage defined by Recognition Point)
Rate mechanism: Product Pricing (list price, discount, bundle)

NOTA IMPORTANTE:
El Recognition Point en Products es una Flow Policy, NO una Financial Policy.
"¿Cuándo generar RevenueLine?" pertenece al flow.
"¿Cuándo generar FinancialTransaction?" pertenece a la Financial Recognition Policy
del dominio Financial (Invoice Basis, Cash Basis, Accrual).
Son capas distintas — no confundirlas.
```

✅ El flujo es correcto, con la aclaración del Recognition Point.

---

### Subscription Flow (futuro)

```
Entry point:
  └── Customer subscribes to a plan

Pipeline:
  SUBSCRIPTION ACTIVATED
        ↓ Calendar: ScheduledEvent for renewal date
  [Subscriptions Domain] SubscriptionPeriod (active)
        ↓ Renewal date reached (Calendar trigger)
  [Subscriptions Domain] SubscriptionRenewal (triggered)
        ↓ Payment method validated / billing authorized
  [Subscriptions Domain] RecurringCharge (amount = plan price)
        ↓ Revenue Domain receives
  [Revenue Domain] RevenueLine (fixed amount, period)

Flow Policies: Billing Cycle (monthly/quarterly/annual), Auto-renewal,
               Proration (mid-cycle upgrades), Trial Period, Grace Period,
               Dunning (failed renewal attempt)
Billable Unit: SubscriptionPeriod (el período facturado)
Rate mechanism: SubscriptionPlan (fixed price per period, configurable tiers)

NOTA: Calendar es el trigger del renewal — no el actor.
El Revenue Flow es lo que decide qué hacer cuando Calendar dispara el ScheduledEventDue.
```

✅ El flujo es correcto. Calendar dispara; el Revenue Flow decide.

---

### Projects Flow (futuro)

```
Entry point:
  └── Project created with scope + milestones defined

Pipeline:
  PROJECT ACTIVATED
        ↓ Work begins on milestone
  [Projects Domain] Milestone (status: in_progress)
        ↓ Deliverable submitted
  [Projects Domain] Milestone (status: submitted)
        ↓ Business Owner or Customer approves
  [Projects Domain] Milestone (status: approved)
        ↓ Revenue recognized at milestone approval
  [Revenue Domain] RevenueLine (milestone description, amount)

Flow Policies: Milestone Definition, Approval Process (internal/customer/dual),
               Progress Billing (per milestone, per % completion), Change Order Process
Billable Unit: Milestone (approved)
Rate mechanism: Project Pricing (fixed per milestone, % of project total)
```

✅ El flujo es correcto. La aprobación es la puerta al Revenue Domain.

---

### ¿Los cinco flujos son correctos?

**Sí, y la razón es que todos obedecen el mismo patrón:**

```
Entry Point → [Domain-specific steps] → Approval/Confirmation → BillableUnitReady → Revenue Domain
```

Lo que varía es:
- La naturaleza del Entry Point (calendar, order, subscription trigger)
- Los pasos intermedios (validation, fulfillment, approval)
- La naturaleza de la Billable Unit

Lo que no varía:
- El Revenue Domain como receptor
- La RevenueLine como moneda de cambio
- El pipeline Billing → Financial → Accounting posterior

---

## 5. Flow Policies por Revenue Flow

Las Flow Policies son el conjunto de reglas configurables que gobiernan un Revenue Flow específico. Cada Revenue Flow tiene sus propias Flow Policies — no comparte ni contamina las de otro.

### Shift Work Flow Policies

| Política | Descripción | Configurable |
|---|---|---|
| Billing Period | Ventana de tiempo que agrupa WorkEvents | Tipo: WEEKLY/FORTNIGHTLY/MONTHLY/DAILY/MANUAL |
| Billing CutOff | Momento exacto de cierre del período | Día + hora |
| WorkEvent Assignment | Regla de asignación de WE a período | Por startDate del WorkEvent |
| Late Work Events | Qué hacer con WE que llegan tarde | NEXT_PERIOD / REJECT / NOTIFY |
| Period Reopening | Si se puede reabrir un período cerrado | Booleano |
| Rate Snapshot | Inmutabilidad de la tarifa al confirmar | Siempre inmutable (no configurable) |
| Invoice Generation | Auto o manual al cerrar período | Booleano |
| Invoice Approval | Auto o manual | Booleano |
| Shift Validation | Reglas de validez de un turno | SV-001 a SV-007 (ver `02-shift-work-flow-policies.md`) |

### Services Flow Policies (futuro)

| Política | Descripción |
|---|---|
| Service Period | Cómo se agrupan los deliverables (por mes, por orden, por proyecto) |
| Completion Confirmation | Quién aprueba: Business Owner / Customer / sistema automático |
| No-Show Policy | Qué pasa si el cliente no asiste a la cita |
| Cancellation Policy | Ventana de cancelación y penalización |
| Pricing Type | Hourly / Fixed / Package |

### Products Flow Policies (futuro)

| Política | Descripción |
|---|---|
| Recognition Point | Cuándo se genera RevenueLine: order_date / ship_date / delivery_date |
| Inventory Reservation | Si se reserva stock al orden o al enviar |
| Backorder Policy | Qué hacer si no hay stock: hold / partial-ship / cancel |
| Return Window | Días para devolver el producto |
| Discount Rules | Precios por volumen, códigos de descuento |

### Subscription Flow Policies (futuro)

| Política | Descripción |
|---|---|
| Billing Cycle | Monthly / Quarterly / Annual |
| Auto-renewal | Si la suscripción se renueva automáticamente |
| Proration | Cómo calcular el crédito en upgrades/downgrades mid-cycle |
| Trial Period | Días de prueba gratis antes del primer cobro |
| Grace Period | Días permitidos después de un pago fallido antes de suspender |
| Dunning | Reintentos de cobro: frecuencia, cantidad, notificaciones |

### Projects Flow Policies (futuro)

| Política | Descripción |
|---|---|
| Milestone Approval | Quién aprueba el milestone: Business Owner / Customer / dual |
| Progress Billing | Per milestone / per % completion |
| Change Order | Proceso para aprobar cambios de scope que afectan precio |
| Delivery Acceptance | Si el cliente debe aceptar explícitamente antes de facturar |

---

## 6. Calendar como dominio transversal — confirmación definitiva

Calendar NO es parte de ningún Revenue Flow. Calendar provee infraestructura de tiempo.

```
CALENDAR DOMAIN
  ├── Provee: CalendarEvents (importados de Google/iCal/Outlook)
  ├── Provee: ScheduledEvents (generados internamente por el ERP)
  ├── Provee: Disponibilidad (slots libres/ocupados)
  └── Provee: Recurrencia (eventos periódicos)

CADA REVENUE FLOW INTERPRETA CALENDAR INDEPENDIENTEMENTE:
  Shift Work:      CalendarEvent → WorkEvent (draft)
  Services:        CalendarEvent → Appointment
  Projects:        ScheduledEvent → Task reminder
  Subscriptions:   ScheduledEvent → Renewal trigger
  Billing:         ScheduledEvent → Invoice due date reminder
  Tax:             ScheduledEvent → BAS deadline alert
```

**Calendar no sabe qué Revenue Flow consume sus eventos.** Si mañana aparece "Training" como nuevo Revenue Source, Training escucha CalendarEventImported y crea sus propias entidades. Calendar no cambia.

**La decisión es correcta e irreversible:** Calendar es un dominio transversal. Nunca debe volver a estar ligado a un Revenue Flow específico.

---

## 7. Integración con Revenue Sources

La integración correcta es:

```
Revenue Source (categoría)
    └── Revenue Flow (pipeline concreto)
              └── Entry Points
                    ├── Calendar (transversal — si aplica al flow)
                    ├── External trigger (API, webhook, scheduler)
                    └── Manual entry (Business Admin)
              └── Flow Steps (domain-specific)
              └── Flow Policies (per Business configuration)
              └── Billable Unit (output del flow)
              └── Revenue Flow Contract (interfaz con Revenue Domain)
                    └── Revenue Domain (receptor universal)
```

**¿Tiene sentido poner Revenue Flow entre Revenue Source y Revenue Domain?**

Sí, porque Revenue Flow es el único responsable de:
1. Validar que el Billable Unit cumple el Revenue Flow Contract
2. Empaquetar el Billable Unit como RevenueLine
3. Publicar el evento `BillableUnitReady`

Revenue Domain no valida la semántica del flow. Solo acepta RevenueLine conformes al contrato.

---

## 8. Escalabilidad a nuevos módulos

### Rental (futuro)

```
Entry: RentalAgreement signed
Flow: RentalAgreement → RentalPeriod (active) → RentalPeriod (ended) → RevenueLine
Policies: Rental Duration Types, Deposit Rules, Damage Assessment Window,
          Early Return Policy, Extension Policy
Billable Unit: RentalPeriod
```

¿Requiere cambios en Revenue Domain? ❌ No.
¿Requiere cambios en Billing? ❌ No.
¿Requiere cambios en Accounting? ❌ No.

---

### Marketplace (futuro)

```
Entry: Seller lists product / Buyer places order
Flow: Listing → Order → Fulfillment → CommissionCalculated → RevenueLine
Policies: Commission Rate, Payment Split (seller/platform), Escrow Rules,
          Dispute Window, Payout Schedule
Billable Unit: CommissionEvent (the platform's cut)

NOTA: Marketplace tiene dos Revenue Flows:
  1. CommissionFlow (platform earns commission on each sale)
  2. SellerPayoutFlow (seller receives their share — this is an AP flow, not AR)
```

---

### Manufacturing (futuro)

```
Entry: Customer places Production Order
Flow: ProductionOrder → WorkOrder → ProductionRun → QualityCheck → FinishedGoods → RevenueLine
Policies: Cost Allocation Method, Standard Cost vs Actual Cost,
          Quality Rejection Handling, Batch Tracking
Billable Unit: FinishedGoodsDelivery
```

---

### Training / Courses (futuro)

```
Entry: Student enrolls in course
Flow: Enrollment → Attendance → Completion → CertificateIssued → RevenueLine
Policies: Completion Criteria (%, attendance, assessment), Refund Window,
          Partial Completion Policy, Certificate Issuance Rules
Billable Unit: CourseCompletion
```

---

### ¿La arquitectura realmente soporta esto?

**Sí, por tres razones:**

**Razón 1 — Revenue Flow Contract es la barrera de aislamiento:**
El Revenue Domain solo acepta RevenueLine conforme al Revenue Flow Contract. No importa si el Billable Unit fue un WorkEvent, un FinishedGoodsDelivery, o un CourseCompletion. Revenue Domain los trata igual.

**Razón 2 — Billing no conoce el origen:**
Invoice, InvoiceItem, y Payment son genéricos. Un InvoiceItem puede referenciar un WorkEvent, un OrderItem, o un Milestone — pero Billing nunca lee esa referencia. Solo ve description, quantity, unitRate, amount.

**Razón 3 — Financial Engine es completamente agnóstico:**
FinancialTransaction solo tiene grossAmount, netAmount, taxAmount, type, referenceId. No importa de qué Revenue Flow proviene. INVOICE_ISSUED es INVOICE_ISSUED, venga de Shift Work o de Manufacturing.

---

## 9. Nuevos conceptos que aparecen con Revenue Flow

### RevenueFlowDefinition ✅ Necesario

El blueprint de un Revenue Flow específico. Define:
- Nombre y tipo del Revenue Flow
- Entry points posibles
- Secuencia de pasos requeridos
- Tipo de Billable Unit que produce
- Revenue Flow Contract que debe cumplir

```
RevenueFlowDefinition {
  flowId:           string   — 'shift_work_flow' | 'hourly_services_flow' | ...
  revenueSourceId:  string   — a qué Revenue Source pertenece
  displayName:      string
  billableUnitType: string   — 'work_event' | 'service_delivery' | 'order_item'
  entryPoints:      string[] — ['calendar_event', 'manual']
  steps:            FlowStep[]
  requiredPolicies: string[] — políticas que el Business DEBE configurar para activarlo
  optionalPolicies: string[] — políticas configurables con defaults
  status:           'active' | 'beta' | 'deprecated'
}
```

---

### RevenueFlowContract ✅ Necesario

El contrato formal entre cualquier Revenue Flow y el Revenue Domain. Define exactamente lo que el Revenue Flow debe producir para que el Revenue Domain lo acepte.

```
RevenueFlowContract {
  // Todo Revenue Flow debe entregar una RevenueLine con estos campos:
  requiredFields: {
    description:     string   — descripción legible del Billable Unit
    quantity:        decimal  — cantidad (horas, unidades, períodos, etc.)
    unitRate:        Money?   — precio por unidad (null si es fixed amount)
    amount:          Money    — total calculado (siempre requerido)
    billableSource:  {
      type:     string    — tipo de Billable Unit
      id:       ObjectId  — ID de la entidad origen
    }
  }
  
  // El Revenue Flow garantiza:
  invariants: [
    'amount > 0',
    'billableSource.id references an existing entity in the Flow domain',
    'the Billable Unit is in approved/confirmed status before publishing BillableUnitReady'
  ]
}
```

**Todo Revenue Flow, sin excepción, debe implementar este contrato.** Es la única forma en que el Revenue Domain acepta ingresar una RevenueLine.

---

### RevenueFlowRegistry ✅ Necesario

El catálogo central de todos los Revenue Flows disponibles en la plataforma.

```
RevenueFlowRegistry {
  registeredFlows: RevenueFlowDefinition[]
  
  // Consultas:
  getByRevenueSource(sourceId) → RevenueFlowDefinition[]
  getAll()                     → RevenueFlowDefinition[]
  isActive(flowId)             → boolean
}
```

Este es un dato de MDM (Master Data Management). Solo Platform Admin puede registrar nuevos Revenue Flows.

---

### BusinessRevenueFlowConfig ✅ Necesario

La configuración específica de un Revenue Flow para un Business particular.

```
BusinessRevenueFlowConfig {
  businessId:       ObjectId
  flowId:           string   — referencia a RevenueFlowDefinition
  status:           'active' | 'paused' | 'disabled'
  flowPolicies:     FlowPolicies  — configuración específica del Business
  enabledAt:        DateTime
}
```

---

### RevenueFlowExecution ⚠️ Opcional — para flujos complejos

Un registro de una ejecución específica de un Revenue Flow. Útil para observabilidad, retry, y debugging de flujos multi-paso.

Para flujos simples (Shift Work), no es necesario — el WorkEvent ya actúa como tracking de la ejecución.

Para flujos complejos (Manufacturing, Projects multi-milestone), sería esencial para tracking distribuido.

**Decisión:** No requerir RevenueFlowExecution en v1. Cada Revenue Flow usa sus propias entidades de dominio para tracking. Puede agregarse cuando la complejidad lo requiera.

---

### RevenueFlowType ✅ Ya existe implícitamente

El enum de tipos de Revenue Flow. Vive en MDM como datos de referencia.

```
RevenueFlowTypes (MDM):
  SHIFT_WORK_FLOW
  HOURLY_SERVICES_FLOW
  FIXED_PRICE_SERVICES_FLOW
  RETAINER_FLOW
  DIRECT_SALE_FLOW
  RECURRING_BILLING_FLOW
  MILESTONE_BILLING_FLOW
  RENTAL_PERIOD_FLOW
  COMMISSION_FLOW
  ...
```

---

## 10. Diagrama ASCII definitivo — La plataforma completa

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                               INVOICE APP — FINANCIAL PLATFORM                               ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                         PLATFORM LAYER (MDM + Registry)                                       │
│  Revenue Sources Catalog · Revenue Flow Registry · Document Package Catalog                   │
│  Posting Rules · Chart of Accounts Templates · Tax Rules by Jurisdiction                      │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

                    CALENDAR (TRANSVERSAL)
                    ┌────────────────────────────────────────────────────────────────────────┐
                    │  Google Calendar · Apple · Outlook · iCal · Internal                   │
                    │  CalendarEvent · ScheduledEvent · Availability · Recurrence            │
                    │  Serves ALL Revenue Flows — knows NONE of them                         │
                    └────────────────────────────────────────────────────────────────────────┘
                           │               │              │              │
                           ▼               ▼              ▼              ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              REVENUE SOURCES & REVENUE FLOWS                                    │
│                                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │    SHIFT WORK       │  │     SERVICES         │  │    PRODUCTS     │  │  SUBSCRIPTIONS   │ │
│  │                     │  │                      │  │                 │  │                  │ │
│  │  Revenue Flow:      │  │  Revenue Flow:       │  │  Revenue Flow:  │  │  Revenue Flow:   │ │
│  │  ShiftWorkFlow      │  │  HourlyServicesFlow  │  │  DirectSaleFlow │  │  RecurringFlow   │ │
│  │                     │  │  FixedPriceFlow      │  │  DropshipFlow   │  │                  │ │
│  │  Entry:             │  │  RetainerFlow        │  │                 │  │  Entry:          │ │
│  │  Calendar / Manual  │  │                      │  │  Entry:         │  │  Renewal Date    │ │
│  │                     │  │  Entry:              │  │  SalesOrder     │  │  (Calendar)      │ │
│  │  Steps:             │  │  Calendar Booking    │  │                 │  │                  │ │
│  │  WorkEvent(draft)   │  │  / ServiceOrder      │  │  Steps:         │  │  Steps:          │ │
│  │  → Confirmation     │  │                      │  │  Reservation    │  │  SubscriptionPd  │ │
│  │  → Rate Engine      │  │  Steps:              │  │  → Fulfillment  │  │  → Renewal Auth  │ │
│  │                     │  │  Appointment         │  │  → Shipment     │  │  → RecurringChg  │ │
│  │  Flow Policies:     │  │  → Completion        │  │                 │  │                  │ │
│  │  BillingPeriod      │  │  → Approval          │  │  Flow Policies: │  │  Flow Policies:  │ │
│  │  CutOff             │  │                      │  │  RecognitionPt  │  │  BillingCycle    │ │
│  │  Rate Snapshot      │  │  Flow Policies:      │  │  ReturnWindow   │  │  AutoRenewal     │ │
│  │  Late Events        │  │  Completion Rules    │  │  BackorderPolicy│  │  Proration       │ │
│  │  Validation Rules   │  │  CancellationPolicy  │  │                 │  │  GracePeriod     │ │
│  │                     │  │                      │  │                 │  │  Dunning         │ │
│  │  Billable Unit:     │  │  Billable Unit:      │  │  Billable Unit: │  │                  │ │
│  │  WorkEvent          │  │  ServiceDelivery     │  │  OrderItem      │  │  Billable Unit:  │ │
│  └──────────┬──────────┘  └──────────┬───────────┘  └────────┬────────┘  │  RenewalPeriod  │ │
│             │                        │                        │           └────────┬─────────┘ │
│             │                        │                        │                    │            │
│             └───────────── Revenue Flow Contract ─────────────┴────────────────────┘            │
└───────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                        │ BillableUnitReady
                                        │ { RevenueLine conformant }
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   REVENUE DOMAIN                                               │
│                                                                                                │
│  RevenueLine (description, qty, unitRate, amount, billableSourceRef)                          │
│  RevenueDraft (accumulated lines for the period)                                              │
│  BillingPeriod (period, status, totalAmount)                                                  │
│                                                                                                │
│  AGNÓSTICO al Revenue Flow — solo conoce RevenueLine conformes al contrato                    │
└───────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                        │ BillingPeriodClosed
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BILLING DOMAIN                                               │
│                                                                                                │
│  Invoice · InvoiceItem · Payment                                                              │
│  ◄── Financial Policies aplican aquí: Payment Terms · Due Date · Reminders · Collection ──►  │
│  AGNÓSTICO al Revenue Flow                                                                    │
└────────────────────┬──────────────────────────────────────────────────────┬───────────────────┘
                     │ InvoiceSent                                           │ DocumentRequest
                     ▼                                                       ▼
┌───────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│           FINANCIAL ENGINE            │        │           DOCUMENT PLATFORM                   │
│  FinancialTransaction                 │        │  DocumentPackage · Contract · Block · Template│
│  (INVOICE_ISSUED, PAYMENT_RECEIVED)   │        │  Ephemeral PDF generation                    │
│  Recognition Policy · Posting Rules   │        └──────────────────────┬───────────────────────┘
│  AGNÓSTICO                            │                               │ DocumentRendered (buffer)
└───────────────────┬───────────────────┘                               ▼
                    │ FinancialTransactionCreated             ┌──────────────────────────────────┐
                    ▼                                         │         COMMUNICATIONS            │
┌───────────────────────────────────────┐                    │  Email · SMS · Push               │
│          ACCOUNTING ENGINE            │                    │  Delivers to Customer             │
│  JournalEntry · GeneralLedger         │                    └──────────────────────────────────┘
│  FiscalPeriod · ChartOfAccounts       │
│  Trial Balance · P&L · BAS            │
└───────────────────────────────────────┘

ALL DOMAIN EVENTS from ALL domains flow to:

┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ANALYTICS                                                   │
│  Read Models · KPIs · Datasets · Business Intelligence                                        │
│  Consumes events from ALL domains · NEVER writes to any                                       │
└───────────────────────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════ TRANSVERSAL DOMAINS ════════════════════════════════════════

  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────────────────┐
  │  MASTER DATA  │  │   DOCUMENT    │  │  AUTOMATION   │  │       INTEGRATION HUB             │
  │  (MDM)        │  │  MANAGEMENT   │  │  Workflows    │  │  Google · Banks · ATO · Xero      │
  │  Revenue Flow │  │  Permanent    │  │  Reminders    │  │  ACL for all external systems     │
  │  Registry     │  │  doc storage  │  │  Escalations  │  │                                   │
  │  Catalogs     │  │               │  │               │  │                                   │
  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────────────────────────┘
```

---

## 11. Matriz de responsabilidades definitiva

| Responsabilidad | Calendar | Revenue Flow | Revenue | Billing | Document Platform | Communications | Analytics | Financial | Accounting |
|---|---|---|---|---|---|---|---|---|---|
| Conectar calendarios externos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Proveer CalendarEvents neutros | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestionar ScheduledEvents internos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Interpretar CalendarEvents | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Validar Billable Units | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Calcular valor del Billable Unit | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Aplicar Flow Policies | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Publicar BillableUnitReady | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Acumular RevenueLines | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestionar BillingPeriod | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cerrar BillingPeriod | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear Invoice Draft | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestionar Payment Terms / Due Date | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Enviar recordatorios | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestionar Overdue / Collection | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Solicitar generación de PDF | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Definir DocumentPackage y Templates | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Renderizar PDF (efímero) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Entregar PDF al destinatario | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Enviar emails / notificaciones | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Registrar outcome de comunicación | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Proveer datasets para reportes | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Calcular KPIs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Proyecciones y BI | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Crear FinancialTransactions | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Aplicar Recognition Policy | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Crear JournalEntries | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Mantener General Ledger | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Generar P&L / Balance Sheet / BAS | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Modificar datos de otro dominio | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**La última fila es la más importante.** Ningún dominio modifica datos de otro. Todos se comunican solo a través de eventos.

---

## 12. Revisión de documentos existentes — impacto de Revenue Flow

### Documentos que deben actualizarse

**`01-revenue-sources.md`** — Referencia a Revenue Flow

Actualmente describe Revenue Source como si contuviera el pipeline directamente. Debe actualizarse para:
1. Separar explícitamente "Revenue Source = categoría" de "Revenue Flow = pipeline"
2. Indicar que un Revenue Source puede tener 1..N Revenue Flows
3. Referenciar este documento para el detalle de cada flow

**Cambio mínimo:** Agregar una sección "Relación con Revenue Flow" y actualizar el catálogo para mostrar Revenue Source → Revenue Flow como jerarquía.

---

**`02-shift-work-flow-policies.md`** — Subtítulo y contexto

Actualmente dice "Políticas del flujo Shift Work". Debería decir "Flow Policies del Shift Work Revenue Flow". El contenido es correcto.

---

**`architecture/00-erp-platform-overview.md`** — Diagrama sin Revenue Flow

El diagrama del platform overview no incluye Revenue Flow como capa explícita entre Revenue Sources y Revenue Domain. Debe actualizarse para mostrar Revenue Flow entre Revenue Sources y la capa de Revenue.

---

**`architecture/01-bounded-contexts.md`** — Revenue Flow no es un nuevo Bounded Context

Revenue Flow NO es un bounded context separado. Es un patrón que vive dentro de cada Revenue Source domain. Shift Work domain implementa el Shift Work Revenue Flow. Services domain implementará su Revenue Flow.

El bounded context que se agrega en el Registry es MDM (ya existente).

---

**`decisions/ADR-009-multi-revenue-source-architecture.md`** — Ampliar con Revenue Flow

ADR-009 debe tener una nota que diga: "La distinción Revenue Source / Revenue Flow fue formalizada en ADR-010. Revenue Flow es la capa procedimental que ADR-009 llamaba 'el pipeline' de forma implícita."

---

### Documentos que NO deben modificarse

- `domain/revenue/01-revenue-domain.md` — Revenue Domain sigue siendo correcto. Los cambios propuestos en ADR-009 (INV-REV-003, INV-REV-005) son suficientes.
- `domain/financial-policies/01-financial-policies.md` — Correcto tal como está.
- `domain/calendar/01-calendar-domain.md` — Correcto. Revenue Flow confirma que Calendar es transversal.
- `domain/revenue-sources/02-shift-work-flow-policies.md` — Correcto. Solo actualizar el título para decir "Revenue Flow Policies".

---

## Revenue Flow Contract — la interfaz definitiva

Este es el concepto más importante que emerge de este análisis. Es la única pieza que faltaba para que la arquitectura sea completamente extensible sin modificar el núcleo financiero.

```
Revenue Flow Contract:

Todo Revenue Flow debe garantizar que el Billable Unit que entrega al Revenue Domain:

1. Tiene una descripción legible (description: string)
2. Tiene una cantidad (quantity: decimal > 0)
3. Tiene un monto calculado (amount: Money > 0)
4. Referencia una entidad válida del Revenue Flow domain (billableSourceRef)
5. La entidad referenciada está en estado 'confirmed' o 'approved' (nunca 'draft')
6. Es idempotente: el mismo Billable Unit no puede generar dos RevenueLine

Si el Revenue Flow no puede garantizar estas condiciones,
el Revenue Domain rechaza la RevenueLine con un error de validación de contrato.
```

Este contrato es inmutable. Nunca cambia. No importa cuántos Revenue Flows existan en el futuro — todos implementan este mismo contrato.

**Es el equivalente de `FinancialTransaction` para el núcleo contable — pero para el ingreso upstream.**
