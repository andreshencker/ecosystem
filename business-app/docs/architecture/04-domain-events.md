# 04 — Domain Events Catalog

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Los Domain Events son hechos del dominio que ya ocurrieron. Son inmutables. Se nombran en tiempo pasado. Son el único mecanismo de comunicación entre Bounded Contexts.

**Convención:** `{Aggregate}{Hecho}` — ej. `InvoiceSent`, no `SendInvoice`.

**Garantías comunes a todos los eventos:**
- Son publicados después de que la transacción de la operación fue confirmada.
- Son inmutables — el evento describe lo que ocurrió, no lo que debería ocurrir.
- El ID del evento es único globalmente (UUID).
- La idempotencia es responsabilidad del consumidor — el mismo evento puede entregarse más de una vez.

---

## Estructura base de todos los eventos

```
{
  eventId:       UUID          — identificador único del evento
  eventType:     string        — nombre del evento
  occurredAt:    DateTime      — cuándo ocurrió el hecho
  businessId:    ObjectId      — tenant scope (todos los eventos de negocio)
  aggregateId:   ObjectId      — ID del Aggregate Root que cambió
  aggregateType: string        — tipo del aggregate
  version:       number        — versión del schema del evento (para evolución)
  payload:       object        — datos específicos del evento
}
```

---

## IDENTITY — Domain Events

---

### `UserRegistered`

**Productor:** Identity (al completar el registro de un nuevo Business Owner)
**Payload conceptual:** `{ userId, email, firstName, lastName, role: 'business_owner' }`
**Responsabilidad:** Notificar que hay un nuevo usuario propietario en el sistema.
**Consumidores:**
- Business: crea el Business y lo asocia al usuario
- Communication: dispara el envío del email de verificación

**Idempotencia:** El consumidor Business verifica si ya existe un Business para ese userId antes de crear uno nuevo.

---

### `EmailVerified`

**Productor:** Identity (cuando el usuario confirma su email)
**Payload conceptual:** `{ userId, email, verifiedAt }`
**Responsabilidad:** Desbloquear el acceso completo al sistema.
**Consumidores:** Ninguno en v1 (el login ya funciona desde este punto).

---

### `UserInvited`

**Productor:** Identity
**Payload conceptual:** `{ invitationId, businessId, email, role, invitedByUserId, expiresAt }`
**Consumidores:**
- Communication: envía el email de invitación

---

### `UserActivated`

**Productor:** Identity (cuando el usuario invitado completa el primer login)
**Payload conceptual:** `{ userId, businessId, role, activatedAt }`
**Consumidores:**
- Communication: envía el email de bienvenida

---

### `UserDeactivated`

**Productor:** Identity
**Payload conceptual:** `{ userId, businessId, deactivatedByUserId }`
**Consumidores:**
- Calendar: desactiva las CalendarIntegrations del usuario

---

### `PasswordResetRequested`

**Productor:** Identity
**Payload conceptual:** `{ userId, email, resetUrl, expiresAt }`
**Consumidores:**
- Communication: envía el email de recuperación

---

### `PasswordChanged`

**Productor:** Identity
**Payload conceptual:** `{ userId, businessId, changedAt }`
**Consumidores:**
- Communication: envía confirmación de cambio de contraseña

---

## BUSINESS — Domain Events

---

### `BusinessCreated`

**Productor:** Business (al procesar `UserRegistered`)
**Payload conceptual:** `{ businessId, businessKey, businessName, ownerUserId, jurisdiction, currency }`
**Responsabilidad:** Señalar que un nuevo tenant existe en la plataforma.
**Consumidores:**
- Accounting: crea el Chart of Accounts por defecto para la jurisdicción
- Financial: configura las Posting Rules estándar para el Business
- Analytics: inicializa los Read Models del nuevo tenant

**Garantía:** Este evento se publica solo después de que el Business está persistido.

---

### `FiscalProfileConfigured`

**Productor:** Business (cuando el Business Owner configura su perfil fiscal por primera vez)
**Payload conceptual:** `{ businessId, hasAbn, gstRegistered, hasBankAccount, jurisdiction }`
**Consumidores:**
- Billing: ahora puede generar Invoices con datos completos del emisor
- Accounting: actualiza la política contable según el perfil fiscal

---

### `BusinessProfileUpdated`

**Productor:** Business
**Payload conceptual:** `{ businessId, changedFields: string[] }`
**Consumidores:** Analytics (actualiza proyecciones)

---

## CUSTOMER — Domain Events

---

### `CustomerCreated`

**Productor:** Customer
**Payload conceptual:** `{ customerId, businessId, name, type, email }`
**Consumidores:** Analytics

---

### `CustomerDeactivated`

**Productor:** Customer
**Payload conceptual:** `{ customerId, businessId, deactivatedAt }`
**Consumidores:**
- Work: previene nuevos Contracts con ese Customer

---

### `ContactAdded`

**Productor:** Customer
**Payload conceptual:** `{ contactId, customerId, businessId, name, email, isPrimary }`
**Consumidores:** Analytics

---

## WORK — Domain Events

---

### `ContractCreated`

**Productor:** Work
**Payload conceptual:** `{ contractId, businessId, customerId, title, billingCycle, startDate }`
**Consumidores:** Analytics

---

### `ContractActivated`

**Productor:** Work
**Payload conceptual:** `{ contractId, businessId, customerId, activatedAt }`
**Responsabilidad:** Señalar que el contrato está operativo y puede recibir WorkEvents.
**Consumidores:** Analytics

---

### `ContractCompleted`

**Productor:** Work
**Payload conceptual:** `{ contractId, businessId, completedAt }`
**Consumidores:** Analytics

---

### `RateAdded`

**Productor:** Work
**Payload conceptual:** `{ rateId, contractId, businessId, name, type, amount, currency, isDefault }`
**Consumidores:** Analytics

---

### `WorkEventCreated`

**Productor:** Work
**Payload conceptual:** `{ workEventId, businessId, userId, customerId, contractId, date, durationMinutes, status: 'draft' }`
**Consumidores:** Analytics

---

### `WorkEventImported`

**Productor:** Work (al procesar `CalendarEventImported`)
**Payload conceptual:** `{ workEventId, businessId, calendarIntegrationId, calendarEventId, date }`
**Consumidores:** Analytics

---

### `WorkEventConfirmed`

**Productor:** Work
**Payload conceptual:** `{ workEventId, businessId, userId, customerId, contractId, rateId, date, durationMinutes, calculatedAmount, currency }`
**Responsabilidad:** Señalar que este WorkEvent está listo para facturar.
**Consumidores:**
- Billing: el WorkEvent está disponible para incluir en una Invoice
- Analytics: actualiza proyecciones de ingresos

**Garantía:** El WorkEvent ya fue validado (horas, tarifa, cálculo) antes de publicar este evento.

---

### `WorkEventVoided`

**Productor:** Work
**Payload conceptual:** `{ workEventId, businessId, voidedAt, reason }`
**Consumidores:** Analytics

---

### `WorkEventInvoiced`

**Productor:** Work (al procesar `InvoiceItemCreated` de Billing)
**Payload conceptual:** `{ workEventId, invoiceItemId, invoiceId, businessId }`
**Responsabilidad:** Registrar que el WorkEvent fue facturado. Cambia su estado a `invoiced`.
**Consumidores:** Analytics

---

## CALENDAR — Domain Events

---

### `CalendarIntegrationConnected`

**Productor:** Calendar
**Payload conceptual:** `{ calendarIntegrationId, businessId, userId, provider, calendarName }`
**Consumidores:** Analytics

---

### `CalendarSynced`

**Productor:** Calendar
**Payload conceptual:** `{ calendarIntegrationId, businessId, syncedAt, imported, skipped, errors }`
**Consumidores:** Analytics

---

### `CalendarEventImported`

**Productor:** Calendar
**Payload conceptual:** `{ calendarIntegrationId, businessId, calendarEventId, title, date, startTime, endTime }`
**Responsabilidad:** Señalar que hay un nuevo evento de calendario que debe convertirse en WorkEvent draft.
**Consumidores:**
- Work: crea un WorkEvent en estado `draft` con los datos del evento

**Idempotencia:** Work verifica el `calendarEventId` antes de crear el WorkEvent para evitar duplicados.

---

### `CalendarSyncFailed`

**Productor:** Calendar
**Payload conceptual:** `{ calendarIntegrationId, businessId, error, failedAt }`
**Consumidores:**
- Communication (futuro): notifica al usuario que la integración necesita reconexión

---

## BILLING — Domain Events

---

### `InvoiceGenerated`

**Productor:** Billing
**Payload conceptual:** `{ invoiceId, businessId, customerId, contractId, invoiceNumber, issueDate, dueDate, subtotal, taxAmount, total, currency, workEventIds[] }`
**Responsabilidad:** Señalar que existe una nueva Invoice en estado draft.
**Consumidores:** Analytics

---

### `InvoiceSent`

**Productor:** Billing
**Payload conceptual:** `{ invoiceId, businessId, customerId, customerName, invoiceNumber, issueDate, dueDate, subtotal, taxAmount, total, currency, recipientEmail, jurisdiction }`
**Responsabilidad:** El hecho financiero y comunicacional más importante del Billing context.
**Consumidores:**
- Financial: crea FinancialTransaction de tipo `INVOICE_ISSUED`
- Communication: envía el email de factura al Customer
- Analytics: actualiza ingresos proyectados

**Garantía:** El payload contiene toda la información necesaria para crear la FinancialTransaction sin consultar la Invoice original.

---

### `InvoiceViewed`

**Productor:** Billing (tracking de apertura — fase futura)
**Payload conceptual:** `{ invoiceId, businessId, viewedAt }`
**Consumidores:** Analytics

---

### `InvoiceOverdue`

**Productor:** Billing (job diario)
**Payload conceptual:** `{ invoiceId, businessId, customerId, total, amountDue, dueDate, daysPastDue }`
**Consumidores:**
- Communication: envía recordatorio al Customer
- Analytics: actualiza métricas de cobranza

---

### `InvoicePaid`

**Productor:** Billing (cuando amountPaid >= total)
**Payload conceptual:** `{ invoiceId, businessId, total, paidAt }`
**Consumidores:**
- Communication: envía confirmación de pago (futuro)
- Analytics

---

### `InvoiceVoided`

**Productor:** Billing
**Payload conceptual:** `{ invoiceId, businessId, workEventIds[], voidedAt, reason }`
**Consumidores:**
- Work: revierte los WorkEvents incluidos de `invoiced` a `confirmed`
- Financial: crea FinancialTransaction de tipo `INVOICE_VOIDED`
- Analytics

---

### `InvoiceCancelled`

**Productor:** Billing
**Payload conceptual:** `{ invoiceId, businessId, cancelledAt }`
**Consumidores:** Financial, Analytics

---

### `PaymentRecorded`

**Productor:** Billing
**Payload conceptual:** `{ paymentId, invoiceId, businessId, customerId, amount, currency, date, method, jurisdiction }`
**Responsabilidad:** Señalar que se recibió dinero.
**Consumidores:**
- Financial: crea FinancialTransaction de tipo `PAYMENT_RECEIVED`
- Analytics: actualiza métricas de cobro efectivo

---

### `PaymentReversed`

**Productor:** Billing
**Payload conceptual:** `{ paymentId, invoiceId, businessId, amount, reversedAt }`
**Consumidores:**
- Financial: crea FinancialTransaction de tipo `PAYMENT_REVERSED`
- Analytics

---

## FINANCIAL — Domain Events

---

### `FinancialTransactionCreated`

**Productor:** Financial (FinancialTransactionFactories)
**Payload conceptual:** `{ transactionId, businessId, type, direction, nature, grossAmount, currency, transactionDate, jurisdiction }`
**Consumidores:**
- Accounting: procesa la transacción y genera JournalEntry

---

### `TransactionPosted`

**Productor:** Financial / Accounting Engine
**Payload conceptual:** `{ transactionId, journalEntryId, businessId, fiscalPeriod, postedAt, type, grossAmount }`
**Consumidores:**
- Analytics: actualiza reportes financieros

---

### `TransactionRejected`

**Productor:** Financial / Accounting Engine
**Payload conceptual:** `{ transactionId, businessId, reason, rejectedAt, details }`
**Consumidores:**
- Platform (alertas operativas para el administrador)

---

## ACCOUNTING — Domain Events

---

### `JournalEntryPosted`

**Productor:** Accounting Engine
**Payload conceptual:** `{ journalEntryId, businessId, fiscalPeriod, totalDebits, totalCredits, postedAt, accountsAffected[] }`
**Consumidores:**
- Analytics: actualiza General Ledger read models

---

### `FiscalPeriodClosed`

**Productor:** Accounting
**Payload conceptual:** `{ periodId, businessId, periodName, startDate, endDate, closedAt }`
**Consumidores:**
- Financial: previene nuevas transacciones en ese período
- Analytics: genera el snapshot del período

---

### `FiscalPeriodLocked`

**Productor:** Accounting
**Payload conceptual:** `{ periodId, businessId, lockedAt, lockedBy }`
**Consumidores:**
- Financial: bloquea definitivamente el período
- Analytics

---

## COMMUNICATION — Domain Events

---

### `CommunicationDelivered`

**Productor:** Communication
**Payload conceptual:** `{ communicationLogId, businessId, eventKey, channel, recipientEmail, deliveredAt }`
**Consumidores:** Analytics

---

### `CommunicationFailed`

**Productor:** Communication
**Payload conceptual:** `{ communicationLogId, businessId, eventKey, error, failedAt }`
**Consumidores:** Analytics (métricas de fallos de comunicación)

---

## Mapa de eventos por flujo principal

```
FLUJO: WorkEvent → Invoice → Payment

WorkEventConfirmed
    ↓ Billing crea InvoiceItems
InvoiceGenerated
    ↓ Business Owner envía
InvoiceSent
    ↓ Financial crea transacción
    ↓ Communication envía email
FinancialTransactionCreated (INVOICE_ISSUED)
    ↓ Accounting procesa
TransactionPosted (JournalEntry: AR/Revenue/GST)
    ↓ Customer paga
PaymentRecorded
    ↓ Financial crea transacción
FinancialTransactionCreated (PAYMENT_RECEIVED)
    ↓ Accounting procesa
TransactionPosted (JournalEntry: Bank/AR)
    ↓ Invoice queda paid
InvoicePaid
```

---

## Tabla resumen de todos los eventos

| Evento | Dominio | Produce FinancialTx |
|---|---|---|
| UserRegistered | Identity | No |
| EmailVerified | Identity | No |
| UserInvited | Identity | No |
| UserActivated | Identity | No |
| BusinessCreated | Business | No |
| FiscalProfileConfigured | Business | No |
| CustomerCreated | Customer | No |
| CustomerDeactivated | Customer | No |
| ContractCreated | Work | No |
| ContractActivated | Work | No |
| WorkEventConfirmed | Work | No |
| WorkEventVoided | Work | No |
| CalendarEventImported | Calendar | No |
| InvoiceGenerated | Billing | No |
| **InvoiceSent** | Billing | **Sí — INVOICE_ISSUED** |
| **InvoiceVoided** | Billing | **Sí — INVOICE_VOIDED** |
| **PaymentRecorded** | Billing | **Sí — PAYMENT_RECEIVED** |
| **PaymentReversed** | Billing | **Sí — PAYMENT_REVERSED** |
| InvoiceOverdue | Billing | No |
| FinancialTransactionCreated | Financial | — (es la transacción) |
| TransactionPosted | Financial/Accounting | — |
| JournalEntryPosted | Accounting | — |
| FiscalPeriodClosed | Accounting | — |
| CommunicationDelivered | Communication | No |
