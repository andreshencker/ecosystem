# 01 — Revenue Sources

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial — Principio fundacional del ERP

---

## Principio fundamental

> El ERP NO es un sistema para facturar turnos. El ERP es una plataforma financiera.
> Los turnos son únicamente UNO de los posibles Revenue Sources.

Este principio debe guiar toda decisión de diseño. Cualquier concepto, regla, o restricción que asuma que el ingreso solo puede provenir de turnos de trabajo es una deuda arquitectónica activa.

---

## Qué es un Revenue Source

Un Revenue Source es el **tipo** de actividad económica mediante la cual el Business genera valor facturable. Es una clasificación — responde "¿de dónde viene el ingreso?"

Cada Revenue Source contiene uno o más Revenue Flows — los pipelines concretos que transforman la actividad en ingreso. Un Revenue Source puede tener múltiples Revenue Flows cuando existen variantes de billing distintas para la misma categoría de actividad.

**Revenue Source ≠ Revenue Flow:**
- Revenue Source = "Services" (categoría declarativa — el tipo de actividad)
- Revenue Flow = "HourlyServicesFlow" (pipeline procedimental — cómo fluye al Revenue Domain)

→ Ver `03-revenue-flow.md` para el concepto completo de Revenue Flow.

Cada Revenue Source tiene:
- Uno o más Revenue Flows (el/los pipeline/s que implementa/n)
- Sus propias entidades de dominio (el "billable unit" que origina ingreso)
- Sus propios Domain Events
- Su propio modelo de acumulación de ingreso

Todos los Revenue Sources comparten:
- El mismo Revenue Domain (receptor común del ingreso)
- El mismo Billing Domain (documentos financieros)
- El mismo Financial Engine (transacciones financieras)
- El mismo Accounting Engine (libro mayor)
- El mismo Analytics (inteligencia de negocio)
- El mismo Document Platform (generación de PDFs)
- El mismo Communications (notificaciones y entrega)

---

## El catálogo de Revenue Sources y Revenue Flows

### Implementado — Fase 1

| Revenue Source | Revenue Flow | Billable Unit | Estado |
|---|---|---|---|
| **Shift Work** | ShiftWorkFlow | WorkEvent | ✅ En desarrollo |

### Planificados — Fases futuras

| Revenue Source | Revenue Flow/s | Billable Unit | Estado |
|---|---|---|---|
| **Services** | HourlyServicesFlow · FixedPriceFlow · RetainerFlow | ServiceDelivery / Milestone / RetainerPeriod | Fase futura |
| **Products** | DirectSaleFlow · DropshipFlow | OrderItem | Fase futura |
| **Subscriptions** | RecurringBillingFlow | SubscriptionPeriod | Fase futura |
| **Projects** | MilestoneBillingFlow | Milestone | Fase futura |
| **Rentals** | RentalPeriodFlow | RentalPeriod | Fase futura |
| **Memberships** | MembershipRenewalFlow | MembershipPeriod | Fase futura |
| **Marketplace** | CommissionFlow | CommissionEvent | Fase futura |

Todos los Revenue Flows entregan al Revenue Domain a través del mismo Revenue Flow Contract.

---

## El patrón de Revenue Source

Cada Revenue Source implementa exactamente el mismo patrón de integración con el núcleo financiero:

```
REVENUE SOURCE
  ┌─────────────────────────────────────────┐
  │  Billable Unit ocurre / se confirma     │
  │  (WorkEvent, ServiceDelivery, OrderItem)│
  └─────────────────┬───────────────────────┘
                    │ BillableUnitReady event
                    ▼
  ┌─────────────────────────────────────────┐
  │            REVENUE DOMAIN               │
  │  Acumula → RevenueLine                  │
  │  Agrupa → BillingPeriod                 │
  │  Cierra → BillingPeriodClosed           │
  └─────────────────┬───────────────────────┘
                    │ BillingPeriodClosed event
                    ▼
  ┌─────────────────────────────────────────┐
  │            BILLING DOMAIN               │
  │  Invoice Draft → Approved → Sent        │
  └─────────────────┬───────────────────────┘
                    │ InvoiceSent event
                    ▼
  ┌─────────────────────────────────────────┐
  │      FINANCIAL + ACCOUNTING + ANALYTICS │
  │  (sin conocimiento del Revenue Source)  │
  └─────────────────────────────────────────┘
```

El Revenue Domain, Billing, Financial, Accounting, y Analytics son completamente agnósticos al Revenue Source. Solo conocen RevenueDrafts, Invoices, FinancialTransactions, y JournalEntries.

---

## La neutralidad del núcleo financiero

El valor arquitectónico central del ERP es que el núcleo financiero es inmutable e independiente del origen del ingreso:

```
Shift Work             Services           Products         Subscriptions
    │                     │                  │                  │
    │ WorkEvent           │ ServiceDelivery  │ OrderItem        │ RenewalPeriod
    │ confirmed           │ approved          │ fulfilled        │ started
    ▼                     ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          REVENUE DOMAIN                                  │
│  RevenueLine(description, amount, qty, unitRate, billableSourceRef)      │
│  BillingPeriod (period, status, totalAmount)                            │
│  RevenueDraft (accumulated lines for the period)                        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ BillingPeriodClosed
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BILLING DOMAIN                                  │
│  Invoice, InvoiceItem, Payment                                           │
│  (no conoce si el origen fue un WorkEvent, un OrderItem, o un período)  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ InvoiceSent, PaymentRecorded
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FINANCIAL ENGINE + ACCOUNTING                         │
│  FinancialTransaction, JournalEntry                                      │
│  (absolutamente agnóstico — solo ve tipos: INVOICE_ISSUED, PAYMENT_RECEIVED) │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## La unidad facturable (Billable Unit)

Cada Revenue Source tiene su propia Billable Unit — la entidad que origina una RevenueLine:

| Revenue Source | Billable Unit | Campo clave en RevenueLine |
|---|---|---|
| Shift Work | WorkEvent | `billableSourceRef.workEventId` |
| Services | ServiceDelivery | `billableSourceRef.serviceDeliveryId` |
| Products | OrderItem | `billableSourceRef.orderItemId` |
| Subscriptions | SubscriptionPeriod | `billableSourceRef.subscriptionPeriodId` |
| Projects | Milestone | `billableSourceRef.milestoneId` |

El campo `billableSourceRef` en RevenueLine es polimórfico: contiene el tipo de source y el ID de la entidad origen. Billing nunca necesita leerlo — es solo para trazabilidad y audit.

---

## Separación de políticas

Cada Revenue Source tiene dos tipos de políticas:

### Flow Policies (por Revenue Source)

Las reglas específicas del flujo. No comparten ni contaminan otros flujos.

Ejemplos para Shift Work:
- ¿Cuándo se cierra el período? (Billing Cut-Off)
- ¿Cómo se asigna un WorkEvent a un período? (WorkEvent Assignment Rules)
- ¿Qué pasa con un WorkEvent que llega tarde? (Late Work Events)
- ¿Cuándo se puede reabrir un período? (Period Reopening)
- ¿Cuándo se toma el snapshot de la tarifa? (Rate Snapshot)

→ Ver documento `02-shift-work-flow-policies.md` para el detalle completo.

### Financial Policies (comunes a todos los Revenue Sources)

Las reglas financieras que aplican a cualquier Invoice, sin importar de qué Revenue Source proviene.

Ejemplos:
- ¿Cuántos días tiene el Customer para pagar? (Payment Terms)
- ¿Cuándo se envía el primer recordatorio? (Reminder Policy)
- ¿Qué pasa si la Invoice vence sin pago? (Overdue Policy)
- ¿Cuándo pasa a cobranza? (Collection Policy)

→ Ver documento `docs/domain/financial-policies/01-financial-policies.md`

---

## Extensibilidad: cómo agregar un nuevo Revenue Source

Para agregar un nuevo Revenue Source (ej. Services) en el futuro:

1. Crear el dominio del Revenue Source (ServiceOrder, ServiceDelivery, ServiceCatalog)
2. Definir la Billable Unit (ServiceDelivery)
3. Definir las Flow Policies del Revenue Source (¿cómo y cuándo facturar un servicio?)
4. Publicar el evento `BillableUnitReady` cuando la ServiceDelivery esté aprobada
5. Revenue Domain crea una RevenueLine con el `billableSourceRef.serviceDeliveryId`
6. El resto del pipeline (Billing, Financial, Accounting, Analytics) funciona sin cambios

**Nada en el núcleo financiero cambia.** Solo se agrega el nuevo dominio upstream.

---

## Relación con el dominio Calendar

Calendar es un dominio transversal que sirve a múltiples Revenue Sources:

| Revenue Source | Uso de Calendar |
|---|---|
| Shift Work | Importar shifts desde Google Calendar/iCal/Outlook |
| Services | Booking de citas y entregas de servicio |
| Projects | Scheduling de tareas y milestones |
| Subscriptions | Tracking de fechas de renovación |
| Rentals | Calendarios de disponibilidad y períodos de alquiler |

Calendar nunca conoce la lógica de ningún Revenue Source. Cada Revenue Source consume eventos de Calendar y los interpreta según sus propias reglas.

→ Ver `docs/domain/calendar/01-calendar-domain.md`

---

## Reglas arquitectónicas de Revenue Sources

**RS-001:** Todo Revenue Source debe publicar un evento `BillableUnitReady` (o equivalente según su semántica) cuando el billable unit está confirmado y listo para ingresar al Revenue Domain. El Revenue Domain es el único receptor.

**RS-002:** Un Revenue Source NUNCA interactúa directamente con Billing, Financial, Accounting, o Analytics. Toda interacción pasa por el Revenue Domain.

**RS-003:** Las Flow Policies de un Revenue Source son completamente internas a ese Revenue Source. Billing, Financial, y Accounting no conocen ni aplican Flow Policies de ningún Revenue Source.

**RS-004:** Las Financial Policies son compartidas por todos los Revenue Sources. Un Revenue Source no puede definir sus propias Payment Terms, Reminder Policies, o Collection Policies — esas son responsabilidad del dominio Billing.

**RS-005:** El `billableSourceRef` en RevenueLine es de solo lectura para Billing. Billing nunca consulta la entidad referenciada. Solo la almacena para trazabilidad.

**RS-006:** Agregar un nuevo Revenue Source nunca requiere modificar el Revenue Domain, Billing, Financial, Accounting, ni Analytics. Si una modificación en esos dominios es necesaria para soportar un nuevo Revenue Source, hay un problema de diseño en el Revenue Source.
