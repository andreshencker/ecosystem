# 08 — Domain Events

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Los Domain Events representan hechos del dominio que ya ocurrieron. Son inmutables y se nombran en tiempo pasado. Permiten que los Bounded Contexts se comuniquen sin acoplamiento directo.

**Convención de nomenclatura:** `{Entidad}{Acción}` en PascalCase. Ej: `InvoiceSent`, no `SendInvoice`.

**Estructura base de todos los eventos:**
```typescript
type DomainEvent = {
  eventId:     string;    // UUID único del evento
  eventType:   string;    // nombre del evento
  occurredAt:  Date;      // cuándo ocurrió
  businessId:  ObjectId;  // Business que origina el evento
  aggregateId: ObjectId;  // ID del aggregate root que cambió
  payload:     object;    // datos específicos del evento
}
```

---

## Eventos del contexto Identity

---

### `UserRegistered`
**Quién lo dispara:** `AuthService.register()` al crear un nuevo Business Owner con su Business.
**Payload:** `{ userId, businessId, email, businessName }`
**Quién lo consume:**
- `Business Management` → para completar la configuración inicial del Business
- `Communication` → para enviar el email de verificación

---

### `EmailVerified`
**Quién lo dispara:** `AuthService.verifyEmail()` al confirmar el token de verificación.
**Payload:** `{ userId, email }`
**Quién lo consume:**
- `Identity` → habilita el login del usuario

---

### `UserInvited`
**Quién lo dispara:** `UserInvitationsService.sendInvitation()` al crear una invitación.
**Payload:** `{ invitationId, businessId, email, role, invitedByUserId }`
**Quién lo consume:**
- `Communication` → para enviar el email de invitación

---

### `UserActivated`
**Quién lo dispara:** Cuando un usuario invitado completa el primer login y cambia su contraseña.
**Payload:** `{ userId, businessId, role }`
**Quién lo consume:**
- `Communication` → para enviar el mensaje de bienvenida

---

### `UserDeactivated`
**Quién lo dispara:** `UsersController.deactivateUser()` por un Business Admin o Owner.
**Payload:** `{ userId, businessId, deactivatedByUserId }`
**Quién lo consume:**
- `Calendar Integration` → para desactivar sus CalendarIntegrations personales

---

## Eventos del contexto Business Management

---

### `BusinessRegistered`
**Quién lo dispara:** `AuthService.register()` simultáneamente con `UserRegistered`.
**Payload:** `{ businessId, businessKey, businessName, ownerUserId }`
**Quién lo consume:**
- `Business Management` → puede disparar provisioning inicial (comunicaciones, etc.)

---

### `FiscalProfileConfigured`
**Quién lo dispara:** `FiscalProfileService.configure()` cuando el Business Owner completa los datos fiscales por primera vez.
**Payload:** `{ businessId, hasAbn, gstRegistered, hasBankAccount }`
**Quién lo consume:**
- `Billing` → ahora puede generar facturas con datos correctos del emisor

---

### `BusinessSettingsUpdated`
**Quién lo dispara:** `BusinessPortalService.updateOwnBusiness()`.
**Payload:** `{ businessId, changedFields: string[] }`
**Quién lo consume:**
- Ninguno en v1

---

## Eventos del contexto Customer Management

---

### `CustomerCreated`
**Quién lo dispara:** `CustomersService.create()`.
**Payload:** `{ customerId, businessId, name, type }`
**Quién lo consume:**
- `Contract Management` → habilita crear contratos con este Customer

---

### `CustomerDeactivated`
**Quién lo dispara:** `CustomersService.deactivate()`.
**Payload:** `{ customerId, businessId }`
**Quién lo consume:**
- `Contract Management` → previene nuevos Contracts con este Customer

---

## Eventos del contexto Contract Management

---

### `ContractCreated`
**Quién lo dispara:** `ContractsService.create()`.
**Payload:** `{ contractId, businessId, customerId, title, status }`
**Quién lo consume:**
- Ninguno en v1

---

### `ContractActivated`
**Quién lo dispara:** `ContractsService.activate()` (o automáticamente al llegar a `startDate`).
**Payload:** `{ contractId, businessId, customerId }`
**Quién lo consume:**
- `Work Management` → WorkEvents pueden crearse bajo este Contract

---

### `ContractCompleted`
**Quién lo dispara:** `ContractsService.complete()` — acción manual o automática al llegar a `endDate`.
**Payload:** `{ contractId, businessId, completedAt }`
**Quién lo consume:**
- `Work Management` → no se pueden crear nuevos WorkEvents para este Contract

---

### `RateAdded`
**Quién lo dispara:** `RatesService.add()`.
**Payload:** `{ rateId, contractId, businessId, name, type, amount }`
**Quién lo consume:**
- Ninguno en v1

---

## Eventos del contexto Calendar Integration

---

### `CalendarIntegrationConnected`
**Quién lo dispara:** `CalendarIntegrationService.connect()` al validar OAuth exitosamente.
**Payload:** `{ calendarIntegrationId, businessId, userId, provider, calendarId }`
**Quién lo consume:**
- Ninguno — el primer sync se dispara manualmente o por job

---

### `CalendarSynced`
**Quién lo dispara:** `CalendarSyncService.sync()` al completar un ciclo de sincronización.
**Payload:** `{ calendarIntegrationId, businessId, imported, skipped, errors: number }`
**Quién lo consume:**
- Ninguno — solo para observabilidad

---

### `CalendarEventImported`
**Quién lo dispara:** `CalendarSyncService.sync()` por cada evento nuevo encontrado.
**Payload:** `{ workEventId, calendarEventId, businessId, date, startTime, endTime }`
**Quién lo consume:**
- `Work Management` → el WorkEvent ya fue creado en estado draft; este evento confirma la importación

---

### `CalendarSyncFailed`
**Quién lo dispara:** `CalendarSyncService.sync()` cuando el proveedor devuelve error o las credenciales expiran.
**Payload:** `{ calendarIntegrationId, businessId, error: string }`
**Quién lo consume:**
- `Communication` → (futuro) notificar al usuario que su integración de calendario necesita reconexión

---

## Eventos del contexto Work Management

---

### `WorkEventCreated`
**Quién lo dispara:** `WorkEventsService.create()` — creación manual por un usuario.
**Payload:** `{ workEventId, businessId, userId, customerId, contractId, date, status: 'draft' }`
**Quién lo consume:**
- Ninguno en v1

---

### `WorkEventImported`
**Quién lo dispara:** `CalendarSyncService` cuando crea un WorkEvent desde el calendario.
**Payload:** `{ workEventId, businessId, calendarIntegrationId, calendarEventId }`
**Quién lo consume:**
- Ninguno en v1 — el usuario revisa en la UI

---

### `WorkEventConfirmed`
**Quién lo dispara:** `WorkEventsService.confirm()` — el usuario aprueba el WorkEvent.
**Payload:** `{ workEventId, businessId, customerId, contractId, calculatedAmount }`
**Quién lo consume:**
- `Billing` → este WorkEvent está disponible para ser incluido en una Invoice

---

### `WorkEventVoided`
**Quién lo dispara:** `WorkEventsService.void()`.
**Payload:** `{ workEventId, businessId, reason }`
**Quién lo consume:**
- Ninguno

---

### `WorkEventInvoiced`
**Quién lo dispara:** `InvoiceGenerationService` al incluir el WorkEvent en una Invoice.
**Payload:** `{ workEventId, invoiceItemId, invoiceId, businessId }`
**Quién lo consume:**
- Ninguno — el WorkEvent ya está en estado `invoiced` en el aggregate

---

## Eventos del contexto Billing

---

### `InvoiceGenerated`
**Quién lo dispara:** `InvoiceGenerationService.generate()`.
**Payload:** `{ invoiceId, businessId, customerId, invoiceNumber, total, currency, status: 'draft' }`
**Quién lo consume:**
- Ninguno en v1 — el usuario revisa el borrador antes de enviarlo

---

### `InvoiceSent`
**Quién lo dispara:** `InvoicesService.send()` — el Business Owner o Admin envía la Invoice al Customer.
**Payload:** `{ invoiceId, businessId, customerId, invoiceNumber, total, dueDate, recipientEmail }`
**Quién lo consume:**
- `Communication` → enviar el email de factura al Customer (`invoices.invoice_sent`)

---

### `InvoiceViewed`
**Quién lo dispara:** Cuando el Customer abre el link de la factura (tracking pixel o link click). *(Fase futura)*
**Payload:** `{ invoiceId, businessId, viewedAt }`
**Quién lo consume:**
- Ninguno en v1

---

### `InvoiceOverdue`
**Quién lo dispara:** `OverdueInvoiceDetectionService` (job diario).
**Payload:** `{ invoiceId, businessId, customerId, total, amountDue, dueDate }`
**Quién lo consume:**
- `Communication` → enviar recordatorio al Customer (`invoices.invoice_overdue`)

---

### `InvoicePaid`
**Quién lo dispara:** `PaymentAllocationService` cuando `amountPaid >= total`.
**Payload:** `{ invoiceId, businessId, total, paidAt }`
**Quién lo consume:**
- `Communication` → enviar confirmación al Customer (futuro)

---

### `InvoiceVoided`
**Quién lo dispara:** `InvoicesService.void()`.
**Payload:** `{ invoiceId, businessId, voidedAt, reason }`
**Quién lo consume:**
- `Work Management` → los WorkEvents de esa Invoice vuelven a `confirmed`

---

## Eventos del contexto Payments

---

### `PaymentRecorded`
**Quién lo dispara:** `PaymentsService.record()`.
**Payload:** `{ paymentId, businessId, invoiceId, amount, date, method }`
**Quién lo consume:**
- `Billing` → actualizar `amountPaid`, `amountDue` y status de la Invoice

---

### `PaymentReversed`
**Quién lo dispara:** `PaymentsService.reverse()`.
**Payload:** `{ paymentId, businessId, invoiceId, amount, reversedAt }`
**Quién lo consume:**
- `Billing` → restar el monto de `amountPaid` y actualizar status de la Invoice

---

## Eventos del contexto Communication

---

### `CommunicationRequested`
**Quién lo dispara:** `CommunicationDispatchService` antes de llamar a Communications Platform.
**Payload:** `{ businessId, eventKey, channel, recipientEmail, resourceType, resourceId }`
**Quién lo consume:**
- Ninguno — log inmediato en `CommunicationLog`

---

### `CommunicationDelivered`
**Quién lo dispara:** `CommunicationDispatchService` cuando Communications Platform responde con éxito.
**Payload:** `{ communicationLogId, businessId, eventKey, success: true }`
**Quién lo consume:**
- Ninguno en v1

---

### `CommunicationFailed`
**Quién lo dispara:** `CommunicationDispatchService` cuando Communications Platform devuelve error.
**Payload:** `{ communicationLogId, businessId, eventKey, error: string, httpStatus: number }`
**Quién lo consume:**
- Ninguno en v1 — visible en el log

---

## Mapa de consumidores por evento

```
UserRegistered          → Communication (email verificación)
EmailVerified           → (ninguno)
UserInvited             → Communication (email invitación)
UserActivated           → Communication (bienvenida)
CustomerCreated         → (ninguno)
ContractActivated       → Work Management (habilita WorkEvents)
CalendarEventImported   → (WorkEvent ya creado — ninguno)
WorkEventConfirmed      → Billing (disponible para facturar)
InvoiceGenerated        → (ninguno — draft)
InvoiceSent             → Communication (invoices.invoice_sent)
InvoiceOverdue          → Communication (invoices.invoice_overdue)
InvoicePaid             → Communication (futuro)
InvoiceVoided           → Work Management (revertir WorkEvents)
PaymentRecorded         → Billing (actualizar estado Invoice)
PaymentReversed         → Billing (revertir estado Invoice)
```

---

## Estado de implementación

| Contexto | Eventos | Estado |
|---|---|---|
| Identity | `UserRegistered`, `EmailVerified`, `UserInvited`, `UserActivated` | ⚠️ Lógica existe, eventos sin publicar formalmente |
| Business Management | `BusinessRegistered`, `FiscalProfileConfigured` | ⚠️ Parcial |
| Customer Management | `CustomerCreated`, `CustomerDeactivated` | ❌ No implementado |
| Contract Management | `ContractCreated`, `ContractActivated`, `RateAdded` | ❌ No implementado |
| Calendar Integration | `CalendarSynced`, `CalendarEventImported` | ❌ No implementado |
| Work Management | `WorkEventCreated`, `WorkEventConfirmed`, `WorkEventInvoiced` | ❌ No implementado |
| Billing | `InvoiceGenerated`, `InvoiceSent`, `InvoiceOverdue`, `InvoicePaid` | ❌ No implementado |
| Payments | `PaymentRecorded`, `PaymentReversed` | ❌ No implementado |
| Communication | `CommunicationDelivered`, `CommunicationFailed` | ⚠️ Parcial |
