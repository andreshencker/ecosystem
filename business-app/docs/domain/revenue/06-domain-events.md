# 06 — Domain Events del Ciclo de Ingreso

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este documento es el catálogo completo de Domain Events del ciclo de ingreso. Los eventos están clasificados en tres categorías — Operativos, Financieros, y Analíticos — que definen qué sistemas los consumen y qué garantías tienen.

**Convención de nomenclatura:** `{Entidad}{AcciónEnPasado}` en PascalCase. Los eventos son hechos inmutables — siempre en tiempo pasado.

**Estructura base de todos los eventos:**
```
{
  eventId:      UUID único del evento
  eventType:    nombre del evento
  occurredAt:   timestamp de cuándo ocurrió
  businessId:   discriminador de tenant
  aggregateId:  ID del aggregate root que cambió
  version:      número de versión para evolución del schema
  payload:      datos específicos del evento
}
```

---

## Taxonomía oficial de eventos (5 categorías)

La taxonomía fue expandida de 3 a 5 categorías para separar con precisión las responsabilidades de cada tipo de evento. Un evento puede pertenecer a múltiples categorías simultáneamente.

```
PLATAFORMA [P]
  Pertenecen a: system.* / security.*
  Generados por: servicios de la plataforma (no por el Business)
  Consumidos por: infraestructura de la plataforma
  No tienen businessId de usuario como discriminador primario
  Nunca configurables por el Business Owner
  Ejemplos: system.business_created, security.email_verified

OPERATIVO [O]
  Representan cambios de estado del negocio
  Generados por: servicios de dominio
  Consumidos por: otros dominios que reaccionan al cambio de estado
  Garantía: at-least-once con idempotencia en el consumidor
  Ejemplos: WorkEventConfirmed, BillingPeriodClosed, InvoiceApproved

FINANCIERO [F]
  Representan hechos económicos formales
  Generados por: la combinación de eventos operativos + Recognition Policy
  Consumidos por: Financial Engine (obligatorio) → crea FinancialTransaction → JournalEntry
  Garantía: exactly-once o at-least-once con idempotencia por (referenceId, transactionType)
  Son la base del libro mayor — su pérdida o duplicación es un error crítico
  Ejemplos: InvoiceIssued, PaymentReceived, InvoiceVoided

COMUNICACIÓN [C]
  Involucran al Communications domain (generación de documentos o envío de mensajes)
  Generados por: dominios operativos cuando necesitan materializar una comunicación
  Consumidos por: Communications domain, Document Management, Template Engine
  Garantía: at-least-once (los canales de comunicación son idempotentes o tienen retry)
  Ejemplos: DocumentRequested, InvoiceReadyToSend, ReminderDue

ANALÍTICO [A]
  Solo actualizan métricas, KPIs, y Read Models
  Generados por: casi todos los eventos de las otras categorías
  Consumidos por: Analytics Engine únicamente
  Garantía: at-least-once, pérdida tolerable (Analytics es reconstructible desde eventos)
  Nunca modifican estado operativo
  Ejemplos: InvoiceViewed, RevenueDraftUpdated, cualquier evento que actualiza un KPI
```

### Tabla de clasificación rápida

| Evento | [P] | [O] | [F] | [C] | [A] |
|---|---|---|---|---|---|
| `system.business_created` | ✅ | | | | |
| `WorkEventConfirmed` | | ✅ | | | ✅ |
| `BillingPeriodClosed` | | ✅ | | | ✅ |
| `InvoiceApproved` | | ✅ | | | ✅ |
| `DocumentRequested` | | ✅ | | ✅ | |
| `DocumentGenerated` | | ✅ | | ✅ | |
| `InvoiceReadyToSend` | | ✅ | | ✅ | |
| `InvoiceSent` | | ✅ | ✅ | ✅ | ✅ |
| `InvoiceViewed` | | ✅ | | | ✅ |
| `InvoiceOverdue` | | ✅ | | | ✅ |
| `ReminderSent` | | ✅ | | ✅ | ✅ |
| `PaymentReceived` | | ✅ | ✅ | | ✅ |
| `InvoiceVoided` | | ✅ | ✅ | | ✅ |
| `PaymentReversed` | | ✅ | ✅ | | ✅ |
| `CreditNoteIssued` | | ✅ | ✅ | ✅ | ✅ |
| `WorkEventVoided` | | ✅ | | | ✅ |

---

## EVENTOS DEL DOMINIO WORK

---

### `WorkEventConfirmed`
**Clasificación:** Operativo · Analítico
**Producer:** Work domain (cuando el User confirma el WorkEvent)
**Payload:**
```
{
  workEventId:    ID del WorkEvent
  contractId:     ID del Contract
  customerId:     ID del Customer
  businessId:     ID del Business
  workDate:       fecha de inicio del WorkEvent
  rateResult: {
    totalAmount:  monto total calculado
    currency:     moneda
    lineItems: [
      { description, durationMinutes, unitRate, unit, amount }
    ]
  }
}
```
**Consumers:**
- Revenue domain → crea/actualiza RevenueDraft con una nueva RevenueLine
- Analytics Engine → actualiza Billable Hours, Revenue Pending KPIs

**Idempotencia:** Por `workEventId` — si Revenue ya tiene una RevenueLine para este WorkEvent, la ignora.
**Garantía:** At-least-once. Revenue debe ser idempotente.

---

### `WorkEventVoided`
**Clasificación:** Operativo · Analítico
**Producer:** Work domain
**Payload:** `{ workEventId, contractId, customerId, businessId, voidedAt, voidedBy }`
**Consumers:**
- Revenue domain → elimina la RevenueLine del RevenueDraft si el período sigue OPEN
- Analytics Engine → ajusta KPIs de ingreso pendiente

**Condición especial:** Si el RevenueDraft ya fue TRANSFERRED (Invoice Draft existe), Revenue no puede eliminar la línea. Revenue registra el evento pero no actúa — la corrección debe hacerse via Invoice.Voided en Billing.

---

## EVENTOS DEL DOMINIO REVENUE

---

### `BillingPeriodOpened`
**Clasificación:** Operativo
**Producer:** Revenue domain (al crear el primer BillingPeriod del Contract o al reabrir uno)
**Payload:** `{ billingPeriodId, businessId, contractId, customerId, periodStart, periodEnd, billingCycle }`
**Consumers:**
- Ninguno externo (evento interno de Revenue)

**Idempotencia:** Por `(contractId, periodStart)`.

---

### `RevenueDraftUpdated`
**Clasificación:** Operativo · Analítico
**Producer:** Revenue domain (al agregar o eliminar una RevenueLine)
**Payload:**
```
{
  revenueDraftId: ID del draft
  businessId:     ID del Business
  contractId:     ID del Contract
  customerId:     ID del Customer
  billingPeriodId: ID del período
  totalAmount:    nuevo total del draft
  lineCount:      número de líneas activas
  delta:          el cambio en el total (positivo = agregado, negativo = eliminado)
}
```
**Consumers:**
- Analytics Engine → actualiza Revenue Pending KPI en tiempo real

**Nota:** Este evento se publica con alta frecuencia durante un período activo. Analytics debe ser capaz de procesarlo de forma eficiente.

---

### `BillingPeriodClosed`
**Clasificación:** Operativo · Analítico
**Producer:** Revenue domain (al cerrar automática o manualmente un período)
**Payload:**
```
{
  billingPeriodId: ID del período cerrado
  businessId:      ID del Business
  contractId:      ID del Contract
  customerId:      ID del Customer
  periodStart:     inicio del período
  periodEnd:       fin del período
  revenueDraft: {
    revenueDraftId: ID
    totalAmount:    total final del draft
    currency:       moneda
    lines: [
      {
        workEventId:  ID del WorkEvent
        workEventDate: fecha
        lineItems: [{ description, durationMinutes, unitRate, unit, amount }]
        subtotal:   monto total de la línea
      }
    ]
  }
}
```
**Consumers:**
- Billing domain → crea un Invoice Draft con un InvoiceItem por cada lineItem en cada line
- Analytics Engine → actualiza KPI de velocidad de cierre de períodos

**Garantía:** Este es el evento más crítico del Revenue domain. Billing debe procesarlo exactly-once o con idempotencia perfecta por `billingPeriodId`.
**Idempotencia:** Por `billingPeriodId` — Billing verifica si ya existe un Invoice Draft para este período antes de crear uno nuevo.

---

### `RevenueDraftTransferred`
**Clasificación:** Operativo · Analítico
**Producer:** Revenue domain (confirmación de que Billing tomó el RevenueDraft)
**Payload:** `{ revenueDraftId, billingPeriodId, businessId, contractId, transferredAt }`
**Consumers:**
- Analytics Engine → actualiza estado del ingreso de "pendiente de facturar" a "en proceso de billing"

---

### `BillingPeriodReopened`
**Clasificación:** Operativo · Analítico
**Producer:** Revenue domain (cuando el Business Owner reabre un período CLOSED)
**Payload:** `{ billingPeriodId, businessId, contractId, reopenedBy, reopenedAt, reason }`
**Consumers:**
- Analytics Engine → ajusta KPIs

**Condición:** Solo puede ocurrir si el RevenueDraft está en estado FROZEN (no TRANSFERRED).

---

## EVENTOS DEL DOMINIO BILLING

---

### `InvoiceDraftCreated`
**Clasificación:** Operativo
**Producer:** Billing domain (al recibir `BillingPeriodClosed`)
**Payload:** `{ invoiceId, businessId, customerId, contractId, billingPeriodId, itemCount, draftTotal }`
**Consumers:**
- Revenue domain → confirma que el RevenueDraft fue transferido correctamente

---

### `InvoiceApproved`
**Clasificación:** Operativo · Analítico
**Producer:** Billing domain (Business Owner aprueba el borrador)
**Payload:** `{ invoiceId, businessId, customerId, approvedBy, approvedAt, total, currency }`
**Consumers:**
- Analytics Engine → actualiza estado de la Invoice en el pipeline

---

### `InvoiceSent`
**Clasificación:** Operativo · **Financiero** · Analítico
**Producer:** Billing domain (al enviar la Invoice al Customer)
**Payload:**
```
{
  invoiceId:   ID de la Invoice
  businessId:  ID del Business
  customerId:  ID del Customer
  invoiceNumber: número de factura
  total:       monto total (gross inc. GST)
  netAmount:   monto neto (exc. GST)
  taxAmount:   GST
  currency:    moneda
  issuedAt:    fecha de emisión
  dueAt:       fecha de vencimiento
}
```
**Consumers:**
- **Financial Engine → crea FinancialTransaction tipo `INVOICE_ISSUED`** ← crítico
- Analytics Engine → actualiza AR Balance, Revenue MTD, AR Aging
- Communications domain → envía email al Customer (si configurado)

**Garantía Financiero:** Exactly-once o at-least-once con idempotencia por `(invoiceId, INVOICE_ISSUED)`.

---

### `InvoiceViewed`
**Clasificación:** Analítico
**Producer:** Billing domain (tracking de apertura del email)
**Payload:** `{ invoiceId, businessId, customerId, viewedAt }`
**Consumers:**
- Analytics Engine → Invoice Engagement Rate

---

### `InvoiceOverdue`
**Clasificación:** Operativo · Analítico
**Producer:** Billing domain (job diario que detecta vencimiento)
**Payload:** `{ invoiceId, businessId, customerId, dueAt, daysOverdue, amountDue }`
**Consumers:**
- Analytics Engine → AR Aging overdue buckets, Collections at Risk KPI
- Automation domain → puede disparar un Workflow de recordatorio

---

### `PaymentReceived`
**Clasificación:** Operativo · **Financiero** · Analítico
**Producer:** Billing domain (Business Owner registra el pago)
**Payload:**
```
{
  paymentId:     ID del Payment
  invoiceId:     ID de la Invoice que cancela
  businessId:    ID del Business
  customerId:    ID del Customer
  amount:        monto del pago
  currency:      moneda
  paymentMethod: método de pago
  receivedAt:    fecha del pago
}
```
**Consumers:**
- **Financial Engine → crea FinancialTransaction tipo `PAYMENT_RECEIVED`** ← crítico
- Analytics Engine → AR Balance, Collections Rate, Cash Flow, DSO

**Garantía Financiero:** Exactly-once o at-least-once con idempotencia por `(paymentId, PAYMENT_RECEIVED)`.

---

### `InvoiceVoided`
**Clasificación:** Operativo · **Financiero** · Analítico
**Producer:** Billing domain (Business Owner anula la Invoice)
**Payload:** `{ invoiceId, businessId, customerId, voidedBy, voidedAt, total, netAmount, taxAmount, currency }`
**Consumers:**
- **Financial Engine → crea FinancialTransaction tipo `INVOICE_VOIDED`** ← crítico
- Work domain → revierte los WorkEvents incluidos de `invoiced` a `confirmed`
- Analytics Engine → ajusta Revenue MTD, AR Balance

---

### `InvoiceCancelled`
**Clasificación:** Operativo · Analítico
**Producer:** Billing domain (borrador descartado antes del envío)
**Payload:** `{ invoiceId, businessId, cancelledBy, cancelledAt }`
**Consumers:**
- Analytics Engine → actualiza pipeline de Invoices

**Nota:** No genera FinancialTransaction porque la Invoice nunca fue enviada — no había INVOICE_ISSUED.

---

### `PaymentReversed`
**Clasificación:** Operativo · **Financiero** · Analítico
**Producer:** Billing domain (Business Owner registra la reversión de un pago)
**Payload:** `{ paymentId, reversalId, invoiceId, businessId, amount, currency, reversedAt, reason }`
**Consumers:**
- **Financial Engine → crea FinancialTransaction tipo `PAYMENT_REVERSED`** ← crítico
- Analytics Engine → ajusta AR Balance, Collections Rate

---

### `CreditNoteIssued`
**Clasificación:** Operativo · **Financiero** · Analítico
**Producer:** Billing domain
**Payload:** `{ creditNoteId, invoiceId, businessId, customerId, amount, netAmount, taxAmount, currency, issuedAt }`
**Consumers:**
- **Financial Engine → crea FinancialTransaction tipo `CREDIT_NOTE_ISSUED`** ← crítico
- Analytics Engine → ajusta Revenue, AR Balance

---

## EVENTOS DE COMUNICACIÓN (Document Request — ver `10-document-request.md`)

---

### `DocumentRequested`
**Clasificación:** Operativo · Comunicación
**Producer:** Billing domain (al aprobar la Invoice)
**Payload:** `{ requestId, businessId, documentType: PDF_INVOICE, invoiceId, requestedAt, priority }`
**Consumers:**
- Document Management → genera el PDF y lo almacena en el StorageNamespace del Business

---

### `DocumentGenerated`
**Clasificación:** Operativo · Comunicación
**Producer:** Document Management
**Payload:** `{ documentId, requestId, businessId, invoiceId, documentReference: { storageKey, mimeType, sizeBytes, generatedAt } }`
**Consumers:**
- Billing → adjunta el DocumentReference a la Invoice y avanza a `ready_to_send`

---

### `DocumentGenerationFailed`
**Clasificación:** Operativo
**Producer:** Document Management (si la generación falla después de agotar reintentos)
**Payload:** `{ requestId, businessId, invoiceId, error, failedAt }`
**Consumers:**
- Billing → mantiene la Invoice en `approved` (no avanza) — alerta al Business Owner

---

### `InvoiceReadyToSend`
**Clasificación:** Operativo · Comunicación
**Producer:** Billing (después de adjuntar el DocumentReference)
**Payload:** `{ invoiceId, businessId, customerId, documentId, channel: EMAIL }`
**Consumers:**
- Communications domain → envía la Invoice al Customer por el canal configurado

---

## Resumen: Eventos por clasificación

### Solo Operativos (no generan FT, no actualizan Analytics directamente)
- `BillingPeriodOpened`
- `InvoiceDraftCreated`
- `DocumentGenerationFailed`

### Operativos + Analíticos
- `WorkEventVoided`
- `RevenueDraftUpdated`
- `BillingPeriodClosed`
- `RevenueDraftTransferred`
- `BillingPeriodReopened`
- `InvoiceApproved`
- `InvoiceOverdue`
- `InvoiceCancelled`

### Solo Analíticos
- `InvoiceViewed`
- `ReminderSent` (generado por Communications)

### Operativos + Financieros + Analíticos (los hechos económicos)
- `InvoiceSent` → FT: INVOICE_ISSUED
- `PaymentReceived` → FT: PAYMENT_RECEIVED
- `InvoiceVoided` → FT: INVOICE_VOIDED
- `PaymentReversed` → FT: PAYMENT_REVERSED
- `CreditNoteIssued` → FT: CREDIT_NOTE_ISSUED

### Operativos + Analíticos (con impacto en Work domain también)
- `WorkEventConfirmed` → Revenue + Analytics
- `InvoiceVoided` → Work + Financial + Analytics

---

## Garantías por tipo de evento

| Tipo | Garantía de entrega | Idempotencia requerida |
|---|---|---|
| Eventos Operativos | At-least-once | Sí — el consumidor verifica existencia previa |
| **Eventos Financieros** | **Exactly-once (o at-least-once + idempotencia estricta)** | **Sí — por (referenceId, transactionType) — BR-FIN-005** |
| Eventos Analíticos | At-least-once, pérdida tolerable | Recomendada — Analytics puede reconstruirse desde la fuente |
